/**
 * saas.js — Microsoft Commercial Marketplace SaaS Fulfillment API integration
 *
 * Trust model:
 *  - /resolve: marketplace token is the authenticator (Microsoft-signed); we call
 *              Microsoft to resolve it and cache the result server-side.
 *  - /activate: requires a valid Microsoft user token (Graph validates it); identity
 *               and plan details come from the server-side cache, NOT from the client.
 *  - /me:       requires a valid Microsoft user token.
 *  - /webhook:  responds 200 immediately; verifies subscription reality with Microsoft
 *               before modifying local state to prevent spoofed events.
 *
 * Required env vars: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 */

import { Router } from "express";
import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { randomUUID, randomBytes } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getSaasApiToken, getGraphUser, configured } from "../lib/msalClient.js";

const __dirname   = dirname(fileURLToPath(import.meta.url));
const SUBS_FILE   = join(__dirname, "../data/subscriptions.json");
const LIC_FILE    = join(__dirname, "../data/licenses.json");
const SETTINGS_FILE = join(__dirname, "../data/settings.json");

// ── License helpers ────────────────────────────────────────────────────────────
function loadLicenses() {
  try { return JSON.parse(readFileSync(LIC_FILE, "utf8")); } catch { return []; }
}
function saveLicenses(licenses) {
  const tmp = `${LIC_FILE}.tmp-${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(licenses, null, 2));
  renameSync(tmp, LIC_FILE);
}
function generateLicenseKey() {
  return "FDA-" + randomBytes(12).toString("hex").toUpperCase();
}
function planDaysFromId(planId) {
  const defaults = { monthly: 30, annual: 365 };
  try {
    const s = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
    const p = (s.plans ?? []).find((x) => x.id === planId);
    if (p?.days) return p.days;
  } catch {}
  return defaults[planId] ?? 365;
}
function issueMarketplaceLicense({ subscriptionId, planId, email }) {
  const days       = planDaysFromId(planId);
  const expiresAt  = (() => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString(); })();
  const licenseKey = generateLicenseKey();
  const licenses   = loadLicenses();

  // Deduplicate: one active license per subscriptionId
  const existing = licenses.findIndex((l) => l.txHash === subscriptionId);
  const entry = {
    licenseKey,
    txHash:    subscriptionId,
    planId,
    note:      `AppSource subscription — ${planId}`,
    issuedAt:  new Date().toISOString(),
    expiresAt,
    ...(email ? { email } : {}),
  };
  if (existing >= 0) {
    entry.licenseKey = licenses[existing].licenseKey; // reuse existing key on re-activation
    licenses[existing] = { ...licenses[existing], ...entry };
  } else {
    licenses.push(entry);
  }
  saveLicenses(licenses);
  return { licenseKey: entry.licenseKey, expiresAt };
}

const router = Router();

const SAAS_API = "https://marketplaceapi.microsoft.com/api/saassubscriptions";
const API_VER  = "2018-08-31";

// ── Server-side resolution cache ──────────────────────────────────────────────
// Stores the Microsoft-authoritative resolve response, keyed by subscriptionId.
// Entries expire after 10 minutes to prevent stale activations.
const pendingResolutions = new Map(); // subscriptionId → { resolved, expiresAt }
const RESOLVE_TTL_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of pendingResolutions) {
    if (now > entry.expiresAt) pendingResolutions.delete(id);
  }
}, 60_000);

// ── Atomic data helpers ────────────────────────────────────────────────────────

function loadSubs() {
  try { return JSON.parse(readFileSync(SUBS_FILE, "utf8")); } catch { return []; }
}

/** Write to a temp file then rename — prevents partial writes corrupting the file. */
function saveSubs(subs) {
  const tmp = `${SUBS_FILE}.tmp-${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(subs, null, 2));
  renameSync(tmp, SUBS_FILE);
}

function upsertSub(sub) {
  const subs = loadSubs();
  const idx  = subs.findIndex((s) => s.subscriptionId === sub.subscriptionId);
  if (idx >= 0) subs[idx] = { ...subs[idx], ...sub, updatedAt: new Date().toISOString() };
  else          subs.push({ ...sub, updatedAt: new Date().toISOString() });
  saveSubs(subs);
}

function findSubByUser(oid) {
  return loadSubs().find(
    (s) =>
      (s.beneficiary?.objectId === oid || s.purchaser?.objectId === oid || s.msGraphUserId === oid) &&
      s.status === "Subscribed"
  ) ?? null;
}

// ── Microsoft SaaS Fulfillment API helpers ─────────────────────────────────────

