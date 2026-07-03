/**
 * Manages the Office.js callback token and REST URL.
 * When running inside Outlook, getCallbackTokenAsync gives a Bearer token
 * valid for the Outlook REST API (outlook.office365.com/api/v2.0/me/...).
 */

declare const Office: typeof import("@microsoft/office-js");

interface OutlookCtx {
  token:   string;
  restUrl: string;
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

/** Attempt getCallbackTokenAsync once; resolves with ctx or null. */
function attemptToken(): Promise<OutlookCtx | null> {
  return new Promise<OutlookCtx | null>((resolve) => {
    try {
      Office.context.mailbox.getCallbackTokenAsync({ isRest: true }, (result) => {
        // Compare against the string value directly — safer than enum reference
        const succeeded =
          result.status === "succeeded" ||
          result.status === (Office.AsyncResultStatus as { Succeeded: string }).Succeeded;

        if (succeeded && result.value) {
          const ctx: OutlookCtx = {
            token:   result.value as string,
            restUrl: Office.context.mailbox.restUrl,
          };
          _ctx = ctx;
          resolve(ctx);
        } else {
          console.warn(
            "[MailVault] Token attempt failed:",
            (result.error as { message?: string })?.message ?? result.status
          );
          resolve(null);
        }
      });
    } catch (e) {
      console.warn("[MailVault] getCallbackTokenAsync threw:", e);
      resolve(null);
    }
  });
}

export async function initOutlook(): Promise<OutlookCtx | null> {
  if (!isInOutlook()) return null;
  if (_ctx)           return _ctx;
  if (_initPromise)   return _initPromise;

  _initPromise = (async () => {
    // Retry up to 3 times with a short delay between attempts.
    // getCallbackTokenAsync can fail transiently on the first call when the
    // add-in has just loaded.
    const MAX_ATTEMPTS = 3;
    const DELAY_MS     = 800;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const ctx = await attemptToken();
        if (ctx) return ctx;
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[MailVault] Retrying token acquisition (attempt ${attempt + 1}/${MAX_ATTEMPTS})…`);
          await new Promise(r => setTimeout(r, DELAY_MS * attempt));
        }
      }
      console.error("[MailVault] Could not acquire Outlook token after", MAX_ATTEMPTS, "attempts.");
      return null;
    } finally {
      // Reset the promise after failure so future calls (e.g. triggered by
      // the dashboard polling or a manual refresh) can attempt acquisition again.
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
    "x-outlook-token":    _ctx.token,
    "x-outlook-rest-url": _ctx.restUrl,
  };
}

/** Force a token refresh (e.g. after a 401 from the backend). */
export async function refreshOutlookToken(): Promise<OutlookCtx | null> {
  _ctx = null;
  _initPromise = null;
  return initOutlook();
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
