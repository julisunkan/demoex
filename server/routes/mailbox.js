import { Router } from "express";
const router = Router();

router.get("/stats", (_req, res) => {
  res.json({
    totalSize:      3_420_000_000,
    totalEmails:    12847,
    storageUsedPct: 68,
    lastBackup:     "2 hours ago",
    nextBackup:     "Tomorrow 2:00 AM",
    backupCount:    24,
    folders: [
      { name: "Inbox",   count: 4821, sizeMB: 890  },
      { name: "Sent",    count: 2103, sizeMB: 420  },
      { name: "Archive", count: 5612, sizeMB: 1240 },
      { name: "Drafts",  count: 14,   sizeMB: 2    },
      { name: "Deleted", count: 392,  sizeMB: 68   },
      { name: "Junk",    count: 88,   sizeMB: 14   },
    ],
  });
});

export default router;
