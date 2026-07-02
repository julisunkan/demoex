/**
 * seed.js — runs at every server startup to ensure all data files exist
 * and required entries are present. Safe to call repeatedly.
 *
 * Each data file is seeded independently — a problem with one file never
 * prevents the others from being seeded.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../data");

const SETTINGS_FILE      = join(DATA_DIR, "settings.json");
const SUBSCRIPTIONS_FILE = join(DATA_DIR, "subscriptions.json");
const TICKETS_FILE       = join(DATA_DIR, "tickets.json");

// ── Seed definitions ──────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  appearance: {
    name:         "Bank Statement Analyzer",
    tagline:      "Analyze transactions, categorize spending, and export summary reports.",
    primaryColor: "#3b82f6",
    accentColor:  "#16a34a",
    radius:       "6px",
  },
  notifications: {
    webhookUrl:       "",
    remindersEnabled: false,
    reminderDays:     3,
    email: {
      enabled:  false,
      to:       "",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPass: "",
      from:     "",
    },
  },
  features: { proEnabled: true },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function tryReadJson(file) {
  if (!existsSync(file)) return { found: false };
  let raw;
  try { raw = readFileSync(file, "utf8"); } catch (e) {
    return { found: true, ok: false, err: e.message };
  }
  try { return { found: true, ok: true, data: JSON.parse(raw) }; }
  catch (e) { return { found: true, ok: false, raw, err: e.message }; }
}

function writeJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function quarantine(file) {
  const bak = `${file}.corrupt-${Date.now()}.bak`;
  try { renameSync(file, bak); return { ok: true, bak }; }
  catch (err) { return { ok: false, err: err.message }; }
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function mergeDefaults(target, defaults) {
  for (const [key, val] of Object.entries(defaults)) {
    if (!(key in target)) {
      target[key] = val;
    } else if (
      isPlainObject(val) && isPlainObject(target[key])
    ) {
      mergeDefaults(target[key], val);
    }
  }
  return target;
}

// ── Seed functions ────────────────────────────────────────────────────────────

function seedSettings() {
  try {
    const result = tryReadJson(SETTINGS_FILE);
    if (!result.found) {
      writeJson(SETTINGS_FILE, DEFAULT_SETTINGS);
      console.log("⚙️  Created settings.json with defaults");
      return;
    }
    if (!result.ok || !isPlainObject(result.data)) {
      const reason = !result.ok ? "corrupt JSON" : "unexpected type";
      const q = quarantine(SETTINGS_FILE);
      if (!q.ok) {
        console.error(`❌ settings.json is ${reason} and quarantine failed — skipping`);
        return;
      }
      console.warn(`⚠️  settings.json was ${reason} — quarantined, writing defaults`);
      writeJson(SETTINGS_FILE, DEFAULT_SETTINGS);
      return;
    }
    writeJson(SETTINGS_FILE, mergeDefaults(result.data, DEFAULT_SETTINGS));
  } catch (err) {
    console.error("❌ seedSettings failed:", err.message);
  }
}

function seedSubscriptions() {
  try {
    if (!existsSync(SUBSCRIPTIONS_FILE)) {
      writeJson(SUBSCRIPTIONS_FILE, []);
      console.log("📋 Created subscriptions.json");
    }
  } catch (err) {
    console.error("❌ seedSubscriptions failed:", err.message);
  }
}

function seedTickets() {
  try {
    if (!existsSync(TICKETS_FILE)) {
      writeJson(TICKETS_FILE, []);
      console.log("🎫 Created tickets.json");
    }
  } catch (err) {
    console.error("❌ seedTickets failed:", err.message);
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function seedDataFiles() {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
      console.log("📁 Created data/ directory");
    }
  } catch (err) {
    console.error("❌ Could not create data/ directory:", err.message);
  }

  seedSettings();
  seedSubscriptions();
  seedTickets();
}
