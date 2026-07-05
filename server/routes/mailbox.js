import { Router } from "express";
import { extractOutlookAuth, graphFetch } from "../lib/graphProxy.js";
import { readJson } from "../lib/store.js";

const router = Router();

/**
 * GET /api/mailbox/stats
 * Returns real mailbox statistics by querying Microsoft Graph.
 * Requires x-outlook-token header (Graph access token via MSAL).
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
    const data = await graphFetch(
      auth.token,
      "/me/mailFolders?$top=50&$select=displayName,totalItemCount,sizeInBytes,childFolderCount"
    );

    const folders = (data?.value ?? []).map(f => ({
      name:   f.displayName,
      count:  f.totalItemCount  ?? 0,
      sizeMB: Math.round((f.sizeInBytes ?? 0) / (1024 * 1024)),
    }));

    const totalEmails    = folders.reduce((s, f) => s + f.count, 0);
    const totalSizeBytes = folders.reduce((s, f) => s + f.sizeMB * 1024 * 1024, 0);

    const backups    = await readJson("backups.json", []);
    const lastBackup = backups.length
      ? backups[backups.length - 1].date
      : null;

    return res.json({
      connected:      true,
      totalSize:      totalSizeBytes,
      totalEmails,
      storageUsedPct: null,
      lastBackup,
      nextBackup:     null,
      backupCount:    backups.length,
      folders,
    });
  } catch (err) {
    console.error("[mailbox] stats error:", err.message);
    return res.json({
      connected: false, error: err.message,
      totalSize: 0, totalEmails: 0, storageUsedPct: 0,
      lastBackup: null, nextBackup: null, backupCount: 0, folders: [],
    });
  }
});

export default router;
