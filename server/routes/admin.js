import { Router } from "express";
import crypto from "crypto";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

function requireAdmin(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminPass) {
    // In production, refuse access rather than exposing everything.
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Admin portal not configured (ADMIN_PASSWORD missing)" });
    }
    next();
    return;
  }
  const auth = req.headers["x-admin-password"];
  if (auth !== adminPass) return res.status(401).json({ error: "Unauthorized" });
  next();
}

const DEFAULT_SETTINGS = {
  appearance: { name: "MailVault Pro", tagline: "Enterprise email backup & recovery for Microsoft 365.", primaryColor: "#0078d4" },
  payment:    { walletAddress: "", network: "tron" },
  plans:      [
    { id: "monthly",   label: "Pro Monthly",  price: 9.99,  days: 30  },
    { id: "annual",    label: "Pro Annual",   price: 99.99, days: 365 },
    { id: "lifetime",  label: "Lifetime",     price: 149,   days: null },
  ],
  features:   { proEnabled: true },
  notifications: { webhookUrl: "", remindersEnabled: false, reminderDays: 3, email: { enabled: false, to: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", from: "" } },
};

function generateLicenseKey() {
  return `MVP-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
}

router.get("/summary",       requireAdmin, (_req, res) => res.json({ organizations: 0, licensedUsers: 0, backupsToday: 0, failedJobs: 0, totalStorage: "0 GB", activeJobs: 0 }));
router.get("/organizations", requireAdmin, (_req, res) => res.json({ items: [], total: 0 }));
router.get("/users",         requireAdmin, (_req, res) => res.json({ items: [], total: 0 }));
router.get("/jobs",          requireAdmin, (_req, res) => res.json({ items: [], total: 0 }));
router.get("/audit-logs",    requireAdmin, (_req, res) => res.json({ items: [], total: 0 }));

/**
 * Site settings — appearance, USDT payment config, plans, notifications.
 */
router.get("/settings", requireAdmin, async (_req, res) => {
  const settings = await readJson("settings.json", DEFAULT_SETTINGS);
  res.json(settings);
});

router.put("/settings", requireAdmin, async (req, res) => {
  const current = await readJson("settings.json", DEFAULT_SETTINGS);
  const updated = {
    ...current,
    ...req.body,
    appearance:    { ...current.appearance,    ...(req.body?.appearance    ?? {}) },
    payment:       { ...current.payment,       ...(req.body?.payment       ?? {}) },
    features:      { ...current.features,      ...(req.body?.features      ?? {}) },
    notifications: { ...current.notifications, ...(req.body?.notifications ?? {}) },
    plans:         req.body?.plans ?? current.plans,
  };
  await writeJson("settings.json", updated);
  res.json(updated);
});

// Keep POST alias for backwards compatibility.
router.post("/settings", requireAdmin, async (req, res) => {
  const current = await readJson("settings.json", DEFAULT_SETTINGS);
  const updated = { ...current, ...req.body };
  await writeJson("settings.json", updated);
  res.json({ ok: true, settings: updated });
});

/**
 * License key management.
 */
router.get("/licenses", requireAdmin, async (_req, res) => {
  const licenses = await readJson("licenses.json", []);
  res.json({ items: licenses });
});

router.post("/licenses", requireAdmin, async (req, res) => {
  const { planId, days = null, count = 1, email = null, note = null } = req.body ?? {};
  if (!planId) return res.status(400).json({ error: "planId is required" });

  const licenses = await readJson("licenses.json", []);
  const created = [];
  const total = Math.min(Math.max(Number(count) || 1, 1), 100);

  for (let i = 0; i < total; i++) {
    const license = {
      licenseKey: generateLicenseKey(),
      planId,
      expiresAt:  days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null,
      issuedAt:   new Date().toISOString(),
      activatedAt: null,
      revoked:    false,
      email,
      note,
      txHash:     null,
    };
    licenses.push(license);
    created.push(license);
  }

  await writeJson("licenses.json", licenses);
  res.json({ ok: true, items: created });
});

router.patch("/licenses/:key/revoke", requireAdmin, async (req, res) => {
  const licenses = await readJson("licenses.json", []);
  const license = licenses.find((l) => l.licenseKey === req.params.key);
  if (!license) return res.status(404).json({ error: "License not found" });
  license.revoked = true;
  await writeJson("licenses.json", licenses);
  res.json({ ok: true, license });
});

router.patch("/licenses/:key/unrevoke", requireAdmin, async (req, res) => {
  const licenses = await readJson("licenses.json", []);
  const license = licenses.find((l) => l.licenseKey === req.params.key);
  if (!license) return res.status(404).json({ error: "License not found" });
  license.revoked = false;
  await writeJson("licenses.json", licenses);
  res.json({ ok: true, license });
});

router.delete("/licenses/:key", requireAdmin, async (req, res) => {
  const licenses = await readJson("licenses.json", []);
  const next = licenses.filter((l) => l.licenseKey !== req.params.key);
  await writeJson("licenses.json", next);
  res.json({ ok: true });
});

/**
 * USDT payment review queue.
 */
router.get("/payments", requireAdmin, async (_req, res) => {
  const payments = await readJson("payments.json", []);
  res.json({ items: payments.slice().reverse() });
});

router.post("/payments/:id/approve", requireAdmin, async (req, res) => {
  const { days } = req.body ?? {};
  const [payments, licenses, settings] = await Promise.all([
    readJson("payments.json", []),
    readJson("licenses.json", []),
    readJson("settings.json", DEFAULT_SETTINGS),
  ]);
  const payment = payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.status !== "pending") return res.status(400).json({ error: "Payment already processed" });

  const plan = (settings.plans || []).find((p) => p.id === payment.planId);
  const planDays = days !== undefined ? days : plan?.days ?? null;

  const license = {
    licenseKey: generateLicenseKey(),
    planId:     payment.planId,
    expiresAt:  planDays ? new Date(Date.now() + Number(planDays) * 86400000).toISOString() : null,
    issuedAt:   new Date().toISOString(),
    activatedAt: null,
    revoked:    false,
    email:      null,
    note:       `USDT payment ${payment.id}`,
    txHash:     payment.txHash,
  };
  licenses.push(license);

  payment.status     = "approved";
  payment.licenseKey = license.licenseKey;
  payment.approvedAt = new Date().toISOString();

  await Promise.all([writeJson("licenses.json", licenses), writeJson("payments.json", payments)]);
  res.json({ ok: true, payment, license });
});

router.post("/payments/:id/reject", requireAdmin, async (req, res) => {
  const payments = await readJson("payments.json", []);
  const payment = payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  if (payment.status !== "pending") return res.status(400).json({ error: "Payment already processed" });

  payment.status     = "rejected";
  payment.rejectedAt = new Date().toISOString();
  await writeJson("payments.json", payments);
  res.json({ ok: true, payment });
});

export default router;
