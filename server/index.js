import express from "express";
import cors    from "cors";
import backupRouter      from "./routes/backup.js";
import restoreRouter     from "./routes/restore.js";
import cleanupRouter     from "./routes/cleanup.js";
import analyticsRouter   from "./routes/analytics.js";
import mailboxRouter     from "./routes/mailbox.js";
import marketplaceRouter from "./routes/marketplace.js";
import adminRouter       from "./routes/admin.js";
import settingsRouter    from "./routes/settings.js";

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const HOST = "0.0.0.0";
const app  = express();

const CORS_ORIGIN = process.env.NODE_ENV === "production" && process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
  : true;

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "10mb" }));

// Request logging
app.use((req, _res, next) => {
  if (req.path !== "/api/health") console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/backup",      backupRouter);
app.use("/api/restore",     restoreRouter);
app.use("/api/cleanup",     cleanupRouter);
app.use("/api/analytics",   analyticsRouter);
app.use("/api/mailbox",     mailboxRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/admin",       adminRouter);
app.use("/api/settings",    settingsRouter);

// Health
app.get("/",           (_req, res) => res.send("MailVault Pro API is running."));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "MailVault Pro API", version: "1.0.0" }));

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`🛡️  MailVault Pro API → http://localhost:${PORT}`);

  const azureReady = !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
  if (azureReady) {
    console.log("✅ Azure credentials configured — Microsoft Graph & Marketplace API ready");
  } else {
    console.warn("⚠️  Azure credentials not set (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET). Running in demo mode.");
  }
});
