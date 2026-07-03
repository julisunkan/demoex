import { Router } from "express";
const router = Router();

/**
 * GET /api/marketplace/me
 * Returns subscription status for the authenticated user.
 *
 * Production: validate the Bearer token against Microsoft Graph
 * (/me endpoint) and then look up subscription in the Marketplace
 * Fulfillment API v2.
 */
router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const hasToken   = authHeader.startsWith("Bearer ") && authHeader.length > 20;

  if (!hasToken) {
    return res.json({ subscribed: false });
  }

  // Demo mode — in production, decode and validate the JWT, then query:
  // GET https://marketplaceapi.microsoft.com/api/saas/subscriptions?api-version=2018-08-31
  // with the user's tenantId / objectId to find their active subscription.
  res.json({
    subscribed:     true,
    subscriptionId: "sub_demo_12345678",
    planId:         "mailvault-pro-monthly",
    planName:       "MailVault Pro Monthly",
    status:         "Subscribed",
    seats:          10,
    usedSeats:      3,
    trialEnd:       null,
    renewsAt:       "Aug 1, 2025",
  });
});

/**
 * POST /api/marketplace/activate
 * Called after the user lands on the landing page from AppSource.
 * Exchanges the marketplace token for full subscription details.
 *
 * Production flow:
 * 1. POST to Fulfillment API /resolve with the marketplace token
 * 2. Receive subscriptionId + plan details
 * 3. POST /activate to confirm activation
 * 4. Save subscription to DB and grant access
 */
router.post("/activate", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Missing marketplace token" });

  console.log("[marketplace] Activating subscription with token:", token.slice(0, 8) + "…");

  // Production: exchange with Marketplace Fulfillment API
  // POST https://marketplaceapi.microsoft.com/api/saas/subscriptions/resolve?api-version=2018-08-31
  // Headers: { Authorization: "Bearer <AAD_token>", "x-ms-marketplace-token": token }

  const subscriptionId = "sub_" + Date.now();

  // Production: after resolving, POST to activate:
  // POST https://marketplaceapi.microsoft.com/api/saas/subscriptions/{subscriptionId}/activate?api-version=2018-08-31

  res.json({
    ok:             true,
    subscriptionId,
    planId:         "mailvault-pro-monthly",
    planName:       "MailVault Pro Monthly",
    seats:          1,
    message:        "Subscription activated successfully",
  });
});

/**
 * POST /api/marketplace/webhook
 * Receives Microsoft Marketplace SaaS lifecycle webhook events.
 *
 * Events handled:
 *  - Subscribed           → grant access
 *  - Unsubscribed         → revoke access
 *  - SuspendedDueToOverdue → suspend access
 *  - Reinstated           → restore access
 *  - ChangePlan           → update plan features
 *  - ChangeQuantity       → update seat count
 *  - Renewed              → extend subscription term
 *  - Transferred          → update subscription owner
 */
router.post("/webhook", (req, res) => {
  const event = req.body ?? {};

  // Production: validate webhook signature
  // const sig = req.headers["x-ms-marketplace-signature"];
  // if (!validateSignature(sig, req.rawBody, process.env.MARKETPLACE_WEBHOOK_SECRET)) {
  //   return res.status(401).json({ error: "Invalid signature" });
  // }

  const { action, subscriptionId, planId, quantity, offerId, publisherId } = event;
  console.log(`[marketplace/webhook] action=${action} subId=${subscriptionId} plan=${planId}`);

  switch (action) {
    case "Subscribed":
      console.log(`[webhook] New subscription: ${subscriptionId} → plan ${planId}`);
      // TODO: Grant user access, create DB record, send welcome email
      break;

    case "Unsubscribed":
      console.log(`[webhook] Subscription cancelled: ${subscriptionId}`);
      // TODO: Revoke access, mark subscription as cancelled in DB
      break;

    case "SuspendedDueToOverdue":
      console.log(`[webhook] Subscription suspended (payment overdue): ${subscriptionId}`);
      // TODO: Downgrade to read-only / show payment banner
      break;

    case "Reinstated":
      console.log(`[webhook] Subscription reinstated: ${subscriptionId}`);
      // TODO: Restore full access
      break;

    case "ChangePlan":
      console.log(`[webhook] Plan changed: ${subscriptionId} → ${planId}`);
      // TODO: Update features/limits in DB
      break;

    case "ChangeQuantity":
      console.log(`[webhook] Seat count changed: ${subscriptionId} → ${quantity} seats`);
      // TODO: Update seat limit in DB
      break;

    case "Renewed":
      console.log(`[webhook] Subscription renewed: ${subscriptionId}`);
      // TODO: Update renewal date in DB
      break;

    case "Transferred":
      console.log(`[webhook] Subscription transferred: ${subscriptionId}`);
      // TODO: Update subscription owner
      break;

    default:
      console.warn(`[webhook] Unknown action: ${action}`);
  }

  // Microsoft requires a 200 OK within 10 seconds
  res.json({ status: "ok", action, subscriptionId });
});

/**
 * GET /api/marketplace/plans
 * Returns available subscription plans (for the pricing page).
 */
router.get("/plans", (_req, res) => {
  res.json({
    plans: [
      {
        id:          "mailvault-free",
        name:        "Free",
        price:       0,
        period:      "forever",
        seats:       1,
        features:    ["Local storage", "Manual backups", "Basic analytics"],
      },
      {
        id:          "mailvault-pro-monthly",
        name:        "Pro Monthly",
        price:       9.99,
        period:      "month",
        seats:       1,
        trialDays:   14,
        features:    ["All cloud providers", "AES-256 encryption", "Scheduled backups", "AI insights", "Priority support"],
      },
      {
        id:          "mailvault-pro-annual",
        name:        "Pro Annual",
        price:       99.99,
        period:      "year",
        seats:       1,
        trialDays:   14,
        features:    ["Everything in Pro Monthly", "17% discount", "Dedicated account manager", "SLA 99.9%"],
      },
    ],
  });
});

export default router;
