# MailVault Pro

A self-hosted Microsoft Outlook add-in for enterprise email backup, restore, and analytics. It runs in the Outlook task pane and uses a custom USDT crypto billing model with manual admin approval.

## Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Radix UI, Wouter routing
- **Backend**: Node.js, Express (port 3001)
- **Storage**: Flat JSON files in `server/data/` (ephemeral on cloud hosts — see tech debt)
- **Office integration**: Office.js (Mailbox API 1.1+)

## Running on Replit

```
npm run dev
```

This starts both the Express API (port 3001) and the Vite dev server (port 5000). The Vite dev server proxies `/api/*` to the Express server, so relative URLs work in development.

## Admin portal

Visit `/admin`. With `ADMIN_PASSWORD` unset the portal is open to everyone (development only — it blocks access in production). Set the secret in your environment to enable the password gate.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ADMIN_PASSWORD` | Yes (prod) | Protects the admin portal |
| `SESSION_SECRET` | Yes | Session signing key (already set) |
| `VITE_API_URL` | Render only | Backend URL when frontend/backend are on separate domains |
| `FRONTEND_URL` | Render only | Frontend URL for CORS allow-list in production |
| `SMTP_*` | No | Email notifications |

## Render deployment

1. Set `ADMIN_PASSWORD` and `FRONTEND_URL` on the backend web service.
2. Set `VITE_API_URL` (pointing to the backend) on the frontend static site.
3. Replace `YOUR_DOMAIN` in `manifest.xml` with the real domain.
4. See `DEPLOYMENT_GUIDE.txt` for the full walkthrough.

## Known limitations

- JSON file storage is ephemeral on cloud hosts — data is lost on restart. A database migration is recommended before production use.
- The app is designed for the Outlook task pane; Office.js warnings in a plain browser are expected.

## User preferences

- Admin password will be configured in Render environment variables, not Replit secrets.
