/**
 * auth.ts — Microsoft Entra ID (Azure AD) authentication for the Excel add-in.
 *
 * Uses @azure/msal-browser for sign-in inside the taskpane (popup mode).
 * The access token is sent to the backend to validate via Microsoft Graph
 * and check AppSource subscription status.
 *
 * Required env vars (prefix VITE_ for Vite):
 *   VITE_AZURE_CLIENT_ID  — Azure AD app registration client ID
 *   VITE_AZURE_TENANT_ID  — "common" for multi-tenant, or your specific tenant ID
 */

import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";

// ── Configuration ─────────────────────────────────────────────────────────────

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID ?? "";
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID ?? "common";
const API_BASE  = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const msalConfig = {
  auth: {
    clientId:    CLIENT_ID,
    authority:   `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation:       "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginScopes = ["openid", "profile", "email", "User.Read"];

// Lazily created so the config error only surfaces when auth is actually used
let _msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) {
    if (!CLIENT_ID) {
      throw new Error(
        "VITE_AZURE_CLIENT_ID is not set. " +
        "Create an Azure AD app registration and add the client ID to your environment."
      );
    }
    _msalInstance = new PublicClientApplication(msalConfig);
  }
  return _msalInstance;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MsUser {
  id:          string;        // Azure AD object ID
  displayName: string;
  email:       string;
}

export interface SubscriptionInfo {
  subscribed:     boolean;
  subscriptionId?: string;
  planId?:         string;
  status?:         string;
  displayName:     string;
  email:           string;
}

export interface AuthState {
  account:      AccountInfo | null;
  subscription: SubscriptionInfo | null;
  loading:      boolean;
  error:        string | null;
}

// ── MSAL initialization ───────────────────────────────────────────────────────

export async function initializeMsal(): Promise<void> {
  const instance = getMsalInstance();
  await instance.initialize();
  // Handle redirect response (for landing page redirect flow)
  await instance.handleRedirectPromise().catch(() => null);
}

// ── Sign-in ───────────────────────────────────────────────────────────────────

/**
 * Sign in using a popup window (works inside the Office taskpane).
 * Returns the MSAL account info on success.
 */
export async function signInPopup(): Promise<AccountInfo> {
  const instance = getMsalInstance();
  const result: AuthenticationResult = await instance.loginPopup({
    scopes: loginScopes,
    prompt: "select_account",
  });
  if (!result.account) throw new Error("Sign-in completed but no account returned");
  return result.account;
}

/**
 * Sign in using a redirect (for the standalone landing page).
 */
export async function signInRedirect(): Promise<void> {
  const instance = getMsalInstance();
  await instance.loginRedirect({ scopes: loginScopes });
}

// ── Token acquisition ─────────────────────────────────────────────────────────

/**
 * Get a fresh Microsoft Graph access token for the given account.
 * Tries silent first, falls back to popup if interaction is required.
 */
export async function getAccessToken(account: AccountInfo): Promise<string> {
  const instance = getMsalInstance();
  try {
    const result = await instance.acquireTokenSilent({ account, scopes: loginScopes });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await instance.acquireTokenPopup({ account, scopes: loginScopes });
      return result.accessToken;
    }
    throw err;
  }
}

// ── Sign-out ──────────────────────────────────────────────────────────────────

export async function signOut(account: AccountInfo): Promise<void> {
  const instance = getMsalInstance();
  await instance.logoutPopup({ account });
}

// ── Subscription check ────────────────────────────────────────────────────────

/**
 * Call the backend to check whether the signed-in user has an active
 * AppSource subscription. Sends the Microsoft Graph access token.
 */
export async function checkSubscription(accessToken: string): Promise<SubscriptionInfo> {
  const res = await fetch(`${API_BASE}/api/saas/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Subscription check failed (${res.status})`);
  }
  return res.json();
}

// ── Persisted session ─────────────────────────────────────────────────────────

/**
 * Try to silently restore a previous session without prompting the user.
 * Returns the MSAL account if one is cached, null otherwise.
 */
export async function getExistingAccount(): Promise<AccountInfo | null> {
  try {
    const instance  = getMsalInstance();
    const accounts  = instance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
}

/**
 * Full silent restore: get cached account + acquire token + check subscription.
 * Used on add-in startup to restore a previous session without any UI.
 */
export async function restoreSession(): Promise<{
  account: AccountInfo;
  subscription: SubscriptionInfo;
} | null> {
  try {
    const account = await getExistingAccount();
    if (!account) return null;
    const token        = await getAccessToken(account);
    const subscription = await checkSubscription(token);
    return { account, subscription };
  } catch {
    return null;
  }
}
