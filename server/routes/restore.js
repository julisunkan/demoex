import { Router } from "express";
const router = Router();

/**
 * POST /api/restore/start
 * Queues a restore job from an existing backup.
 * In production this would call Microsoft Graph to import emails.
 */
router.post("/start", (req, res) => {
  const { backupId, scope = "full", conflict = "skip", destination = "original" } = req.body;

  if (!backupId) return res.status(400).json({ error: "backupId is required" });

  const jobId = `restore_${Date.now()}`;
  console.log(`[restore] Job ${jobId} queued: backup=${backupId}, scope=${scope}, conflict=${conflict}, dest=${destination}`);

  res.json({
    ok:      true,
    jobId,
    status:  "queued",
    message: "Restore job queued successfully",
  });
});

/**
 * GET /api/restore/status/:jobId
 * Returns the current progress of a restore job.
 */
router.get("/status/:jobId", (req, res) => {
  res.json({
    jobId:    req.params.jobId,
    status:   "running",
    progress: Math.floor(Math.random() * 80) + 10,
  });
});

export default router;
