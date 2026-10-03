import express from "express";
import path from "path";

const app = express();
const distPath = path.resolve("dist", "public");

app.use(express.static(distPath));
app.use("*", (req, res) => {
  console.log("FALLBACK HIT:", "path=", JSON.stringify(req.path), "originalUrl=", req.originalUrl);
  const url = req.originalUrl.split("?")[0];
  if (url.startsWith("/api/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (url.includes(".")) {
    res.status(404).type("text/plain").end("Not found");
    return;
  }
  res.send("index");
});

app.listen(3944, async () => {
  console.log("up on 3944");
  const r1 = await fetch("http://127.0.0.1:3944/assets/nonexistent-xyz.js");
  console.log("missing asset ->", r1.status, (await r1.text()).slice(0, 40));
  const r2 = await fetch("http://127.0.0.1:3944/work/nexus");
  console.log("spa route ->", r2.status, (await r2.text()).slice(0, 40));
  const r3 = await fetch("http://127.0.0.1:3944/api/whatever");
  console.log("api ->", r3.status, (await r3.text()).slice(0, 40));
  const r4 = await fetch("http://127.0.0.1:3944/assets/index-BWP0H2pq.js");
  console.log("existing asset ->", r4.status, (await r4.text()).slice(0, 30));
  process.exit(0);
});
