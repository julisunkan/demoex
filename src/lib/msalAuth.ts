/**
 * MSAL helper for Microsoft Graph authentication.
 *
 * The add-in authenticates via MSAL (popup) to get a proper Graph access token.
 * Set VITE_AZURE_CLIENT_ID in your Replit environment to enable Graph access.
 * The Azure app registration must have Mail.Read and Mail.ReadWrite delegated
 * permissions for Microsoft Graph.
 */

import {
  PublicClientApplication,
  type AccountInfo,
  type SilentRequest,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined;
const TENANT_ID = (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined) ?? "common";

export const GRAPH_SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/User.Read",
];

export function isMsalConfigured(): boolean {
  return !!CLIENT_ID;
}

let _instance: PublicClientApplication | null = null;
let _initPromise: Promise<PublicClientApplication | null> | null = null;

async function getInitializedMsal(): Promise<PublicClientApplication | null> {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;
  if (!CLIENT_ID) return null;

  _initPromise = (async () => {
    try {
      const pca = new PublicClientApplication({
        auth: {
          clientId: CLIENT_ID,
          authority: `https://login.microsoftonline.com/${TENANT_ID}`,
          // Use the origin as the redirect; MSAL handles the popup response.
          redirectUri: window.location.origin,
        },
        cache: { cacheLocation: "sessionStorage" },
      });
      await pca.initialize();
      // Handle any redirect response that may be in the URL on load.
      await pca.handleRedirectPromise().catch(() => null);
      _instance = pca;
      return pca;
    } catch (e) {
      console.warn("[MailVault] MSAL initialisation failed:", e);
      _initPromise = null;
      return null;
    }
  })();

  return _initPromise;
}

/**
 * Acquire a Microsoft Graph access token.
 * Tries silent acquisition first; falls back to an interactive popup.
 * Returns null if no Azure client ID is configured or if acquisition fails.
 */
export async function acquireGraphToken(): Promise<string | null> {
  try {
    const pca = await getInitializedMsal();
    if (!pca) return null;

    const accounts = pca.getAllAccounts();
    const silentReq: SilentRequest = {
      scopes:  GRAPH_SCOPES,
      account: accounts[0],
    };

    if (accounts.length > 0) {
      try {
        const result = await pca.acquireTokenSilent(silentReq);
        return result.accessToken;
      } catch (e) {
        // Only show popup if interaction is actually required.
        if (!(e instanceof InteractionRequiredAuthError)) {
          console.warn("[MailVault] Silent token refresh failed:", e);
          return null;
        }
      }
    }

    // Interactive popup — user signs in / consents.
    const result = await pca.acquireTokenPopup({ scopes: GRAPH_SCOPES });
    return result.accessToken;
  } catch (e) {
    console.warn("[MailVault] MSAL token acquisition failed:", e);
    return null;
  }
}

/** Return the currently signed-in account, or null. */
export function getMsalAccount(): AccountInfo | null {
  if (!_instance) return null;
  return _instance.getAllAccounts()[0] ?? null;
}

/** Sign out the current account. */
export async function msalSignOut(): Promise<void> {
  const pca = await getInitializedMsal();
  if (!pca) return;
  const account = pca.getAllAccounts()[0];
  if (account) await pca.logoutPopup({ account }).catch(() => null);
}
