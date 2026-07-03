import { Router } from "express";
import crypto from "crypto";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

const DEFAULT_SETTINGS = {
  appearance: { name: "MailVault Pro", tagline: "Enterprise email backup & recovery for Microsoft 365.", primaryColor: "#0078d4" },
  payment:    { walletAddress: "", network: "tron" },
  plans:      [],
  features:   { proEnabled: true },
  notifications: { webhookUrl: "", remindersEnabled: false, reminderDays: 3, email: { enabled: false, to: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", from: "" } },
};

function findPlan(settings, planId) {
  return (settings.plans || []).find((p) => p.id === planId);
}

function generateLicenseKey() {
  return `MVP-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
}

function licenseIsValid(license) {
  if (!license) return { ok: false, reason: "not_found" };
  if (license.revoked) return { ok: false, reason: "revoked" };
  if (license.expiresAt && new Date(license.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

function toSubscriptionInfo(license, settings) {
  const plan = findPlan(settings, license.planId);
  return {
    subscribed: true,
    licenseKey: license.licenseKey,
    planId: license.planId,
    planLabel: plan?.label ?? license.planId,
    expiresAt: license.expiresAt ?? null,
  };
}

/**
 * GET /api/billing/config
 * Public: wallet address, network, and available plans for USDT payment.
 */
router.get("/config", async (_req, res) => {
  const settings = await readJson("settings.json", DEFAULT_SETTINGS);
  res.json({
    walletAddress: settings.payment?.walletAddress ?? "",
    network:       settings.payment?.network ?? "tron",
    plans:         settings.plans ?? [],
  });
});

/**
 * POST /api/billing/usdt/submit
 * User submits a USDT transaction hash for a chosen plan. Creates a pending
 * payment record for the admin to review and approve.
 */
router.post("/usdt/submit", async (req, res) => {
  const { planId, txHash, walletFrom, note } = req.body ?? {};
  if (!planId || !txHash) return res.status(400).json({ error: "planId and txHash are required" });

  const settings = await readJson("settings.json", DEFAULT_SETTINGS);
  const plan = findPlan(settings, planId);
  if (!plan) return res.status(400).json({ error: "Unknown plan" });

  const payments = await readJson("payments.json", []);
  const payment = {
    id:         `pay_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    planId:     plan.id,
    planLabel:  plan.label,
    price:      plan.price,
    txHash:     String(txHash).trim(),
    walletFrom: walletFrom ? String(walletFrom).trim() : null,
    note:       note ? String(note).trim() : null,
    status:     "pending",
    createdAt:  new Date().toISOString(),
    licenseKey: null,
  };
  payments.push(payment);
  await writeJson("payments.json", payments);

  res.json(payment);
});

/**
 * GET /api/billing/usdt/:id
 * Check the status of a submitted USDT payment.
 */
router.get("/usdt/:id", async (req, res) => {
  const payments = await readJson("payments.json", []);
  const payment = payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  res.json(payment);
});

/**
 * POST /api/billing/license/verify
 * Checks a stored license key without side effects (used to restore session).
 */
router.post("/license/verify", async (req, res) => {
  const { licenseKey } = req.body ?? {};
  if (!licenseKey) return res.json({ subscribed: false });

  const [settings, licenses] = await Promise.all([
    readJson("settings.json", DEFAULT_SETTINGS),
    readJson("licenses.json", []),
  ]);
  const license = licenses.find((l) => l.licenseKey === licenseKey);
  const check = licenseIsValid(license);
  if (!check.ok) return res.json({ subscribed: false, reason: check.reason });

  res.json(toSubscriptionInfo(license, settings));
});

/**
 * POST /api/billing/license/redeem
 * Activates a license key for the current user/device.
 */
router.post("/license/redeem", async (req, res) => {
  const { licenseKey } = req.body ?? {};
  if (!licenseKey) return res.status(400).json({ error: "License key is required" });

  const [settings, licenses] = await Promise.all([
    readJson("settings.json", DEFAULT_SETTINGS),
    readJson("licenses.json", []),
  ]);
  const license = licenses.find((l) => l.licenseKey === String(licenseKey).trim());
  const check = licenseIsValid(license);
  if (!check.ok) {
    const messages = {
      not_found: "License key not found",
      revoked:   "This license key has been revoked",
      expired:   "This license key has expired",
    };
    return res.status(400).json({ error: messages[check.reason] ?? "Invalid license key" });
  }

  if (!license.activatedAt) {
    license.activatedAt = new Date().toISOString();
    await writeJson("licenses.json", licenses);
  }

  res.json(toSubscriptionInfo(license, settings));
});

export { generateLicenseKey, licenseIsValid, findPlan };
export default router;
