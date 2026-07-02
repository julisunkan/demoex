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

app.use(cors({ origin: true }));
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
});
