import { ENV } from "./_core/env";

export type BookingConfirmation = {
  calendarUrl: string;
  emailSent: boolean;
};

function parseDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

function calendarStamp(date: string, time: string, offsetHours = 1) {
  const { year, month, day, hour, minute } = parseDateTime(date, time);
  const start = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute));
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const format = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return { start: format(start), end: format(end) };
}

export function googleCalendarUrl(input: { name: string; service: string; date: string; time: string; email: string }) {
  const { start, end } = calendarStamp(input.date, input.time);
  const params = new URLSearchParams({ action: "TEMPLATE", text: `QYLAKI — ${input.service}`, dates: `${start}/${end}`, details: `Discovery call with ${input.name}. Confirmation requested from ${input.email}.`, location: "Online video call" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function sendResendConfirmation(input: { name: string; email: string; service: string; date: string; time: string; calendarUrl: string }) {
  if (!ENV.resendApiKey || !ENV.bookingFromEmail) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: ENV.bookingFromEmail, to: [input.email], subject: "تم استلام طلب مكالمة QYLAKI", html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>مرحباً ${input.name}</h2><p>تم استلام طلب حجز مكالمة مع فريق QYLAKI.</p><p><strong>الخدمة:</strong> ${input.service}<br/><strong>التاريخ:</strong> ${input.date}<br/><strong>الوقت:</strong> ${input.time}</p><p><a href="${input.calendarUrl}">إضافة الموعد إلى Google Calendar</a></p><p>سنرسل رابط الاجتماع النهائي بعد تأكيد الموعد.</p></div>` }) });
  return response.ok;
}

export async function createBookingConfirmation(input: { name: string; email: string; service: string; date: string; time: string }): Promise<BookingConfirmation> {
  const calendarUrl = googleCalendarUrl(input);
  let emailSent = false;
  try { emailSent = await sendResendConfirmation({ ...input, calendarUrl }); } catch (error) { console.warn("[Booking] Confirmation email failed:", error); }
  return { calendarUrl, emailSent };
}
