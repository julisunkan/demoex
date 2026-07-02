---
name: Microsoft AppSource billing integration
description: How the Microsoft SaaS Fulfillment API + MSAL auth is wired in; trust model, security constraints, missing env vars
---

## Trust model (critical)

- `/api/saas/resolve` — marketplace token authenticates the call (Microsoft-signed); we call Microsoft and cache the result server-side keyed by subscriptionId; only a safe subset is returned to the client.
- `/api/saas/activate` — requires a valid Microsoft user access token validated via Graph (`requireMsAuth`); identity and plan come ONLY from the server-side pending cache, not client-supplied fields.
- `/api/saas/me` — Graph-validates user token; returns subscription status.
- `/api/saas/webhook` — responds 200 immediately; verifies subscription reality with Microsoft before modifying local state.

**Why:** A code review found that trusting client-supplied `beneficiary`/`purchaser` on activate allows entitlement forgery since `/me` authorizes by matching those fields.

## Required env vars (user must set)

- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` — server-side (SaaS Fulfillment API)
- `VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID` — frontend Vite env (MSAL)
- `VITE_APPSOURCE_URL` — AppSource listing URL for subscription links
- `VITE_API_URL` — backend base URL (used in auth.ts and landing.tsx)

## manifest.xml WebApplicationInfo

Replace `YOUR_AZURE_CLIENT_ID` and `YOUR_DOMAIN` placeholders once the user registers their Azure AD app.
Landing page URL for Partner Center: `{VITE_API_URL}/landing`

## Replaced files

- `src/lib/payment.ts` → `src/lib/auth.ts` (MSAL + subscription check)
- `src/components/PaymentGate.tsx` → `src/components/SignInGate.tsx`
- `server/routes/payments.js` → `server/routes/saas.js`
- `server/lib/expiry-checker.js` → removed entirely

## Atomic writes

`subscriptions.json` uses write-to-temp-then-rename to avoid partial-write corruption.

## MSAL init order

`initializeMsal()` must complete before `restoreSession()` — they are chained (`.then()`), not concurrent, to avoid a race where session restore runs before MSAL is initialized.
