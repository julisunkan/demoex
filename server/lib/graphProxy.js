import fetch from "node-fetch";

// Allowlist of trusted Outlook REST API hostnames.
// Office.context.mailbox.restUrl returns the base ending with /api,
// e.g. "https://outlook.office.com/api"
const ALLOWED_HOSTS = new Set([
  "outlook.office.com",
  "outlook.office365.com",
  "outlook-sdf.office.com",
]);

/**
 * Validates that a restUrl is a genuine HTTPS Outlook endpoint.
 * Throws a 400-tagged error if the URL fails validation.
 */
function validateRestUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch {
    throw Object.assign(new Error("x-outlook-rest-url is not a valid URL"), { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    throw Object.assign(new Error("x-outlook-rest-url must use HTTPS"), { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw Object.assign(
      new Error(`Untrusted Outlook REST host: ${parsed.hostname}`),
      { status: 400 }
    );
  }
}

/**
 * Calls the Outlook REST API on behalf of the signed-in add-in user.
 *
 * restUrl comes from Office.context.mailbox.restUrl and ends with "/api",
 * e.g. "https://outlook.office.com/api".
 * Paths must therefore start with "/v2.0/me/...", NOT "/api/v2.0/me/...".
 *
 * @param {string} token   - Bearer token from Office.js getCallbackTokenAsync({ isRest: true })
 * @param {string} restUrl - Base REST URL from Office.context.mailbox.restUrl (ends with /api)
 * @param {string} path    - API path, e.g. "/v2.0/me/MailFolders"
 * @param {object} options - Optional fetch options (method, body, headers, …)
 */
export async function outlookFetch(token, restUrl, path, options = {}) {
  validateRestUrl(restUrl);

  // restUrl already ends with "/api"; paths start with "/v2.0/..."
  const base = restUrl.replace(/\/+$/, "");
  const url  = `${base}${path}`;

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
      new Error(`Outlook API ${res.status}: ${body.slice(0, 300)}`),
      { status: res.status }
    );
    throw err;
  }

  return res.json();
}

/**
 * Extracts Outlook auth credentials from incoming request headers.
 * Returns null when the add-in is not connected to Outlook.
 */
export function extractOutlookAuth(req) {
  const token   = req.headers["x-outlook-token"];
  const restUrl = req.headers["x-outlook-rest-url"];
  if (!token || !restUrl) return null;
  return { token, restUrl };
}
