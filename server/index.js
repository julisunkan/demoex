import express        from "express";
import cors           from "cors";
import path           from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import backupRouter      from "./routes/backup.js";
import restoreRouter     from "./routes/restore.js";
import cleanupRouter     from "./routes/cleanup.js";
import analyticsRouter   from "./routes/analytics.js";
import mailboxRouter     from "./routes/mailbox.js";
import billingRouter     from "./routes/billing.js";
import adminRouter       from "./routes/admin.js";
import settingsRouter    from "./routes/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const HOST = "0.0.0.0";
const app  = express();

// Allow all origins in dev; in production the frontend is same-origin so
// CORS is only needed if a custom FRONTEND_URL is explicitly set.
const CORS_ORIGIN = process.env.NODE_ENV === "production"
  ? (process.env.FRONTEND_URL ?? true)
  : true;

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Request logging
app.use((req, _res, next) => {
  if (req.path !== "/api/health") console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── API routes (must come before static files) ──────────────────────────────
app.use("/api/backup",      backupRouter);
app.use("/api/restore",     restoreRouter);
app.use("/api/cleanup",     cleanupRouter);
app.use("/api/analytics",   analyticsRouter);
app.use("/api/mailbox",     mailboxRouter);
app.use("/api/billing",     billingRouter);
app.use("/api/admin",       adminRouter);
app.use("/api/settings",    settingsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "MailVault Pro API", version: "1.0.0" }));

// Unknown /api/* — return JSON 404 (not the SPA fallback)
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// ── Static frontend (production only) ───────────────────────────────────────
// In production Express serves the Vite-built files so frontend + API run on
// a single port/domain — no need for a separate static site on Render.
const STATIC_DIR = path.resolve(__dirname, "../dist/public");
if (existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));

  // SPA fallback — all non-API GET requests serve index.html so client-side
  // routing (wouter) works on direct URL access or reload.
  app.get("*", (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
} else {
  // Dev: no built files yet — simple health message at root
  app.get("/", (_req, res) => res.send("MailVault Pro API is running. (Run `npm run build` for production.)"));
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
}

// Error handler
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`🛡️  MailVault Pro API → http://localhost:${PORT}`);

  if (process.env.ADMIN_PASSWORD) {
    console.log("✅ Admin password configured — admin portal protected");
  } else {
    console.warn("⚠️  ADMIN_PASSWORD not set. Admin portal is open to anyone. Set it before going to production.");
  }
});
