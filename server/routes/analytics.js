import { Router } from "express";
const router = Router();

router.get("/", (_req, res) => {
  res.json({
    folderSizes: [
      { name: "Archive", emails: 5612, sizeMB: 1240 },
      { name: "Inbox",   emails: 4821, sizeMB: 890  },
      { name: "Sent",    emails: 2103, sizeMB: 420  },
      { name: "Deleted", emails: 392,  sizeMB: 68   },
      { name: "Junk",    emails: 88,   sizeMB: 14   },
      { name: "Drafts",  emails: 14,   sizeMB: 2    },
    ],
    topSenders: [
      { name: "GitHub",      count: 1840, sizeMB: 380 },
      { name: "Newsletters", count: 1204, sizeMB: 290 },
      { name: "Amazon",      count: 890,  sizeMB: 180 },
      { name: "LinkedIn",    count: 740,  sizeMB: 120 },
      { name: "Work / HR",   count: 620,  sizeMB: 95  },
      { name: "Google",      count: 480,  sizeMB: 60  },
    ],
    monthlyTrends: [
      { month: "Jan", received: 620, sent: 180 },
      { month: "Feb", received: 540, sent: 210 },
      { month: "Mar", received: 780, sent: 240 },
      { month: "Apr", received: 690, sent: 190 },
      { month: "May", received: 820, sent: 260 },
      { month: "Jun", received: 710, sent: 220 },
    ],
    storageBreakdown: [
      { name: "Attachments",  value: 58 },
      { name: "Email Bodies", value: 28 },
      { name: "Metadata",     value: 8  },
      { name: "Other",        value: 6  },
    ],
    healthInsights: {
      duplicateEmails:   142,
      newsletters:       1204,
      largestAttachmentMB: 48,
      oldestEmailYear:   2019,
    },
  });
});

export default router;
