import { Router } from "express";
import { extractOutlookAuth, outlookFetch } from "../lib/graphProxy.js";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

// In-memory progress map for running jobs (cleared once persisted to jobs.json).
const jobProgress = new Map();

/** Strict UUID v4 validation — prevents path traversal via backupId. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str) {
  return typeof str === "string" && UUID_RE.test(str);
}

/**
 * Resolve a well-known folder name to its Outlook folder ID.
 * Returns null if not found.
 */
async function resolveFolderId(token, restUrl, name) {
  const data = await outlookFetch(token, restUrl,
    "/v2.0/me/MailFolders?$top=50&$select=displayName,id");
  const folders = data?.value ?? [];
  const lower = name.toLowerCase();
  return (
    folders.find(f => f.displayName.toLowerCase() === lower) ??
    folders.find(f => f.displayName.toLowerCase().includes(lower))
  )?.id ?? null;
}

/**
 * Check whether an Outlook message still exists by its original ID.
 * Returns true if found, false if 404.
 */
async function messageExists(token, restUrl, msgId) {
  try {
    await outlookFetch(token, restUrl,
      `/v2.0/me/messages/${encodeURIComponent(msgId)}?$select=id`);
    return true;
  } catch (err) {
    if (err.status === 404) return false;
    throw err; // propagate real errors (401, 503 …)
  }
}

/**
 * Build the minimal Outlook message body from stored backup metadata.
 */
function buildMessagePayload(msg) {
  const payload = {
    subject:    msg.subject ?? "(no subject)",
    importance: msg.importance ?? "normal",
    isRead:     msg.isRead ?? false,
    body: {
      contentType: "text",
      content:     msg.bodyPreview ?? "",
    },
  };
  if (msg.from?.emailAddress)    payload.from         = { emailAddress: msg.from.emailAddress };
  if (msg.toRecipients?.length)  payload.toRecipients = msg.toRecipients;
  return payload;
}

/**
 * Attempt to restore a single message according to the selected conflict policy.
 *
 * conflict:
 *   "skip"    – do nothing if the message already exists in Outlook.
 *   "replace" – delete the existing copy then re-create from backup data.
 *   "keep"    – always create a new copy (allow duplicates).
 *
 * Returns "created" | "skipped" | "replaced".
 */
async function restoreMessage(token, restUrl, msg, targetFolderId, conflict) {
  const path = targetFolderId
    ? `/v2.0/me/MailFolders/${encodeURIComponent(targetFolderId)}/messages`
    : "/v2.0/me/messages";

  if (conflict === "skip") {
    if (await messageExists(token, restUrl, msg.id)) return "skipped";
  } else if (conflict === "replace") {
    if (await messageExists(token, restUrl, msg.id)) {
      await outlookFetch(token, restUrl,
        `/v2.0/me/messages/${encodeURIComponent(msg.id)}`,
        { method: "DELETE" });
    }
  }
  // "keep" falls straight through to create; "replace" lands here after delete.

  await outlookFetch(token, restUrl, path, {
    method: "POST",
    body:   JSON.stringify(buildMessagePayload(msg)),
  });
  return conflict === "replace" ? "replaced" : "created";
}

/**
 * POST /api/restore/start
 * Kicks off an async restore job from a stored backup file.
 */
