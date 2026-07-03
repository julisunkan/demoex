---
name: MailVault route audit fixes
description: All bugs found and fixed during the full route/code audit of MailVault Pro
---

## Fixes applied

### Backend
- **restore.js** — was a complete stub (random progress, no Outlook API calls). Rewrote with real Outlook REST implementation: conflict=skip/replace/keep all distinct, scope validated (full/folder/email), UUID validation on backupId prevents path traversal, background job with in-memory progress map + jobs.json persistence.
- **settings.js** — was using `let currentSettings` (lost on restart). Changed to `readJson`/`writeJson` with `user-settings.json`.
- **admin.js /summary** — was hardcoded zeros. Now reads licenses.json, jobs.json, backups.json for real counts. `/jobs` route now returns real jobs.json data. `POST /settings` now deep-merges (same as PUT) instead of shallow merge that could corrupt nested objects.
- **backup.js** — sender filter used `contains()` (OData v4 only). Moved JS-side. Date strings now strip milliseconds.

### Frontend
- **license.ts** — `handle()` success path `return res.json()` was unguarded; SyntaxError leaked as toast description. Wrapped in try/catch. All fetch calls now use `apiUrl()` helper that respects `VITE_API_URL` (was using hardcoded relative URLs, broke in production with split frontend/backend domains).
- **adminApi.ts** — same `res.json()` success-path bug. Fixed. Added `fetchSummary`, `fetchJobs`, `AdminSummary`, `JobRecord` exports.
- **admin.tsx** — Dashboard was hardcoded zeros; now uses real `DashboardPanel`/`JobsPanel` components with `useQuery`. `BillingSettingsPanel` was calling `setHydrated(true)` directly in render body (React "state update during render"); moved to `useEffect`.
- **RestoreWizard.tsx** — was faking progress with a 5-second `setTimeout` and always showing success. Replaced with real polling loop matching BackupWizard pattern; only shows success on explicit `status === "completed"`, surfaces timeout/failure to user.

## Security note
Always validate `backupId` as UUID before interpolating into filenames. `readJson`/`writeJson` use `path.join(DATA_DIR, name)` — a crafted `../` backupId would traverse outside `server/data`.
