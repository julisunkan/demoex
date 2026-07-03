import { Router } from "express";
const router = Router();

/**
 * POST /api/cleanup/start
 * Queues a cleanup job to delete selected emails.
 * In production this would call Microsoft Graph to delete the emails.
 */
router.post("/start", (req, res) => {
  const {
    emailIds    = [],
    backupFirst = true,
    filters     = {},
  } = req.body;

  if (!emailIds.length) return res.status(400).json({ error: "No emails selected for cleanup" });

  const jobId = `cleanup_${Date.now()}`;
  console.log(`[cleanup] Job ${jobId}: ${emailIds.length} emails, backupFirst=${backupFirst}, filters=`, filters);

  // In production:
  // 1. If backupFirst=true, create a backup job first and wait for it
  // 2. Call Graph API DELETE /me/messages/{id} for each emailId
  // 3. Store result in DB for audit log

  res.json({
    ok:           true,
    jobId,
    status:       "queued",
    emailsQueued: emailIds.length,
    message:      `Cleanup job queued — ${emailIds.length} emails will be deleted`,
  });
});

/**
 * GET /api/cleanup/status/:jobId
 */
router.get("/status/:jobId", (req, res) => {
  res.json({
    jobId:    req.params.jobId,
    status:   "running",
    progress: Math.floor(Math.random() * 80) + 10,
  });
});

/**
 * GET /api/cleanup/scan
 * Scans the mailbox and returns candidate emails for cleanup (newsletters, promotional, etc.)
 * In production this calls Microsoft Graph with OData filters.
 */
router.get("/scan", (_req, res) => {
  res.json({
    newsletters:  1204,
    promotional:  890,
    social:       740,
    duplicates:   142,
    oldEmails:    2340,
    totalSizeMB:  680,
  });
});

export default router;
