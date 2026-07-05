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

import { useEffect, useState } from "react";
import { acquireGraphToken, isMsalConfigured } from "./msalAuth";

declare const Office: typeof import("@microsoft/office-js");

interface OutlookCtx {
  token: string;
}

let _ctx:         OutlookCtx | null = null;
let _initPromise: Promise<OutlookCtx | null> | null = null;

// ── Subscriber pattern so React components re-render when token arrives ──────
const _listeners = new Set<() => void>();

function _notifyListeners() {
  _listeners.forEach(cb => cb());
}

/** React hook — returns true once the Graph token has been acquired. */
export function useIsConnected(): boolean {
  const [connected, setConnected] = useState(() => _ctx !== null);
  useEffect(() => {
    // Sync in case the token arrived before this component mounted.
    setConnected(_ctx !== null);
    const cb = () => setConnected(_ctx !== null);
    _listeners.add(cb);
    return () => { _listeners.delete(cb); };
  }, []);
  return connected;
}

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

/** Synchronous snapshot — use only for non-reactive checks (e.g. guards at call time). */
export function isConnected(): boolean {
  return _ctx !== null;
}

/** Attempt Graph token acquisition once; resolves with ctx or null. */
async function attemptToken(): Promise<OutlookCtx | null> {
  try {
    const token = await acquireGraphToken();
    if (!token) return null;
    const ctx: OutlookCtx = { token };
    _ctx = ctx;
    _notifyListeners();
    return ctx;
  } catch (e) {
    console.warn("[MailVault] Graph token attempt failed:", e);
    return null;
  }
}

export async function initOutlook(): Promise<OutlookCtx | null> {
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

/** Returns the stored context (null if not yet initialised). */
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
  _notifyListeners();
  return initOutlook();
}

/**
 * Starts a background retry loop that keeps trying to acquire the Graph token
 * every `intervalMs` milliseconds until it succeeds.
 *
 * After an interactive popup attempt fails, retries pause for `backoffMs`
 * to avoid hammering the user with repeated popup prompts.
 *
 * Calls `onConnected` once a token is obtained, so React Query can re-fetch
 * all queries with the freshly-acquired auth headers.
 *
 * Returns a cleanup function — call it when the component unmounts.
 */
export function startOutlookRetry(
  onConnected: () => void,
  intervalMs = 3_000,
  backoffMs  = 30_000,
): () => void {
  if (_ctx) { onConnected(); return () => {}; } // already have token
  if (!isMsalConfigured()) return () => {};     // no Azure client ID configured

  let stopped      = false;
  let fired        = false;
  let backoffUntil = 0;
  let id: ReturnType<typeof setInterval> | null = null;

  const tryConnect = async () => {
    if (stopped || fired) return;
    if (Date.now() < backoffUntil) return; // cooling off after popup failure

    const prevCtx = _ctx;
    const ctx = await initOutlook();
    if (stopped || fired) return;

    if (ctx) {
      fired = true;
      if (id !== null) { clearInterval(id); id = null; }
      onConnected();
    } else if (!prevCtx) {
      // Token attempt failed (popup may have been shown and cancelled).
      // Back off to avoid repeated popup storms.
      backoffUntil = Date.now() + backoffMs;
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
