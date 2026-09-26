import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export type SessionPayload = { openId: string; appId: string; name: string };
export type AuthenticatedUser = User;

class LocalSessionService {
  private secretKey() {
    if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for local sessions");
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}) {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    return new SignJWT({ openId, appId: ENV.appId || "qylaki-local", name: options.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
      .sign(this.secretKey());
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.secretKey(), { algorithms: ["HS256"] });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) return null;
      return { openId, appId, name };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    let token = cookies[COOKIE_NAME];
    if (!token && typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7);
    }
    const session = await this.verifySession(token);
    if (!session) throw ForbiddenError("Invalid session cookie");
    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }
}

export const sdk = new LocalSessionService();
