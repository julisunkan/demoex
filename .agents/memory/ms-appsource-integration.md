---
name: USDT + license-key billing (replaced Microsoft AppSource/MSAL)
description: Current billing/auth model after removing Microsoft AppSource SaaS fulfillment and MSAL login; what to check when touching billing or docs pages
---

## Current model

- No Microsoft login (MSAL/Azure AD) and no AppSource marketplace billing — both were fully removed.
- Pro is unlocked by either (a) a USDT crypto payment submitted with a tx hash and approved by an admin, or (b) redeeming an admin-issued license key. Format: `MVP-` + 24 hex uppercase chars.
- No database — all state lives in JSON files under `server/data/` (settings, licenses, payments), written via a store helper.
- Admin auth is a single shared password (`ADMIN_PASSWORD` env var, passthrough/no-auth if unset) sent as the `x-admin-password` header; stored client-side in `sessionStorage`.

## Lesson: sweep static/doc pages, not just app flows, when removing a billing integration

When ripping out a SaaS/auth integration (e.g. Microsoft AppSource + MSAL), the core app flow (routes, storage, main pages) is usually fixed first — but marketing and documentation pages (support/FAQ, privacy policy, IT deployment guides) tend to carry deep, easy-to-miss copy about the old model (e.g. "cancel via AppSource", "Azure AD env vars required", "Microsoft webhook signatures").

**Why:** These pages are rarely exercised by manual testing of the primary user flow, so stale references survive multiple rounds of "verification" and only surface on a targeted grep sweep (`AppSource|MSAL|Azure AD|Microsoft sign-in`) across `src/pages`.

**How to apply:** After removing/replacing a billing or auth integration, grep the whole `src` (not just core flow files) for the old provider's name/acronyms and rewrite every hit — including deployment/IT-admin guides, privacy policy data-sharing clauses, and support FAQ answers — before considering the migration done.

## Environment quirk: Vite watches agent state files

The dev server's file watcher picks up changes to `.local/state/replit/agent/.latest.json` and workflow log files (agent-internal, not app code) and triggers `page reload` events. This can cause screenshot tool captures to intermittently return blank/errored pages due to mid-reload navigation — it's environment noise, not an app bug. Verify via curl/API calls instead of relying solely on screenshots when this happens, and retry the screenshot after activity settles.
