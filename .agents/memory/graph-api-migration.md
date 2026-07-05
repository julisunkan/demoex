---
name: Graph API Migration
description: Outlook REST API → Microsoft Graph migration; MSAL token flow and contract changes.
---

## Rule
The Outlook REST API (`outlook.office.com/api/v2.0`) was shut down March 31, 2024.
This project now uses **Microsoft Graph** (`https://graph.microsoft.com/v1.0`) via MSAL browser for all mailbox access.

**Why:** `getCallbackTokenAsync({ isRest: true })` tokens are scoped to `https://outlook.office.com` — not accepted by Graph.

## How to apply
- Token acquisition: `acquireGraphToken()` in `src/lib/msalAuth.ts` — MSAL silent → popup fallback.
- Backend proxy: `graphFetch(token, path, options)` in `server/lib/graphProxy.js` — fixed base URL, no `restUrl` parameter.
- `extractOutlookAuth(req)` returns `{ token }` only (no `restUrl`).
- All routes use `/me/mailFolders` and `/me/messages` (not `/v2.0/me/MailFolders`).
- `VITE_AZURE_CLIENT_ID` must be set for any mailbox access — if missing, UI shows "Azure app not configured".

## Cleanup route contracts
- `GET /api/cleanup/scan` → response fields include `category` (not `reason`).
- `POST /api/cleanup/delete` with `{ ids: string[] }` — replaces old `/api/cleanup/start`.

## Azure setup required by user
Azure app registration needs delegated Graph permissions: `Mail.Read`, `Mail.ReadWrite`, `User.Read`.
Redirect URI type: Single-Page Application pointing to the Replit preview URL.
