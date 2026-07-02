import { Router } from "express";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, "../data/settings.json");

const router = Router();

const DEFAULT_SETTINGS = {
  appearance: {
    name:         "Financial Data Analyzer",
    tagline:      "Analyze transactions, track budgets, and export financial reports.",
    primaryColor: "#3b82f6",
    accentColor:  "#16a34a",
    radius:       "6px",
  },
  notifications: {
    webhookUrl:       "",
    remindersEnabled: false,
    reminderDays:     3,
    email: { enabled: false, to: "", smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "", from: "" },
  },
  features: { proEnabled: true },
};

function loadSettings() {
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      appearance:    { ...DEFAULT_SETTINGS.appearance,    ...(raw.appearance    || {}) },
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(raw.notifications || {}),
        email: { ...DEFAULT_SETTINGS.notifications.email, ...(raw.notifications?.email || {}) },
      },
      features: { ...DEFAULT_SETTINGS.features, ...(raw.features || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });
  if (req.headers["x-admin-password"] !== password) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// GET /api/config  (public — frontend loads this on startup)
router.get("/", (_req, res) => {
  const s = loadSettings();
  res.json({ appearance: s.appearance, features: s.features });
});

// GET /api/admin/settings
router.get("/settings", requireAdmin, (_req, res) => {
  res.json(loadSettings());
});

// PUT /api/admin/settings
router.put("/settings", requireAdmin, (req, res) => {
  const current = loadSettings();
  const patch   = req.body || {};
  const merged  = {
    appearance:    { ...current.appearance,    ...(patch.appearance    || {}) },
    notifications: {
      ...current.notifications,
      ...(patch.notifications || {}),
      email: { ...current.notifications.email, ...(patch.notifications?.email || {}) },
    },
    features: { ...current.features, ...(patch.features || {}) },
  };
  saveSettings(merged);
  res.json({ ok: true, settings: merged });
});

// POST /api/admin/notify-test
router.post("/notify-test", requireAdmin, (_req, res) => {
  res.status(400).json({ error: "Notifications are not configured in this version." });
});

// GET /api/admin/export — full backup
router.get("/export", requireAdmin, (req, res) => {
  let subscriptions = [];
  try {
    const subsFile = join(__dirname, "../data/subscriptions.json");
    subscriptions = JSON.parse(readFileSync(subsFile, "utf8"));
  } catch {}

  const backup = {
    exportedAt:    new Date().toISOString(),
    settings:      loadSettings(),
    subscriptions,
  };
  res.setHeader("Content-Disposition", `attachment; filename="bsa-backup-${Date.now()}.json"`);
  res.setHeader("Content-Type", "application/json");
  res.json(backup);
});

export default router;
