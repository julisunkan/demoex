import { Router } from "express";
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
    defaultProvider: "local",
    retentionDays:   365,
    compressionEnabled: true,
  },
};

let currentSettings = { ...DEFAULT_SETTINGS };

router.get("/",    (_req, res) => res.json(currentSettings));
router.put("/",    (req, res)  => { currentSettings = { ...currentSettings, ...req.body }; res.json({ ok: true, settings: currentSettings }); });
router.delete("/", (_req, res) => { currentSettings = { ...DEFAULT_SETTINGS }; res.json({ ok: true }); });

export default router;
