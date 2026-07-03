import { Router } from "express";
const router = Router();

/**
 * GET /api/marketplace/me
 * Returns the subscription status for the authenticated user.
 * In production, validate the Bearer token against Microsoft Graph
 * and look up the subscription in the Marketplace Fulfillment API.
 */
router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const hasToken   = authHeader.startsWith("Bearer ") && authHeader.length > 20;

  if (!hasToken) {
    return res.json({ subscribed: false });
  }

  // Demo: return a mock Pro subscription.
  // Replace with real Microsoft Marketplace Fulfillment API lookup.
  res.json({
    subscribed:      true,
    subscriptionId:  "sub_demo_12345678",
    planId:          "mailvault-pro-monthly",
    planName:        "MailVault Pro Monthly",
    status:          "Subscribed",
    seats:           10,
    usedSeats:       3,
    trialEnd:        null,
    renewsAt:        "Aug 1, 2025",
  });
});

/**
 * POST /api/marketplace/webhook
 * Receives Microsoft Marketplace SaaS webhook events.
 */
router.post("/webhook", (req, res) => {
  const event = req.body;
  console.log("[marketplace] Webhook received:", JSON.stringify(event, null, 2));

  // TODO: validate webhook signature
  // TODO: handle: Subscribed, Unsubscribed, SuspendedDueToOverdue, Reinstated, ChangePlan, ChangeQuantity

  const { action, subscriptionId } = event;
  console.log(`[marketplace] Action=${action} subId=${subscriptionId}`);

  res.json({ status: "ok", message: "Webhook processed" });
});

/**
 * POST /api/marketplace/activate
 * Called after the user lands on the landing page from AppSource.
 * Activates the subscription using the marketplace token.
 */
router.post("/activate", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Missing token" });

  // TODO: Exchange token for subscription details via Marketplace Fulfillment API
  // POST https://marketplaceapi.microsoft.com/api/saas/subscriptions/resolve?api-version=2018-08-31

  console.log("[marketplace] Activating subscription with token:", token.slice(0, 8) + "…");

  res.json({
    ok: true,
    subscriptionId: "sub_demo_" + Date.now(),
    planId: "mailvault-pro-monthly",
    message: "Subscription activated",
  });
});

export default router;
