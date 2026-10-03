import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  app.use("/api/trpc", (req, res, next) => {
    const now = Date.now(); const ip = req.ip || req.socket.remoteAddress || "unknown";
    // tRPC v11 sends procedure paths in the URL path itself (comma-joined when
    // httpBatchLink batches several calls: /api/trpc/auth.me,dashboard.requests?batch=1),
    // not in the query string. Read them from req.path (mount-relative, so it
    // starts with "/") so auth and AI limits apply.
    const routePaths = (typeof req.path === "string" ? req.path : "")
      .split(",")
      .map(segment => { try { return decodeURIComponent(segment.trim()).replace(/^\/+/, ""); } catch { return segment.trim().replace(/^\/+/, ""); } })
      .filter(segment => segment.length > 0);
    const isAuth = routePaths.some(route => route === "auth.login" || route === "auth.signup");
    const isAi = routePaths.some(route => route === "ai.chat"); const limit = isAuth ? 12 : isAi ? 20 : 60; const key = `${ip}:${isAuth ? "auth" : isAi ? "ai" : "api"}`;
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    else if (bucket.count >= limit) { res.status(429).json({ error: "Too many requests. Please try again shortly." }); return; }
    else bucket.count += 1;
    if (rateBuckets.size > 5000) for (const [entry, value] of Array.from(rateBuckets.entries())) if (value.resetAt <= now) rateBuckets.delete(entry);
    next();
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
