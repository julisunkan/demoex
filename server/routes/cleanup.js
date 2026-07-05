import { Router } from "express";
import crypto from "crypto";
import { extractOutlookAuth, graphFetch } from "../lib/graphProxy.js";
import { readJson, writeJson } from "../lib/store.js";

const router = Router();

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
    const cutoff = new Date(Date.now() - days * 86_400_000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");

    const qs = new URLSearchParams({
      $filter:  `receivedDateTime lt ${cutoff}`,
      $top:     "100",
      $select:  "id,subject,from,receivedDateTime,size,hasAttachments",
    });

    const data     = await graphFetch(auth.token, `/me/messages?${qs}`);
    const messages = (data?.value ?? [])
      .filter(m => {
        if (!senderFilter) return true;
        const addr = (m.from?.emailAddress?.address ?? "").toLowerCase();
        return addr.includes(senderFilter.toLowerCase());
      })
      .sort((a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime));

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
        category:       reason,
      }];
    });

    return res.json({ connected: true, emails, total: emails.length });
  } catch (err) {
    console.error("[cleanup] scan error:", err.message);
    return res.json({ error: err.message, connected: false, emails: [], total: 0 });
  }
});

/**
 * POST /api/cleanup/delete
 * Permanently deletes a list of email IDs from the mailbox.
 */
router.post("/delete", async (req, res) => {
  const auth = extractOutlookAuth(req);
  if (!auth) return res.status(401).json({ error: "Not connected to Outlook. Load the add-in inside Outlook first." });

  const { ids = [] } = req.body ?? {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids must be a non-empty array" });
  }

  let deleted = 0;
  let failed  = 0;

  for (const id of ids) {
    try {
      await graphFetch(auth.token, `/me/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
      deleted++;
    } catch (e) {
      console.warn(`[cleanup] delete ${id}:`, e.message);
      failed++;
    }
  }

  res.json({ ok: true, deleted, failed });
});

export default router;
