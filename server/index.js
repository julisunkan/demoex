import express from "express";
import cors from "cors";
import adminRouter   from "./routes/admin.js";
import settingsRouter from "./routes/settings.js";
import saasRouter    from "./routes/saas.js";
import emailReportRouter from "./routes/email-report.js";
import ticketsRouter from "./routes/tickets.js";
import { seedDataFiles } from "./lib/seed.js";

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const app  = express();

// In production, restrict CORS to the deployed frontend URL.
// Set FRONTEND_URL in your Render environment variables.
// Falls back to allowing all origins in development.
const CORS_ORIGIN = process.env.NODE_ENV === "production" && process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
  : true;
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/saas",        saasRouter);
app.use("/api/admin",       adminRouter);
app.use("/api/admin",       settingsRouter);
app.use("/api/config",      settingsRouter);
app.use("/api/send-report", emailReportRouter);
app.use("/api/tickets",     ticketsRouter);

app.get("/",           (_req, res) => res.send("Financial Data Analyzer API is running."));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const HOST = "0.0.0.0";

// In production, warn loudly about missing critical env vars.
// The server still starts so Render's health check can pass, but these
// warnings appear immediately in logs so misconfiguration is obvious.
if (process.env.NODE_ENV === "production") {
  const required = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "ADMIN_PASSWORD", "SESSION_SECRET", "FRONTEND_URL"];
  const missing  = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("❌ PRODUCTION MISCONFIGURATION — missing required env vars:");
    missing.forEach((k) => console.error(`   • ${k}`));
    console.error("Set these in Render → financial-data-analyzer-api → Environment.");
  }
}

app.listen(PORT, HOST, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  seedDataFiles();

  const azureReady = !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
  if (azureReady) {
    console.log("✅ Azure credentials configured — SaaS Fulfillment API ready");
  } else {
    console.warn(
      "⚠️  Azure credentials not set. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, " +
      "and AZURE_CLIENT_SECRET to enable Microsoft subscription verification."
    );
  }

  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
    console.warn("⚠️  FRONTEND_URL not set — CORS is open to all origins. Set FRONTEND_URL to your deployed frontend URL.");
  }
});