router.post("/start", async (req, res) => {
  const auth = extractOutlookAuth(req);
  if (!auth) {
    return res.status(401).json({ error: "Not connected to Outlook. Load the add-in inside Outlook first." });
  }

  const { backupId, scope = "full", conflict = "skip", destination = "original" } = req.body ?? {};

  if (!backupId) return res.status(400).json({ error: "backupId is required" });
  if (!isValidUUID(backupId)) {
    return res.status(400).json({ error: "Invalid backupId format" });
  }

  // Validate enum inputs to prevent unexpected behaviour.
  const validScopes     = ["full", "folder", "email"];
  const validConflicts  = ["skip", "replace", "keep"];
  const validDests      = ["original", "inbox", "archive"];
  if (!validScopes.includes(scope))       return res.status(400).json({ error: `Invalid scope: ${scope}` });
  if (!validConflicts.includes(conflict)) return res.status(400).json({ error: `Invalid conflict: ${conflict}` });
  if (!validDests.includes(destination))  return res.status(400).json({ error: `Invalid destination: ${destination}` });

  let backupData;
  try {
    backupData = await readJson(`backup_${backupId}.json`, null);
  } catch (err) {
    return res.status(500).json({ error: "Failed to read backup file" });
  }
  if (!backupData) return res.status(404).json({ error: "Backup file not found" });

  const jobId    = `restore_${Date.now()}`;
  const startTime = Date.now();

  jobProgress.set(jobId, { status: "running", progress: 0 });
  res.json({ ok: true, jobId, status: "running", message: "Restore started" });

  // Background async work — Express route has already responded.
  (async () => {
    try {
      const folderNames = Object.keys(backupData.folders ?? {});

      // Note: for scope="folder" and scope="email" the wizard does not yet send
      // a sub-selection, so we restore all available data from the backup.
      // When the wizard is extended with a folder/email picker, add filtering here.

      let created  = 0;
      let replaced = 0;
      let skipped  = 0;
      let failed   = 0;

      // Pre-resolve the destination folder ID once if not using "original".
      let fixedDestId = null;
      if (destination === "inbox") {
        fixedDestId = await resolveFolderId(auth.token, auth.restUrl, "Inbox").catch(() => null);
      } else if (destination === "archive") {
        fixedDestId = (
          await resolveFolderId(auth.token, auth.restUrl, "Archive").catch(() => null) ??
          await resolveFolderId(auth.token, auth.restUrl, "Archived Mail").catch(() => null)
        );
      }

      for (let fi = 0; fi < folderNames.length; fi++) {
        const folderName = folderNames[fi];
        const messages   = backupData.folders[folderName] ?? [];

        let folderId = fixedDestId;
        if (destination === "original") {
          folderId = await resolveFolderId(auth.token, auth.restUrl, folderName).catch(() => null);
        }

        for (const msg of messages) {
          try {
            const outcome = await restoreMessage(auth.token, auth.restUrl, msg, folderId, conflict);
            if (outcome === "created")  created++;
            else if (outcome === "replaced") replaced++;
            else skipped++;
          } catch (e) {
            console.warn(`[restore] ${jobId}: failed to restore msg ${msg.id}:`, e.message);
            failed++;
          }
        }

        const pct = Math.round(((fi + 1) / folderNames.length) * 90);
        jobProgress.set(jobId, { status: "running", progress: pct });
      }

      jobProgress.set(jobId, { status: "completed", progress: 100 });

      const jobs = await readJson("jobs.json", []);
      jobs.push({
        id:        jobId,
        type:      "restore",
        status:    "completed",
        label:     `Restore (created ${created}, replaced ${replaced}, skipped ${skipped})`,
        startedAt: new Date(startTime).toLocaleString(),
        duration:  Math.round((Date.now() - startTime) / 1000),
        size:      null,
      });
      await writeJson("jobs.json", jobs);
      jobProgress.delete(jobId);
      console.log(`[restore] ${jobId}: done — created=${created}, replaced=${replaced}, skipped=${skipped}, failed=${failed}`);
    } catch (err) {
      console.error(`[restore] ${jobId} failed:`, err.message);
      jobProgress.set(jobId, { status: "failed", progress: 0 });
      const jobs = await readJson("jobs.json", []).catch(() => []);
      jobs.push({
        id: jobId, type: "restore", status: "failed",
        label: "Restore failed", startedAt: new Date(startTime).toLocaleString(),
        duration: null, size: null,
      });
      await writeJson("jobs.json", jobs).catch(() => {});
      jobProgress.delete(jobId);
    }
  })();
});

/**
 * GET /api/restore/status/:jobId
 */
router.get("/status/:jobId", async (req, res) => {
  // Live progress from in-memory map first.
  const live = jobProgress.get(req.params.jobId);
  if (live) return res.json({ jobId: req.params.jobId, ...live });

  // Fall back to persisted job history.
  try {
    const jobs = await readJson("jobs.json", []);
    const job  = jobs.find(j => j.id === req.params.jobId);
    if (job) {
      return res.json({
        jobId:    req.params.jobId,
        status:   job.status,
        progress: job.status === "completed" ? 100 : 0,
      });
    }
  } catch { /* ignore read errors */ }

  // Unknown job — still starting up, keep client polling briefly.
  res.json({ jobId: req.params.jobId, status: "unknown", progress: 5 });
});

export default router;
