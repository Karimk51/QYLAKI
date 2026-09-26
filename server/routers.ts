import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createBookingConfirmation } from "./booking-integrations";
import { createBooking, createContactSubmission, createLocalUser, getAllBookings, getAllContactSubmissions, getContactSubmissionsByUserId, getBookingBySlot, getUserByEmail, updateBooking, updateContactSubmission } from "./db";
import { invokeLLM } from "./_core/llm";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/password";
import { ENV } from "./_core/env";

const submissionInput = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(320), projectType: z.string().trim().max(120).optional(), message: z.string().trim().min(1).max(8000), estimateMin: z.number().int().min(0).max(1000000).optional(), estimateMax: z.number().int().min(0).max(1000000).optional(), estimateWeeks: z.number().int().min(1).max(104).optional() });
const bookingInput = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(320), company: z.string().trim().max(180).optional(), service: z.string().trim().min(1).max(120), bookingDate: z.string().trim().min(8).max(20), bookingTime: z.string().trim().min(3).max(20), notes: z.string().trim().max(2000).optional() });
const statusInput = z.object({ id: z.number().int().positive(), status: z.enum(["new", "reviewed", "in_progress", "won", "archived"]), adminNotes: z.string().trim().max(3000).optional() });
const bookingStatusInput = z.object({ id: z.number().int().positive(), status: z.enum(["requested", "confirmed", "completed", "cancelled"]) });
const signupInput = z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(320), password: z.string().min(8).max(128) });
const loginInput = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) });

const ALLOWED_SERVICES = new Set(["discovery", "audit", "product"]);
const ALLOWED_TIMES = new Set(["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"]);
export function validateBookingRequest(input: z.infer<typeof bookingInput>) {
  if (!ALLOWED_SERVICES.has(input.service)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid booking service" });
  if (!ALLOWED_TIMES.has(input.bookingTime)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid booking time" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.bookingDate)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid booking date" });
  const day = new Date(`${input.bookingDate}T${input.bookingTime}:00+01:00`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== input.bookingDate) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid booking date" });
  if (day.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Booking time must be in the future" });
}

const chatInput = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(3000) })).min(1).max(12), language: z.enum(["ar", "en", "fr"]).default("ar") });

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signup: publicProcedure.input(signupInput).mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      if (await getUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
      const user = await createLocalUser({ openId: `local_${nanoid(24)}`, name: input.name, email, passwordHash: await hashPassword(input.password) });
      const token = await sdk.createSessionToken(user.openId, { name: user.name || input.name });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
      return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),
    login: publicProcedure.input(loginInput).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email.toLowerCase());
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      const token = await sdk.createSessionToken(user.openId, { name: user.name || user.email || "QYLAKI user" });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
      return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; })
  }),
  contact: router({ submit: publicProcedure.input(submissionInput).mutation(async ({ input, ctx }) => { const saved = await createContactSubmission({ userId: ctx.user?.id ?? null, name: input.name, email: input.email, projectType: input.projectType || null, message: input.message, estimateMin: input.estimateMin ?? null, estimateMax: input.estimateMax ?? null, estimateWeeks: input.estimateWeeks ?? null, status: "new" }); try { await notifyOwner({ title: `طلب مشروع جديد من ${input.name}`, content: `${input.email}\n${input.projectType || "مشروع عام"}\n${input.message.slice(0, 1000)}` }); } catch (error) { console.warn("[Contact] Notification failed after save:", error); } return { success: true, id: saved.id } as const; }) }),
  bookings: router({ create: publicProcedure.input(bookingInput).mutation(async ({ input, ctx }) => { validateBookingRequest(input); if (await getBookingBySlot(input.bookingDate, input.bookingTime)) throw new TRPCError({ code: "CONFLICT", message: "This requested time is already being reviewed" }); let saved; try { saved = await createBooking({ ...input, userId: ctx.user?.id ?? null, company: input.company || null, notes: input.notes || null, status: "requested" }); } catch (error) { if (String((error as { code?: unknown })?.code || error).includes("ER_DUP_ENTRY") || String(error).toLowerCase().includes("bookings_active_slot_unique")) throw new TRPCError({ code: "CONFLICT", message: "This requested time is already being reviewed" }); throw error; } const confirmation = await createBookingConfirmation({ name: input.name, email: input.email, service: input.service, date: input.bookingDate, time: input.bookingTime }); try { await notifyOwner({ title: `طلب حجز مكالمة من ${input.name}`, content: `${input.email}\n${input.bookingDate} ${input.bookingTime}\n${input.service}\nConfirmation email: ${confirmation.emailSent ? "sent" : "not configured"}` }); } catch (error) { console.warn("[Booking] Notification failed after save:", error); } return { success: true, id: saved.id, ...confirmation } as const; }) }),
  ai: router({ chat: publicProcedure.input(chatInput).mutation(async ({ input }) => { const languageName = input.language === "ar" ? "Arabic" : input.language === "fr" ? "French" : "English"; const result = await invokeLLM({ model: ENV.llmModel, messages: [{ role: "system", content: `You are QYLAKI's small website assistant. Answer in ${languageName}. QYLAKI is a software and digital product studio offering strategy, UX/UI, websites, stores, dashboards, and custom web products. Be concise, warm, professional, and practical. Never invent exact prices; say a discovery or audit path can start from $60 when applicable; larger builds are quoted after understanding the project. If the user wants to start, guide them to the project form or booking page. Do not claim to be human.`, }, ...input.messages] }); const content = result.choices[0]?.message?.content; return { content: typeof content === "string" ? content : "Please use the project form or book a discovery call so we can help." }; }) }),
  dashboard: router({ requests: protectedProcedure.query(({ ctx }) => getContactSubmissionsByUserId(ctx.user.id)) }),
  admin: router({ requests: adminProcedure.query(() => getAllContactSubmissions()), bookings: adminProcedure.query(() => getAllBookings()), updateRequest: adminProcedure.input(statusInput).mutation(async ({ input }) => { await updateContactSubmission(input.id, input.status, input.adminNotes); return { success: true } as const; }), updateBooking: adminProcedure.input(bookingStatusInput).mutation(async ({ input }) => { await updateBooking(input.id, input.status); return { success: true } as const; }) }),
});
export type AppRouter = typeof appRouter;
