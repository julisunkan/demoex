/**
 * Manages the Office.js context and Microsoft Graph token.
 *
 * Token acquisition strategy:
 *   1. MSAL silent token refresh (no user prompt, uses cached session).
 *   2. MSAL interactive popup (user signs in / consents once).
 *
 * The returned token is a proper Microsoft Graph access token that the
 * backend proxy uses to call https://graph.microsoft.com/v1.0.
 *
 * Requires VITE_AZURE_CLIENT_ID to be set in your Replit environment.
 */

import { acquireGraphToken, isMsalConfigured } from "./msalAuth";

declare const Office: typeof import("@microsoft/office-js");

interface OutlookCtx {
  token: string;
}

let _ctx:         OutlookCtx | null = null;
let _initPromise: Promise<OutlookCtx | null> | null = null;

export function isInOutlook(): boolean {
  try {
    return (
      typeof Office !== "undefined" &&
      Office.context != null &&
      Office.context.mailbox != null
    );
  } catch {
    return false;
  }
}

/** Attempt Graph token acquisition once; resolves with ctx or null. */
async function attemptToken(): Promise<OutlookCtx | null> {
  try {
    const token = await acquireGraphToken();
    if (!token) return null;
    const ctx: OutlookCtx = { token };
    _ctx = ctx;
    return ctx;
  } catch (e) {
    console.warn("[MailVault] Graph token attempt failed:", e);
    return null;
  }
}

export async function initOutlook(): Promise<OutlookCtx | null> {
  if (!isInOutlook()) return null;
  if (_ctx)           return _ctx;
  if (_initPromise)   return _initPromise;
  if (!isMsalConfigured()) {
    console.warn("[MailVault] VITE_AZURE_CLIENT_ID is not set — cannot acquire Graph token.");
    return null;
  }

  _initPromise = (async () => {
    try {
      const ctx = await attemptToken();
      return ctx;
    } finally {
      // Reset so future calls (retry loop) can attempt acquisition again.
      if (!_ctx) _initPromise = null;
    }
  })();

  return _initPromise;
}

/** Returns the stored context (null if not yet initialised or not in Outlook). */
export function getOutlookContext(): OutlookCtx | null {
  return _ctx;
}

/** HTTP headers to attach to every backend API call. */
export function getOutlookHeaders(): Record<string, string> {
  if (!_ctx) return {};
  return {
    "x-outlook-token": _ctx.token,
  };
}

/** Force a token refresh (e.g. after a 401 from the backend). */
export async function refreshOutlookToken(): Promise<OutlookCtx | null> {
  _ctx = null;
  _initPromise = null;
  return initOutlook();
}

/**
 * Starts a background retry loop that keeps trying to acquire the Graph token
 * every `intervalMs` milliseconds until it succeeds.
 *
 * Calls `onConnected` once a token is obtained, so React Query can re-fetch
 * all queries with the freshly-acquired auth headers.
 *
 * Returns a cleanup function — call it when the component unmounts.
 */
export function startOutlookRetry(
  onConnected: () => void,
  intervalMs = 3_000,
): () => void {
  if (!isInOutlook()) return () => {};          // not inside Outlook — no-op
  if (_ctx) { onConnected(); return () => {}; } // already have token
  if (!isMsalConfigured()) return () => {};     // no Azure client ID configured

  let stopped = false;
  let fired   = false;
  let id: ReturnType<typeof setInterval> | null = null;

  const tryConnect = async () => {
    if (stopped || fired) return;
    const ctx = await initOutlook();
    if (ctx && !stopped && !fired) {
      fired = true;
      if (id !== null) { clearInterval(id); id = null; }
      onConnected();
    }
  };

  tryConnect();
  id = setInterval(tryConnect, intervalMs);
  return () => {
    stopped = true;
    if (id !== null) { clearInterval(id); id = null; }
  };
}

export function getMailboxUserEmail(): string | null {
  try {
    if (!isInOutlook()) return null;
    return (Office.context.mailbox as { userProfile?: { emailAddress?: string } }).userProfile?.emailAddress ?? null;
  } catch { return null; }
}

export function getMailboxDisplayName(): string | null {
  try {
    if (!isInOutlook()) return null;
    return (Office.context.mailbox as { userProfile?: { displayName?: string } }).userProfile?.displayName ?? null;
  } catch { return null; }
}

/** Whether Azure Client ID is configured (required for Graph token). */
export { isMsalConfigured };
