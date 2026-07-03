import { Router } from "express";
const router = Router();

function requireAdmin(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) { next(); return; }
  const auth = req.headers["x-admin-password"] ?? req.query.adminPassword;
  if (auth !== adminPass) return res.status(401).json({ error: "Unauthorized" });
  next();
}

const MOCK_SUMMARY = {
  organizations: 415,
  licensedUsers: 12847,
  backupsToday:  3241,
  failedJobs:    12,
  totalStorage:  "48.2 TB",
  activeJobs:    8,
};

router.get("/summary",       requireAdmin, (_req, res) => res.json(MOCK_SUMMARY));
router.get("/organizations", requireAdmin, (_req, res) => res.json({ items: [], total: 415 }));
router.get("/users",         requireAdmin, (_req, res) => res.json({ items: [], total: 12847 }));
router.get("/jobs",          requireAdmin, (_req, res) => res.json({ items: [], total: 3241 }));
router.get("/audit-logs",    requireAdmin, (_req, res) => res.json({ items: [], total: 48200 }));

router.get("/settings", requireAdmin, (_req, res) => {
  res.json({
    appearance: { name: "MailVault Pro", primaryColor: "#0078d4" },
    features:   { aiInsights: true, auditLogs: true, multiTenant: true },
    marketplace: { freeTrial: true, trialDays: 14 },
  });
});

router.post("/settings", requireAdmin, (req, res) => {
  console.log("[admin] Settings updated:", req.body);
  res.json({ ok: true });
});

export default router;
