---
name: Outlook REST API integration
description: How the add-in connects to the real Outlook REST API via Office.js callback token
---

## The token + URL contract

Office.js `getCallbackTokenAsync({ isRest: true })` gives a Bearer token.
`Office.context.mailbox.restUrl` returns the base ending with `/api`, e.g. `https://outlook.office.com/api`.

**Paths must start with `/v2.0/me/...` — NOT `/api/v2.0/me/...`.**
Doubling the `/api` segment is a silent runtime bug; all Outlook calls will 404.

**Why:** Microsoft docs say restUrl "includes the path up to, but not including, the version". Version segment is `/v2.0/`.

**How to apply:** In `server/lib/graphProxy.js`, `outlookFetch()` builds `base + path` where base = restUrl with trailing slash stripped. All callers pass `/v2.0/me/...`.

## SSRF / token-exfiltration guard

The `x-outlook-rest-url` header is client-supplied. **Always validate** it against the ALLOWED_HOSTS allowlist before making any outbound fetch. Implemented in `graphProxy.validateRestUrl()`.

Allowed Outlook hosts: `outlook.office.com`, `outlook.office365.com`, `outlook-sdf.office.com`.

## defaultQueryFn pattern

`queryClient.ts` sets a `defaultQueryFn` that treats `queryKey[0]` (a string URL) as the fetch target. All `useQuery({ queryKey: ["/api/..."] })` calls without explicit `queryFn` work automatically.

The fetcher injects `x-outlook-token` + `x-outlook-rest-url` headers on every request and retries once after refreshing the token on a 401 response.

## backupFirst in cleanup

When `backupFirst` is true, the cleanup route saves a lightweight pre-deletion snapshot (email subject/sender/date, no bodies) to `backups.json` before deleting. The frontend passes `emailMeta` alongside `emailIds` for this purpose.
