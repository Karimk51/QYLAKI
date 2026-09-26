import { ENV } from "./_core/env";

const BOOKING_TIMEZONE = "Africa/Algiers";

export type BookingConfirmation = {
  calendarUrl?: string;
  emailSent: boolean;
};

function parseDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

function calendarStamp(date: string, time: string, offsetHours = 1) {
  // QYLAKI booking policy: all displayed slots are Africa/Algiers (UTC+01:00).
  void BOOKING_TIMEZONE;
  const { year, month, day, hour, minute } = parseDateTime(date, time);
  const start = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const format = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return { start: format(start), end: format(end) };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
}

export function googleCalendarUrl(input: { name: string; service: string; date: string; time: string; email: string }) {
  const { start, end } = calendarStamp(input.date, input.time);
  const params = new URLSearchParams({ action: "TEMPLATE", text: `QYLAKI — ${input.service}`, dates: `${start}/${end}`, details: `Discovery call with ${input.name}. Confirmation requested from ${input.email}.`, location: "Online video call" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function sendResendConfirmation(input: { name: string; email: string; service: string; date: string; time: string; calendarUrl: string }) {
  if (!ENV.resendApiKey || !ENV.bookingFromEmail) return false;
  const name = escapeHtml(input.name); const service = escapeHtml(input.service); const date = escapeHtml(input.date); const time = escapeHtml(input.time); const calendarUrl = escapeHtml(input.calendarUrl);
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: ENV.bookingFromEmail, to: [input.email], subject: "تم استلام طلب مكالمة QYLAKI", html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>مرحباً ${name}</h2><p>تم استلام طلب حجز مكالمة مع فريق QYLAKI.</p><p><strong>الخدمة:</strong> ${service}<br/><strong>التاريخ:</strong> ${date}<br/><strong>الوقت:</strong> ${time}</p><p><a href="${calendarUrl}">إضافة الموعد إلى Google Calendar</a></p><p>هذا طلب بانتظار المراجعة، وسنرسل رابط الاجتماع النهائي بعد تأكيد الموعد.</p></div>` }) });
  return response.ok;
}

export async function createBookingConfirmation(input: { name: string; email: string; service: string; date: string; time: string }): Promise<BookingConfirmation> {
  const calendarUrl = googleCalendarUrl(input);
  let emailSent = false;
  try { emailSent = await sendResendConfirmation({ ...input, calendarUrl }); } catch (error) { console.warn("[Booking] Confirmation email failed:", error); }
  return { calendarUrl, emailSent };
}
