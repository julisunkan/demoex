import { Router } from "express";
import crypto      from "crypto";
import { extractOutlookAuth, graphFetch } from "../lib/graphProxy.js";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

/** GET /api/backup/list — all completed backups */
router.get("/list", async (_req, res) => {
  const backups = await readJson("backups.json", []);
  res.json(backups.slice().reverse());
});

/** GET /api/backup/recent — recent job history */
router.get("/recent", async (_req, res) => {
  const jobs = await readJson("jobs.json", []);
  res.json(jobs.slice(-20).reverse());
});

/** POST /api/backup/start — kick off a real backup job */
router.post("/start", async (req, res) => {
  const auth = extractOutlookAuth(req);
  if (!auth) return res.status(401).json({ error: "Not connected to Outlook. Load the add-in inside Outlook first." });

  const {
    folders     = [],
    filters     = {},
    destination = "local",
    options     = {},
    schedule    = "manual",
  } = req.body;

  const jobId     = `backup_${Date.now()}`;
  const startTime = Date.now();

  res.json({ ok: true, jobId, status: "running", message: "Backup started — this may take a few minutes" });

  (async () => {
    let totalEmails    = 0;
    let totalSizeBytes = 0;
    const backedFolders = [];

    try {
      // Discover all top-level mailbox folders via Microsoft Graph
      const foldersData = await graphFetch(
        auth.token,
        "/me/mailFolders?$top=50&$select=displayName,id,totalItemCount"
      );
      const allFolders = foldersData?.value ?? [];

      const normalize = s => s.toLowerCase().replace(/\s+/g, "");
      const targets   = folders.length
        ? allFolders.filter(f => folders.some(sel => normalize(sel) === normalize(f.displayName)))
        : allFolders;

      const backupData = { jobId, createdAt: new Date().toISOString(), folders: {} };

      for (const folder of targets) {
        const emails   = [];
        let   skip     = 0;
        const pageSize = 50;

        while (true) {
          const oFilters = [];
          if (filters.dateFrom) oFilters.push(`receivedDateTime ge ${new Date(filters.dateFrom).toISOString().replace(/\.\d{3}Z$/, "Z")}`);
          if (filters.dateTo)   oFilters.push(`receivedDateTime le ${new Date(filters.dateTo).toISOString().replace(/\.\d{3}Z$/, "Z")}`);
          if (filters.unreadOnly) oFilters.push("isRead eq false");
          if (filters.hasAttach)  oFilters.push("hasAttachments eq true");

          const qs = new URLSearchParams({
            $top:    String(pageSize),
            $skip:   String(skip),
            $select: "id,subject,from,toRecipients,receivedDateTime,sentDateTime,size,hasAttachments,bodyPreview,internetMessageId,importance,isRead",
          });
          if (oFilters.length) qs.set("$filter", oFilters.join(" and "));

          const page = await graphFetch(
            auth.token,
            `/me/mailFolders/${encodeURIComponent(folder.id)}/messages?${qs}`
          );
          let msgs = page?.value ?? [];
          if (!msgs.length) break;

          // Apply sender filter JS-side
          if (filters.sender) {
            const s = filters.sender.toLowerCase();
            msgs = msgs.filter(m =>
              (m.from?.emailAddress?.address ?? "").toLowerCase().includes(s) ||
              (m.from?.emailAddress?.name    ?? "").toLowerCase().includes(s)
            );
          }

          emails.push(...msgs);
          totalEmails    += msgs.length;
          totalSizeBytes += msgs.reduce((s, m) => s + (m.size ?? 0), 0);

          if (msgs.length < pageSize) break;
          skip += pageSize;
        }

        if (emails.length) {
          backupData.folders[folder.displayName] = emails;
          backedFolders.push(folder.displayName);
        }
      }

      const isFullBackup = !folders.length || backedFolders.length >= allFolders.length;
      const label  = isFullBackup ? "Full Mailbox Backup" : `${backedFolders.slice(0, 3).join(", ")} Backup`;
      const sizeStr = totalSizeBytes >= 1e9
        ? `${(totalSizeBytes / 1e9).toFixed(1)} GB`
        : `${Math.round(totalSizeBytes / 1e6)} MB`;

      const backupId = crypto.randomUUID();
      const backupRecord = {
        id:          backupId,
        jobId,
        label,
        date:        new Date().toLocaleString(),
        size:        sizeStr,
        sizeBytes:   totalSizeBytes,
        folders:     backedFolders,
        encrypted:   !!(options.encrypt),
        destination,
        status:      "completed",
        duration:    Math.round((Date.now() - startTime) / 1000),
        emails:      totalEmails,
        createdAt:   new Date().toISOString(),
      };

      await writeJson(`backup_${backupId}.json`, backupData);
      const list = await readJson("backups.json", []);
      list.push(backupRecord);
      await writeJson("backups.json", list);

      const jobs = await readJson("jobs.json", []);
      jobs.push({ id: jobId, type: "backup", status: "completed", label, startedAt: new Date(startTime).toLocaleString(), duration: backupRecord.duration, size: sizeStr });
      await writeJson("jobs.json", jobs);

      console.log(`[backup] Job ${jobId} done: ${totalEmails} emails, ${sizeStr}`);
    } catch (err) {
      console.error(`[backup] Job ${jobId} failed:`, err.message);
      const jobs = await readJson("jobs.json", []);
      jobs.push({ id: jobId, type: "backup", status: "failed", label: "Backup", startedAt: new Date(startTime).toLocaleString(), duration: null, size: null });
      await writeJson("jobs.json", jobs).catch(() => {});
    }
  })();
});

/** GET /api/backup/status/:jobId */
router.get("/status/:jobId", async (req, res) => {
  const jobs = await readJson("jobs.json", []);
  const job  = jobs.find(j => j.id === req.params.jobId);
  if (job) {
    return res.json({ jobId: req.params.jobId, status: job.status, progress: job.status === "completed" ? 100 : job.status === "failed" ? 0 : 60 });
  }
  res.json({ jobId: req.params.jobId, status: "running", progress: 40 });
});

/** DELETE /api/backup/:id */
router.delete("/:id", async (req, res) => {
  const list    = await readJson("backups.json", []);
  const updated = list.filter(b => b.id !== req.params.id);
  await writeJson("backups.json", updated);
  res.json({ ok: true });
});

export default router;
