---
name: replit-auth
description: "Integrate Replit Auth (OpenID Connect with PKCE) for Express, React+Vite web apps, and optionally Expo React Native mobile apps. Covers auth routes, middleware, web client hook, mobile auth, database schema, and session management. Use when the user asks to add authentication, login, sign-in, or user accounts. If the `clerk_auth` skill is also available, only use this skill when the user explicitly requests Replit Auth, Replit SSO, or sign-in with Replit."
---

# Replit Auth (Legacy Fullstack JS)

This skill is **reference-only** on legacy Fullstack JS stacks.

On the legacy stack, Replit Auth installation, updates, and general configuration are handled by the `javascript_log_in_with_replit` blueprint — not by this skill. The blueprint owns the scaffolded files under `server/replit_integrations/auth/`, `shared/models/auth.ts`, `client/src/hooks/use-auth.ts`, and `client/src/lib/auth-utils.ts`.

## When to Use the Blueprint Instead

Use the `search_integrations` tool with query `"Replit Auth"` to discover and invoke the blueprint whenever the user asks to:

- Add or install Replit Auth for the first time
- Update, reinstall, or refresh the Replit Auth scaffolded files
- Add authentication / login / sign-in / user accounts on a legacy stack

Example:

```
search_integrations(query="Replit Auth")
```

The blueprint installs the required dependencies (`openid-client`, `passport`, `express-session`, `connect-pg-simple`, `memoizee`), copies the integration files into place, and documents how to wire `setupAuth(app)` and `registerAuthRoutes(app)` into the Express app. Do not duplicate any of that setup here.
