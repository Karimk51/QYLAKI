import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { Booking, ContactSubmission, InsertBooking, InsertContactSubmission, InsertUser, bookings, contactSubmissions, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; } } return _db; }

export async function upsertUser(user: InsertUser): Promise<void> { if (!user.openId) throw new Error("User openId is required for upsert"); const db = await getDb(); if (!db) return; const values: InsertUser = { openId: user.openId }; const updateSet: Record<string, unknown> = {}; for (const field of ["name", "email", "loginMethod"] as const) { if (user[field] !== undefined) { const value = user[field] ?? null; values[field] = value; updateSet[field] = value; } } if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; } if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } if (!values.lastSignedIn) values.lastSignedIn = new Date(); if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date(); await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet }); }
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function createLocalUser(input: { openId: string; name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(users).values({ ...input, email: input.email.toLowerCase(), loginMethod: "email", role: "user" });
  const created = await getUserByOpenId(input.openId);
  if (!created) throw new Error("Unable to create user");
  return created;
}

export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export async function createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(contactSubmissions).values(submission); const id = Number((result as any)[0]?.insertId ?? (result as any).insertId); const created = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1); if (!created[0]) throw new Error("Unable to read created contact submission"); return created[0]; }
export async function getContactSubmissionsByUserId(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(contactSubmissions).where(eq(contactSubmissions.userId, userId)).orderBy(desc(contactSubmissions.createdAt)); }
export async function getAllContactSubmissions() { const db = await getDb(); if (!db) return []; return db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)); }
export async function updateContactSubmission(id: number, status: ContactSubmission["status"], adminNotes?: string | null) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(contactSubmissions).set({ status, adminNotes: adminNotes ?? null }).where(eq(contactSubmissions.id, id)); }
export async function createBooking(booking: InsertBooking): Promise<Booking> { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(bookings).values(booking); const id = Number((result as any)[0]?.insertId ?? (result as any).insertId); const created = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1); if (!created[0]) throw new Error("Unable to read created booking"); return created[0]; }
export async function getBookingBySlot(date: string, time: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(bookings).where(and(eq(bookings.bookingDate, date), eq(bookings.bookingTime, time), eq(bookings.status, "requested"))).limit(1); return result[0]; }
export async function getAllBookings() { const db = await getDb(); if (!db) return []; return db.select().from(bookings).orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime)); }
export async function updateBooking(id: number, status: Booking["status"]) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(bookings).set({ status }).where(eq(bookings.id, id)); }
