import { Router } from "express";
import { readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LICENSES_FILE = join(__dirname, "../data/licenses.json");
const SETTINGS_FILE = join(__dirname, "../data/settings.json");

const router = Router();

function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return res.status(503).json({ error: "ADMIN_PASSWORD not configured on server" });
  }
  const provided = req.headers["x-admin-password"];
  if (provided !== password) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function loadLicenses() {
  try {
    return JSON.parse(readFileSync(LICENSES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveLicenses(licenses) {
  writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2));
}

function generateLicenseKey() {
  return "BSA-" + randomBytes(12).toString("hex").toUpperCase();
}

// GET /api/admin/licenses
router.get("/licenses", requireAdmin, (req, res) => {
  const licenses = loadLicenses();
  res.json({
    total: licenses.length,
    licenses: licenses.sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    ),
  });
});

function computeExpiresAt(expiryDays) {
  if (!expiryDays || expiryDays <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + parseInt(expiryDays));
  return d.toISOString();
}

// POST /api/admin/licenses/generate  — manually issue a license key
router.post("/licenses/generate", requireAdmin, (req, res) => {
  const { note, expiryDays } = req.body || {};
  const licenseKey = generateLicenseKey();
  const expiresAt = computeExpiresAt(expiryDays);
  const licenses = loadLicenses();
  licenses.push({
    licenseKey,
    txHash: "MANUAL",
    note: (note || "Admin generated").slice(0, 100),
    issuedAt: new Date().toISOString(),
    ...(expiresAt ? { expiresAt } : {}),
  });
  saveLicenses(licenses);
  console.log(`🔑 Manual license issued: ${licenseKey}${note ? ` (${note})` : ""}${expiresAt ? ` expires ${expiresAt}` : ""}`);
  res.json({ licenseKey, expiresAt });
});

// POST /api/admin/licenses/bulk-generate  — generate multiple keys at once
router.post("/licenses/bulk-generate", requireAdmin, (req, res) => {
  const { count = 1, note, expiryDays } = req.body || {};
  const n = Math.max(1, Math.min(100, parseInt(count) || 1));
  const expiresAt = computeExpiresAt(expiryDays);
  const licenses = loadLicenses();
  const now = new Date().toISOString();
  const newKeys = [];
  for (let i = 0; i < n; i++) {
    const licenseKey = generateLicenseKey();
    licenses.push({
      licenseKey,
      txHash: "MANUAL",
      note: (note || "Bulk generated").slice(0, 100),
      issuedAt: now,
      ...(expiresAt ? { expiresAt } : {}),
    });
    newKeys.push(licenseKey);
  }
  saveLicenses(licenses);
  console.log(`🔑 Bulk issued ${n} license(s)${note ? ` (${note})` : ""}${expiresAt ? ` expires ${expiresAt}` : ""}`);
  res.json({ keys: newKeys, count: newKeys.length, expiresAt });
});

// GET /api/admin/revenue  — aggregated revenue stats
router.get("/revenue", requireAdmin, (req, res) => {
  const licenses = loadLicenses();

  let plans = [];
  try {
    const s = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
    plans = Array.isArray(s.plans) ? s.plans : [];
  } catch {}

  const DEFAULT_PRICES = { monthly: 5, quarterly: 12, biannual: 20, annual: 35 };
  const DEFAULT_DAYS   = { monthly: 30, quarterly: 90, biannual: 180, annual: 365 };

  function planPrice(planId) {
    const p = plans.find(x => x.id === planId);
    return p ? p.price : (DEFAULT_PRICES[planId] ?? 0);
  }
  function planDays(planId) {
    const p = plans.find(x => x.id === planId);
    return p ? p.days : (DEFAULT_DAYS[planId] ?? 30);
  }

  const now = Date.now();

  // Only paid licenses (not manual) for revenue
  const paid = licenses.filter(l => l.txHash !== "MANUAL" && l.planId);

  // Total revenue
  const totalRevenue = paid.reduce((sum, l) => sum + planPrice(l.planId), 0);

  // Active subscribers
  const active = licenses.filter(l => !l.expiresAt || new Date(l.expiresAt).getTime() > now);

  // MRR: for each active paid license, price/days*30
  const mrr = active
    .filter(l => l.txHash !== "MANUAL" && l.planId)
    .reduce((sum, l) => sum + (planPrice(l.planId) / planDays(l.planId)) * 30, 0);

  // Revenue by plan
  const byPlan = {};
  for (const l of paid) {
    const id = l.planId;
    if (!byPlan[id]) byPlan[id] = { planId: id, count: 0, revenue: 0 };
    byPlan[id].count++;
    byPlan[id].revenue += planPrice(id);
  }
  const byPlanArr = Object.values(byPlan).sort((a, b) => b.revenue - a.revenue);

  // Monthly breakdown — last 13 months
  const monthlyMap = {};
  for (let i = 12; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { month: key, activations: 0, revenue: 0 };
  }
  for (const l of paid) {
    const d = new Date(l.issuedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) {
      monthlyMap[key].activations++;
      monthlyMap[key].revenue += planPrice(l.planId);
    }
  }
  const monthly = Object.values(monthlyMap);

  // With emails
  const withEmail = licenses.filter(l => l.email).length;

  res.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    mrr: Math.round(mrr * 100) / 100,
    totalLicenses: licenses.length,
    activeLicenses: active.length,
    paidLicenses: paid.length,
    withEmail,
    byPlan: byPlanArr,
    monthly,
  });
});

// GET /api/admin/licenses/lookup?email=...  — look up a subscriber's key by email
router.get("/licenses/lookup", requireAdmin, (req, res) => {
  const raw = (req.query.email ?? "").trim().toLowerCase();
  if (!raw) return res.status(400).json({ error: "email query parameter is required" });
  const licenses = loadLicenses();
  const matches = licenses.filter(
    (l) => (l.email ?? "").toLowerCase() === raw
  ).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  res.json({ email: raw, count: matches.length, licenses: matches });
});

// PATCH /api/admin/licenses/:key/extend  — extend a license's expiry
router.patch("/licenses/:key/extend", requireAdmin, (req, res) => {
  const { key } = req.params;
  const days = parseInt(req.body?.days ?? "0");
  if (!days || days <= 0 || days > 3650) {
    return res.status(400).json({ error: "days must be 1–3650" });
  }
  const licenses = loadLicenses();
  const idx = licenses.findIndex((l) => l.licenseKey === key);
  if (idx < 0) return res.status(404).json({ error: "License not found" });

  const lic = licenses[idx];
  // Extend from current expiry if still in the future, otherwise from today
  const base = lic.expiresAt && new Date(lic.expiresAt).getTime() > Date.now()
    ? new Date(lic.expiresAt)
    : new Date();
  base.setDate(base.getDate() + days);
  licenses[idx] = { ...lic, expiresAt: base.toISOString() };
  saveLicenses(licenses);
  console.log(`📅 License extended: ${key} → ${base.toISOString()} (+${days}d)`);
  res.json({ ok: true, licenseKey: key, expiresAt: base.toISOString() });
});

// DELETE /api/admin/licenses/:key  — revoke a license key
router.delete("/licenses/:key", requireAdmin, (req, res) => {
  const { key } = req.params;
  const licenses = loadLicenses();
  const updated = licenses.filter((l) => l.licenseKey !== key);
  if (updated.length === licenses.length) {
    return res.status(404).json({ error: "License not found" });
  }
  saveLicenses(updated);
  console.log(`🗑  License revoked: ${key}`);
  res.json({ ok: true });
});

export default router;
