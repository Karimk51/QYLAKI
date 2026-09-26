export const ENV = {
  appId: process.env.VITE_APP_ID ?? "qylaki-local",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  llmApiUrl: process.env.OPENAI_API_BASE ?? "https://api.openai.com",
  llmApiKey: process.env.OPENAI_API_KEY ?? "",
  llmModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  bookingFromEmail: process.env.BOOKING_FROM_EMAIL ?? "",
  bookingCalendarId: process.env.GOOGLE_CALENDAR_ID ?? "",
};
