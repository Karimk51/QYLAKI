// Runtime probe v2 for QYLAKI — verifies the fixes.
process.env.NODE_ENV = "production";
process.env.PORT = "3942";
delete process.env.DATABASE_URL;

await import("./dist/index.js");
await new Promise(r => setTimeout(r, 1500));

const base = "http://127.0.0.1:3942";
async function probe(path, opts) {
  try {
    const res = await fetch(base + path, opts ?? {});
    const text = await res.text();
    return { path, status: res.status, body: text.slice(0, 180) };
  } catch (e) {
    return { path, error: String(e) };
  }
}

const results = [];
// 1. Missing asset must be 404 now, not the SPA html
results.push(await probe("/assets/nonexistent-xyz.js"));
// 2. Unknown API path must be 404 JSON
results.push(await probe("/api/trpc/unknown.proc"));
// 3. SPA route still returns index.html
results.push(await probe("/work/nexus"));
results.push(await probe("/health"));

// 4. Rate limiter: auth.login POST x14 — 13th+ must be 429 (limit 12/min)
const loginBody = JSON.stringify({ json: { email: "x@example.com", password: "wrongpass123" } });
for (let i = 0; i < 14; i++) {
  const res = await fetch(base + "/api/trpc/auth.login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: loginBody,
  });
  if (i >= 11) results.push({ path: `auth.login #${i + 1}`, status: res.status, body: (await res.text()).slice(0, 120) });
}

// 5. Signup POST without DB — graceful error, not a crash
const signupRes = await fetch(base + "/api/trpc/auth.signup", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ json: { name: "Test User", email: "t2@example.com", password: "password123" } }),
});
results.push({ path: "auth.signup", status: signupRes.status, body: (await signupRes.text()).slice(0, 160) });

// 6. Batch request path detection: batched call to auth.me + dashboard.requests
const batchRes = await fetch(base + "/api/trpc/auth.me,dashboard.requests?batch=1", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify([{ json: null }, { json: undefined }]),
});
results.push({ path: "batch auth.me,dashboard.requests", status: batchRes.status, body: (await batchRes.text()).slice(0, 200) });

console.log(JSON.stringify(results, null, 2));
process.exit(0);
