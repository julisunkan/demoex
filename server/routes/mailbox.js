import { Router } from "express";
import { extractOutlookAuth, outlookFetch } from "../lib/graphProxy.js";
import { readJson } from "../lib/store.js";

const router = Router();

/**
 * GET /api/mailbox/stats
 * Returns real mailbox statistics by querying the Outlook REST API.
 * Requires x-outlook-token and x-outlook-rest-url headers.
 *
 * Note: restUrl ends with "/api" (e.g. "https://outlook.office.com/api").
 * Paths therefore start with "/v2.0/me/...", not "/api/v2.0/me/...".
 */
router.get("/stats", async (req, res) => {
  const auth = extractOutlookAuth(req);

  if (!auth) {
    return res.json({
      connected:      false,
      totalSize:      0,
      totalEmails:    0,
      storageUsedPct: 0,
      lastBackup:     null,
      nextBackup:     null,
      backupCount:    0,
      folders:        [],
    });
  }

  try {
    const data = await outlookFetch(
      auth.token,
      auth.restUrl,
      "/v2.0/me/MailFolders?$top=50&$select=displayName,totalItemCount,sizeInBytes,childFolderCount"
    );

    const folders = (data?.value ?? []).map(f => ({
      name:   f.displayName,
      count:  f.totalItemCount  ?? 0,
      sizeMB: Math.round((f.sizeInBytes ?? 0) / (1024 * 1024)),
    }));

    const totalEmails    = folders.reduce((s, f) => s + f.count, 0);
    const totalSizeBytes = folders.reduce((s, f) => s + f.sizeMB * 1024 * 1024, 0);

    // Read real backup count from persisted store
    const backups     = await readJson("backups.json", []);
    const lastBackup  = backups.length
      ? backups[backups.length - 1].date
      : null;

    return res.json({
      connected:      true,
      totalSize:      totalSizeBytes,
      totalEmails,
      storageUsedPct: null, // quota info not exposed by callback-token scope
      lastBackup,
      nextBackup:     null,
      backupCount:    backups.length,
      folders,
    });
  } catch (err) {
    console.error("[mailbox] stats error:", err.message);
    // Always 200 so React Query caches and polling continues.
    return res.json({
      connected: false, error: err.message,
      totalSize: 0, totalEmails: 0, storageUsedPct: 0,
      lastBackup: null, nextBackup: null, backupCount: 0, folders: [],
    });
  }
});

export default router;
