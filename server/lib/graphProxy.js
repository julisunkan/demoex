import fetch from "node-fetch";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Calls the Microsoft Graph API on behalf of the signed-in add-in user.
 *
 * @param {string} token   - Bearer token from MSAL (Graph access token)
 * @param {string} path    - Graph API path, e.g. "/me/mailFolders"
 * @param {object} options - Optional fetch options (method, body, headers, …)
 */
export async function graphFetch(token, path, options = {}) {
  const url = `${GRAPH_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return null; // DELETE / empty-body responses

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err  = Object.assign(
      new Error(`Graph API ${res.status}: ${body.slice(0, 300)}`),
      { status: res.status }
    );
    throw err;
  }

  return res.json();
}

/**
 * Extracts the Graph access token from incoming request headers.
 * Returns null when the add-in is not connected (no token present).
 */
export function extractOutlookAuth(req) {
  const token = req.headers["x-outlook-token"];
  if (!token) return null;
  return { token };
}
