import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID ?? "";
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID ?? "common";

const msalConfig = {
  auth: {
    clientId:    CLIENT_ID || "00000000-0000-0000-0000-000000000000",
    authority:   `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation:          "localStorage" as const,
    storeAuthStateInCookie: false,
  },
};

export const GRAPH_SCOPES = [
  "openid", "profile", "email",
  "User.Read",
  "Mail.Read",
  "Mail.ReadWrite",
  "MailboxSettings.Read",
];

let _msalInstance: PublicClientApplication | null = null;

export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) _msalInstance = new PublicClientApplication(msalConfig);
  return _msalInstance;
}

export async function initializeMsal(): Promise<void> {
  const instance = getMsalInstance();
  await instance.initialize();
  await instance.handleRedirectPromise().catch(() => null);
}

export async function getExistingAccount(): Promise<AccountInfo | null> {
  try {
    const instance = getMsalInstance();
    const accounts = instance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  } catch { return null; }
}

export async function signInPopup(): Promise<AccountInfo> {
  const instance = getMsalInstance();
  const result: AuthenticationResult = await instance.loginPopup({
    scopes: GRAPH_SCOPES,
    prompt: "select_account",
  });
  if (!result.account) throw new Error("Sign-in completed but no account returned");
  return result.account;
}

export async function signOut(account: AccountInfo): Promise<void> {
  const instance = getMsalInstance();
  await instance.logoutPopup({ account });
}

export async function getAccessToken(account: AccountInfo): Promise<string> {
  const instance = getMsalInstance();
  try {
    const result = await instance.acquireTokenSilent({ account, scopes: GRAPH_SCOPES });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await instance.acquireTokenPopup({ account, scopes: GRAPH_SCOPES });
      return result.accessToken;
    }
    throw err;
  }
}

export interface SubscriptionInfo {
  subscribed:      boolean;
  subscriptionId?: string;
  planId?:         string;
  planName?:       string;
  status?:         string;
  seats?:          number;
  usedSeats?:      number;
  trialEnd?:       string;
  renewsAt?:       string;
}

export async function checkSubscription(accessToken: string): Promise<SubscriptionInfo> {
  const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${API}/api/marketplace/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { subscribed: false };
  return res.json();
}

export function formatUserName(account: AccountInfo | null): string {
  return account?.name || account?.username || "User";
}

export function formatUserInitials(account: AccountInfo | null): string {
  const name = formatUserName(account);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
