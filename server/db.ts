import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Booking, ContactSubmission, InsertBooking, InsertContactSubmission, InsertUser, User } from "../drizzle/schema";
import { bookings, contactSubmissions, users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let authSchemaReady: Promise<void> | null = null;
const localUsersFile = process.env.AUTH_DATA_FILE || path.join(process.cwd(), "server", "data", "users.json");

type LocalUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  passwordHash: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

const toUser = (user: LocalUser): User => ({
  ...user,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
  lastSignedIn: new Date(user.lastSignedIn),
});

async function readLocalUsers(): Promise<LocalUser[]> {
  try {
    const value = JSON.parse(await readFile(localUsersFile, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function writeLocalUsers(value: LocalUser[]) {
  await mkdir(path.dirname(localUsersFile), { recursive: true });
  await writeFile(localUsersFile, JSON.stringify(value, null, 2), "utf8");
}

async function ensureAuthSchema(db: ReturnType<typeof drizzle>) {
  // Self-hosted deployments often copy the project without running Drizzle migrations.
  // These idempotent guards make local email/password auth start safely in that case.
  await db.execute(sql`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT NOT NULL,
    openId VARCHAR(64) NOT NULL,
    name TEXT NULL,
    email VARCHAR(320) NULL,
    passwordHash TEXT NULL,
    loginMethod VARCHAR(64) NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_id PRIMARY KEY (id),
    CONSTRAINT users_openId_unique UNIQUE (openId)
  )`);
  try { await db.execute(sql`ALTER TABLE users ADD COLUMN passwordHash TEXT NULL`); } catch (error) {
    // MySQL reports a duplicate-column error when the migration was already applied.
    if (!String(error).toLowerCase().includes("duplicate column") && !String(error).toLowerCase().includes("1060")) throw error;
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      authSchemaReady = ensureAuthSchema(_db).catch(error => {
        console.error("[Database] Auth schema setup failed:", error);
        throw new Error("AUTH_SCHEMA_SETUP_FAILED");
      });
    } catch (error) { console.warn("[Database] MySQL connection failed:", error); _db = null; }
  }
  if (_db && authSchemaReady) await authSchemaReady;
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (db) {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    for (const field of ["name", "email", "loginMethod"] as const) {
      if (user[field] !== undefined) { const value = user[field] ?? null; values[field] = value; updateSet[field] = value; }
    }
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    return;
  }
  const list = await readLocalUsers();
  const item = list.find(entry => entry.openId === user.openId);
  if (item) { item.lastSignedIn = new Date().toISOString(); await writeLocalUsers(list); }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  const db = await getDb();
  if (db) { const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1); return result[0]; }
  const item = (await readLocalUsers()).find(entry => entry.email?.toLowerCase() === normalized);
  return item ? toUser(item) : undefined;
}

export async function createLocalUser(input: { openId: string; name: string; email: string; passwordHash: string }): Promise<User> {
  const normalized = input.email.trim().toLowerCase();
  const db = await getDb();
  if (db) {
    await db.insert(users).values({ ...input, email: normalized, loginMethod: "email", role: "user" });
    const created = await getUserByOpenId(input.openId);
    if (!created) throw new Error("Unable to create user");
    return created;
  }
  const list = await readLocalUsers();
  if (list.some(entry => entry.email?.toLowerCase() === normalized)) throw new Error("EMAIL_ALREADY_EXISTS");
  const now = new Date().toISOString();
  const item: LocalUser = { id: list.reduce((max, entry) => Math.max(max, entry.id), 0) + 1, openId: input.openId, name: input.name.trim(), email: normalized, passwordHash: input.passwordHash, loginMethod: "email", role: "user", createdAt: now, updatedAt: now, lastSignedIn: now };
  list.push(item);
  await writeLocalUsers(list);
  return toUser(item);
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (db) { const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
  const item = (await readLocalUsers()).find(entry => entry.openId === openId);
  return item ? toUser(item) : undefined;
}

export async function createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> { const db = await getDb(); if (!db) throw new Error("DATABASE_REQUIRED_FOR_PROJECT_REQUESTS"); const result = await db.insert(contactSubmissions).values(submission); const id = Number((result as any)[0]?.insertId ?? (result as any).insertId); const created = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1); if (!created[0]) throw new Error("Unable to read created contact submission"); return created[0]; }
export async function getContactSubmissionsByUserId(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(contactSubmissions).where(eq(contactSubmissions.userId, userId)).orderBy(desc(contactSubmissions.createdAt)); }
export async function getAllContactSubmissions() { const db = await getDb(); if (!db) return []; return db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)); }
export async function updateContactSubmission(id: number, status: ContactSubmission["status"], adminNotes?: string | null) { const db = await getDb(); if (!db) throw new Error("DATABASE_REQUIRED_FOR_PROJECT_REQUESTS"); await db.update(contactSubmissions).set({ status, adminNotes: adminNotes ?? null }).where(eq(contactSubmissions.id, id)); }
export async function createBooking(booking: InsertBooking): Promise<Booking> { const db = await getDb(); if (!db) throw new Error("DATABASE_REQUIRED_FOR_BOOKINGS"); const result = await db.insert(bookings).values(booking); const id = Number((result as any)[0]?.insertId ?? (result as any).insertId); const created = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1); if (!created[0]) throw new Error("Unable to read created booking"); return created[0]; }
export async function getBookingBySlot(date: string, time: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(bookings).where(and(eq(bookings.bookingDate, date), eq(bookings.bookingTime, time), eq(bookings.status, "requested"))).limit(1); return result[0]; }
export async function getAllBookings() { const db = await getDb(); if (!db) return []; return db.select().from(bookings).orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime)); }
export async function updateBooking(id: number, status: Booking["status"]) { const db = await getDb(); if (!db) throw new Error("DATABASE_REQUIRED_FOR_BOOKINGS"); await db.update(bookings).set({ status }).where(eq(bookings.id, id)); }
