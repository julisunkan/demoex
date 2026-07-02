/**
 * msalClient.js
 * Server-to-server Azure AD authentication for the Microsoft Commercial
 * Marketplace SaaS Fulfillment API. Uses the OAuth 2.0 client credentials flow.
 *
 * Required env vars: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 */

const TENANT_ID     = process.env.AZURE_TENANT_ID     || "";
const CLIENT_ID     = process.env.AZURE_CLIENT_ID     || "";
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || "";

// Scope for the SaaS Fulfillment API (fixed value — do not change)
const SAAS_SCOPE = "20e940b3-4c77-4b0b-9a53-9e16a1b010a7/.default";

// In-memory token cache
let _cachedToken  = null;
let _tokenExpires = 0;

/**
 * Get an access token for the SaaS Fulfillment API.
 * Tokens are cached and reused until 5 minutes before expiry.
 */
export async function getSaasApiToken() {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Azure credentials not configured. " +
      "Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET in your environment."
    );
  }

  if (_cachedToken && Date.now() < _tokenExpires - 5 * 60 * 1000) {
    return _cachedToken;
  }

  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         SAAS_SCOPE,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure AD token request failed (${res.status}): ${text}`);
  }

  const data    = await res.json();
  _cachedToken  = data.access_token;
  _tokenExpires = Date.now() + (data.expires_in ?? 3600) * 1000;
  return _cachedToken;
}

/**
 * Validate a Microsoft user access token by calling the Graph /me endpoint.
 * Returns the user profile: { id, displayName, mail, userPrincipalName }.
 * Throws if the token is invalid or expired.
 */
export async function getGraphUser(accessToken) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) throw new Error("Token is invalid or expired");
  if (!res.ok) throw new Error(`Microsoft Graph error: ${res.status}`);

  return res.json();
}

export const configured = () => !!(TENANT_ID && CLIENT_ID && CLIENT_SECRET);
