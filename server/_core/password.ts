import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  if (!encoded?.startsWith("scrypt:")) return false;
  const [, salt, storedHex] = encoded.split(":");
  if (!salt || !storedHex) return false;
  const stored = Buffer.from(storedHex, "hex");
  const derived = (await scrypt(password, salt, stored.length)) as Buffer;
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}