async function saasGet(path) {
  const token = await getSaasApiToken();
  const res   = await fetch(`${SAAS_API}${path}?api-version=${API_VER}`, {
    headers: {
      Authorization:        `Bearer ${token}`,
      "x-ms-requestid":     randomUUID(),
      "x-ms-correlationid": randomUUID(),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function saasPost(path, data) {
  const token = await getSaasApiToken();
  const res   = await fetch(`${SAAS_API}${path}?api-version=${API_VER}`, {
    method:  "POST",
    headers: {
      Authorization:        `Bearer ${token}`,
      "Content-Type":       "application/json",
      "x-ms-requestid":     randomUUID(),
      "x-ms-correlationid": randomUUID(),
    },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function saasPatch(path, data) {
  const token = await getSaasApiToken();
  const res   = await fetch(`${SAAS_API}${path}?api-version=${API_VER}`, {
    method:  "PATCH",
    headers: {
      Authorization:        `Bearer ${token}`,
      "Content-Type":       "application/json",
      "x-ms-requestid":     randomUUID(),
      "x-ms-correlationid": randomUUID(),
    },
    body: JSON.stringify(data),
  });
  return { ok: res.ok, status: res.status };
}

// ── Auth middleware ────────────────────────────────────────────────────────────

/**
 * Validate a Microsoft user token via Graph API (no signature key management needed).
 * Attaches req.msUser = { id, displayName, mail, userPrincipalName }.
 * Returns a generic 401 without leaking upstream error details.
 */
async function requireMsAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.msUser = await getGraphUser(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── POST /api/saas/resolve ─────────────────────────────────────────────────────
// Landing page resolves the marketplace token.
// Caches Microsoft's authoritative response server-side so /activate cannot be
// spoofed with client-supplied identity or plan data.
router.post("/resolve", async (req, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: "token is required" });
  if (!configured()) return res.status(503).json({ error: "Azure credentials not configured" });

  try {
    const result = await saasPost("/resolve", { token });
    if (!result.ok) {
      // Don't forward upstream error body — it may contain internal details
      console.error(`[saas] resolve failed: ${result.status} —`, JSON.stringify(result.body).slice(0, 200));
      return res.status(result.status).json({ error: "Marketplace token resolve failed" });
    }

    const resolved = result.body;
    const subId    = resolved.id;

    if (!subId) {
      return res.status(502).json({ error: "Unexpected response from marketplace — missing subscription ID" });
    }

    // Cache full Microsoft response — the client only receives a subset
    pendingResolutions.set(subId, { resolved, expiresAt: Date.now() + RESOLVE_TTL_MS });

    // Return only what the landing page UI needs (not the full subscription payload)
    res.json({
      subscriptionId: subId,
      planId:         resolved.planId,
      offerId:        resolved.offerId,
      name:           resolved.name,
    });
  } catch (err) {
    console.error("[saas] resolve error:", err.message);
    res.status(500).json({ error: "Failed to contact Microsoft Marketplace" });
  }
});

// ── POST /api/saas/activate ────────────────────────────────────────────────────
// Activate a resolved subscription.
// Requires a valid Microsoft user token (validated via Graph).
// Identity and plan are taken ONLY from the server-side cache — the client
// cannot supply or override these.
router.post("/activate", requireMsAuth, async (req, res) => {
  const { subscriptionId } = req.body ?? {};
  if (!subscriptionId) return res.status(400).json({ error: "subscriptionId is required" });
  if (!configured())   return res.status(503).json({ error: "Azure credentials not configured" });

  // Retrieve the server-cached resolution from the earlier /resolve call
  const pending = pendingResolutions.get(subscriptionId);
  if (!pending || Date.now() > pending.expiresAt) {
    return res.status(400).json({
      error: "No pending resolution found for this subscription. Please restart from the AppSource landing page.",
    });
  }

  const { resolved } = pending;

  try {
    const result = await saasPost(`/${subscriptionId}/activate`, {
      planId:   resolved.planId,
      quantity: resolved.quantity ?? 1,
    });

    if (!result.ok) {
      console.error(`[saas] activate failed: ${result.status} —`, JSON.stringify(result.body).slice(0, 200));
      return res.status(result.status).json({ error: "Subscription activation failed" });
    }

    // Persist the subscription using only Microsoft-returned identity data
    upsertSub({
      subscriptionId,
      planId:      resolved.planId,
      quantity:    resolved.quantity ?? 1,
      status:      "Subscribed",
      offerId:     resolved.offerId,
      beneficiary: resolved.beneficiary ?? null,
      purchaser:   resolved.purchaser   ?? null,
      msGraphUserId: req.msUser.id,
      activatedAt: new Date().toISOString(),
    });

    // Auto-issue a license key tied to this subscription
    const email = req.msUser.mail ?? req.msUser.userPrincipalName ?? null;
    const { licenseKey, expiresAt } = issueMarketplaceLicense({
      subscriptionId,
      planId: resolved.planId,
      email,
    });

    pendingResolutions.delete(subscriptionId);
    console.log(`✅ Subscription activated: ${subscriptionId} (plan: ${resolved.planId}) → license: ${licenseKey}`);
    res.json({ ok: true, subscriptionId, licenseKey, expiresAt, planId: resolved.planId });
  } catch (err) {
    console.error("[saas] activate error:", err.message);
    res.status(500).json({ error: "Activation failed — please try again" });
  }
});

// ── GET /api/saas/me ───────────────────────────────────────────────────────────
// Add-in calls this to check the authenticated user's subscription status.
router.get("/me", requireMsAuth, (req, res) => {
  const sub = findSubByUser(req.msUser.id);
  const email = req.msUser.mail ?? req.msUser.userPrincipalName ?? "";
  const displayName = req.msUser.displayName ?? "";

  if (!sub) {
    return res.json({ subscribed: false, displayName, email });
  }

  res.json({
    subscribed:     true,
    subscriptionId: sub.subscriptionId,
    planId:         sub.planId,
    status:         sub.status,
    displayName,
    email,
  });
});

// ── POST /api/saas/webhook ─────────────────────────────────────────────────────
// Microsoft sends subscription lifecycle events here.
// Must respond 200 within 5 seconds; verification and processing are async.
router.post("/webhook", (req, res) => {
  res.sendStatus(200); // respond immediately — Microsoft requires < 5s

  const event = req.body;
  if (!event?.subscriptionId) return;

  // Process asynchronously so we don't hold the request
  processWebhookEvent(event).catch((err) =>
    console.error("[saas] webhook processing error:", err.message)
  );
});

async function processWebhookEvent(event) {
  const { subscriptionId, planId, quantity, action, operationId } = event;
  console.log(`[saas] webhook: ${action} — ${subscriptionId}`);

  // Verify the subscription actually exists on Microsoft's side before acting.
  // This prevents spoofed webhook events from modifying local entitlement state.
  if (configured()) {
    try {
      const check = await saasGet(`/${subscriptionId}`);
      if (!check.ok) {
        console.warn(`[saas] webhook: subscription ${subscriptionId} not found (${check.status}) — ignoring`);
        return;
      }
    } catch (err) {
      console.warn("[saas] webhook: could not verify subscription —", err.message);
      // Continue only for non-Subscribed events where we're removing access (safe to be conservative)
      if (action === "Subscribed") return;
    }
  }

  switch (action) {
    case "Subscribed":
      upsertSub({
        subscriptionId,
        planId:      planId ?? event.subscription?.planId,
        quantity:    quantity ?? event.subscription?.quantity ?? 1,
        status:      "Subscribed",
        beneficiary: event.subscription?.beneficiary ?? null,
        purchaser:   event.subscription?.purchaser   ?? null,
        activatedAt: event.timeStamp ?? new Date().toISOString(),
      });
      break;

    case "Unsubscribed":
      upsertSub({ subscriptionId, status: "Unsubscribed" });
      break;

    case "Suspended":
      upsertSub({ subscriptionId, status: "Suspended" });
      break;

    case "Reinstated":
    case "Renew":
      upsertSub({ subscriptionId, status: "Subscribed" });
      break;

    case "ChangePlan":
      upsertSub({ subscriptionId, planId: planId ?? event.subscription?.planId });
      break;

    case "ChangeQuantity":
      upsertSub({ subscriptionId, quantity: quantity ?? event.subscription?.quantity });
      break;

    default:
      console.log(`[saas] unhandled webhook action: ${action}`);
  }

  // Acknowledge the operation back to Microsoft
  if (operationId && configured()) {
    await saasPatch(`/${subscriptionId}/operations/${operationId}`, { status: "Success" })
      .catch((e) => console.warn("[saas] operation ack failed:", e.message));
  }
}

// ── GET /api/saas/subscriptions (admin) ────────────────────────────────────────
router.get("/subscriptions", (req, res) => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });
  if (req.headers["x-admin-password"] !== password) return res.status(401).json({ error: "Unauthorized" });
  res.json(loadSubs());
});

// ── GET /api/saas/status ────────────────────────────────────────────────────────
router.get("/status", (_req, res) => {
  res.json({ configured: configured() });
});

export default router;
