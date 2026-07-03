import { Router } from "express";
import { extractOutlookAuth, outlookFetch } from "../lib/graphProxy.js";

const router = Router();

// restUrl ends with "/api" — paths use "/v2.0/me/..."
router.get("/", async (req, res) => {
  const auth = extractOutlookAuth(req);

  if (!auth) {
    return res.json({
      connected:        false,
      folderSizes:      [],
      topSenders:       [],
      monthlyTrends:    [],
      storageBreakdown: [],
      healthInsights:   {},
    });
  }

  try {
    // ── Folder sizes ──────────────────────────────────────────────────────────
    const folderData = await outlookFetch(
      auth.token, auth.restUrl,
      "/v2.0/me/MailFolders?$top=50&$select=displayName,totalItemCount,sizeInBytes"
    );

    const folderSizes = (folderData?.value ?? [])
      .filter(f => (f.totalItemCount ?? 0) > 0)
      .map(f => ({
        name:   f.displayName,
        emails: f.totalItemCount ?? 0,
        sizeMB: Math.round((f.sizeInBytes ?? 0) / (1024 * 1024)),
      }))
      .sort((a, b) => b.sizeMB - a.sizeMB)
      .slice(0, 8);

    // ── Recent messages (sender stats + monthly trends) ───────────────────────
    const msgData = await outlookFetch(
      auth.token, auth.restUrl,
      "/v2.0/me/messages?$top=250&$select=from,receivedDateTime,size,isRead"
    );
    const messages = msgData?.value ?? [];

    // Top senders
    const senderMap = new Map();
    for (const m of messages) {
      const addr = m.from?.emailAddress?.address ?? "unknown";
      const name = m.from?.emailAddress?.name  || addr.split("@")[1] || addr;
      const key  = addr.toLowerCase();
      if (!senderMap.has(key)) senderMap.set(key, { name, count: 0, sizeMB: 0 });
      const s = senderMap.get(key);
      s.count++;
      s.sizeMB += Math.round((m.size ?? 0) / (1024 * 1024) * 10) / 10;
    }
    const topSenders = [...senderMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Monthly trends — last 6 months
    const now    = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: d.toLocaleString("default", { month: "short" }), received: 0, sent: 0, _y: d.getFullYear(), _m: d.getMonth() };
    });
    for (const m of messages) {
      const d = new Date(m.receivedDateTime);
      const b = buckets.find(x => x._y === d.getFullYear() && x._m === d.getMonth());
      if (b) b.received++;
    }
    const monthlyTrends = buckets.map(({ _y, _m, ...b }) => b);

    // Storage breakdown from folder sizes
    const totalMB = folderSizes.reduce((s, f) => s + f.sizeMB, 0) || 1;
    const storageBreakdown = folderSizes.slice(0, 5).map(f => ({
      name:  f.name,
      value: Math.max(1, Math.round((f.sizeMB / totalMB) * 100)),
    }));

    // Health insights
    const sixMonthsAgo = new Date(Date.now() - 180 * 86_400_000).toISOString();
    const oldEmails    = messages.filter(m => m.receivedDateTime < sixMonthsAgo).length;
    const oldest       = messages.length
      ? new Date(messages[messages.length - 1].receivedDateTime).getFullYear()
      : null;

    return res.json({
      connected: true,
      folderSizes,
      topSenders,
      monthlyTrends,
      storageBreakdown,
      healthInsights: {
        duplicateEmails:     0,
        newsletters:         0,
        largestAttachmentMB: 0,
        oldestEmailYear:     oldest,
        oldEmails,
      },
    });
  } catch (err) {
    console.error("[analytics] error:", err.message);
    const status = err.status === 401 ? 401 : err.status === 400 ? 400 : 502;
    return res.status(status).json({ error: err.message, connected: false });
  }
});

export default router;
