import { Router } from "express";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

const DEFAULT_SETTINGS = {
  notifications: {
    backupCompleted:  true,
    backupFailed:     true,
    storageFull:      true,
    licenseExpiring:  true,
    restoreCompleted: false,
  },
  scheduler: {
    defaultSchedule: "daily",
    defaultTime:     "02:00",
    timezone:        "UTC",
    retryFailedJobs: true,
    maxRetries:      3,
  },
  storage: {
    defaultProvider:    "local",
    retentionDays:      365,
    compressionEnabled: true,
  },
};

router.get("/", async (_req, res) => {
  try {
    const settings = await readJson("user-settings.json", DEFAULT_SETTINGS);
    res.json(settings);
  } catch (err) {
    console.error("[settings] GET error:", err.message);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.put("/", async (req, res) => {
  try {
    const current = await readJson("user-settings.json", DEFAULT_SETTINGS);
    const updated  = { ...current, ...req.body };
    await writeJson("user-settings.json", updated);
    res.json({ ok: true, settings: updated });
  } catch (err) {
    console.error("[settings] PUT error:", err.message);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

router.delete("/", async (_req, res) => {
  try {
    await writeJson("user-settings.json", DEFAULT_SETTINGS);
    res.json({ ok: true });
  } catch (err) {
    console.error("[settings] DELETE error:", err.message);
    res.status(500).json({ error: "Failed to reset settings" });
  }
});

export default router;
