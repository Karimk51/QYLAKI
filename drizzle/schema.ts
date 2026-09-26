import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"), email: varchar("email", { length: 320 }), passwordHash: text("passwordHash"), loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId"), name: varchar("name", { length: 160 }).notNull(), email: varchar("email", { length: 320 }).notNull(), projectType: varchar("projectType", { length: 120 }), message: text("message").notNull(),
  estimateMin: int("estimateMin"), estimateMax: int("estimateMax"), estimateWeeks: int("estimateWeeks"),
  status: mysqlEnum("status", ["new", "reviewed", "in_progress", "won", "archived"]).default("new").notNull(), adminNotes: text("adminNotes"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId"), name: varchar("name", { length: 160 }).notNull(), email: varchar("email", { length: 320 }).notNull(), company: varchar("company", { length: 180 }), service: varchar("service", { length: 120 }).notNull(), bookingDate: varchar("bookingDate", { length: 20 }).notNull(), bookingTime: varchar("bookingTime", { length: 20 }).notNull(), notes: text("notes"), status: mysqlEnum("status", ["requested", "confirmed", "completed", "cancelled"]).default("requested").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect; export type InsertUser = typeof users.$inferInsert;
export type ContactSubmission = typeof contactSubmissions.$inferSelect; export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;
export type Booking = typeof bookings.$inferSelect; export type InsertBooking = typeof bookings.$inferInsert;
