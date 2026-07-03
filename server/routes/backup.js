import { Router } from "express";
const router = Router();

const MOCK_BACKUPS = [
  { id: "b1", label: "Full Mailbox Backup",  date: "Today, 3:00 AM",   size: "1.2 GB", sizeBytes: 1287651328, folders: ["Inbox","Sent","Archive","Drafts","Deleted","Junk"], encrypted: true,  source: "Local",    status: "completed", duration: 432 },
  { id: "b2", label: "Sent Items Backup",    date: "Jun 28, 11:45 PM", size: "340 MB", sizeBytes: 356515840,  folders: ["Sent"],                                              encrypted: false, source: "OneDrive", status: "completed", duration: 188 },
  { id: "b3", label: "Full Mailbox Backup",  date: "Jun 26, 3:00 AM",  size: "1.1 GB", sizeBytes: 1181116006, folders: ["Inbox","Sent","Archive","Drafts","Deleted","Junk"], encrypted: true,  source: "Local",    status: "completed", duration: 398 },
  { id: "b4", label: "Inbox Backup",         date: "Jun 24, 6:00 PM",  size: "620 MB", sizeBytes: 650117120,  folders: ["Inbox"],                                             encrypted: false, source: "Azure",    status: "completed", duration: 241 },
];

const MOCK_RECENT = [
  { id: "1", type: "backup",  status: "completed", label: "Full Mailbox Backup",  startedAt: "Today 3:00 AM",  duration: 420, size: "1.2 GB" },
  { id: "2", type: "cleanup", status: "completed", label: "Newsletters Cleanup",  startedAt: "Yesterday",      duration: 60,  size: "340 MB freed" },
  { id: "3", type: "restore", status: "completed", label: "Inbox Restore",        startedAt: "Jun 28",         duration: 180, size: "420 MB" },
  { id: "4", type: "backup",  status: "failed",    label: "Incremental Backup",   startedAt: "Jun 27",         duration: null,size: null },
  { id: "5", type: "backup",  status: "completed", label: "Sent Items Backup",    startedAt: "Jun 26",         duration: 240, size: "680 MB" },
];

router.get("/list",   (_req, res) => res.json(MOCK_BACKUPS));
router.get("/recent", (_req, res) => res.json(MOCK_RECENT));

router.post("/start", (req, res) => {
  const { folders = [], destination = "local", schedule = "manual" } = req.body;
  const jobId = `job_${Date.now()}`;
  console.log(`[backup] Starting job ${jobId}: folders=${folders}, dest=${destination}, schedule=${schedule}`);
  res.json({ ok: true, jobId, status: "queued", message: "Backup queued successfully" });
});

router.get("/status/:jobId", (req, res) => {
  res.json({ jobId: req.params.jobId, status: "running", progress: Math.floor(Math.random() * 80) + 10 });
});

router.delete("/:id", (req, res) => {
  console.log(`[backup] Deleted backup ${req.params.id}`);
  res.json({ ok: true });
});

export default router;
