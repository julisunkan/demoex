/**
 * SubscriptionDashboard.tsx
 * Shows the signed-in user's Microsoft AppSource subscription status.
 * Replaces the old USDT license key dashboard.
 */

import { useState, useEffect, useCallback } from "react";
import { getExistingAccount, getAccessToken, checkSubscription, signOut, signInPopup, type SubscriptionInfo } from "../lib/auth";
import type { AccountInfo } from "@azure/msal-browser";

interface Props {
  onStatusChange: (isPro: boolean) => void;
  onSignIn:       () => void; // open SignInGate
}

export default function SubscriptionDashboard({ onStatusChange, onSignIn }: Props) {
  const [account,      setAccount]      = useState<AccountInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const refresh = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const acc = await getExistingAccount();
      if (!acc) {
        setAccount(null);
        setSubscription(null);
        onStatusChange(false);
        return;
      }
      setAccount(acc);
      const token = await getAccessToken(acc);
      const sub   = await checkSubscription(token);
      setSubscription(sub);
      onStatusChange(sub.subscribed);
    } catch {
      onStatusChange(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onStatusChange]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSignOut = useCallback(async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      setTimeout(() => setConfirmLogout(false), 4000);
      return;
    }
    if (account) {
      try { await signOut(account); } catch { /* ignore */ }
    }
    setAccount(null);
    setSubscription(null);
    setConfirmLogout(false);
    onStatusChange(false);
  }, [account, confirmLogout, onStatusChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────

  if (!account) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Not signed in</p>
          <p className="text-xs text-muted-foreground mt-1">
            Sign in with Microsoft to access your AppSource subscription.
          </p>
        </div>
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-2.5 bg-[#0078d4] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#106ebe] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none">
            <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    );
  }

  // ── Signed in, no active subscription ────────────────────────────────────

  const appSourceUrl = import.meta.env.VITE_APPSOURCE_URL ?? "https://appsource.microsoft.com";

  if (!subscription?.subscribed) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 px-4 text-center">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div>
          <p className="font-semibold text-sm text-foreground">No active subscription</p>
          <p className="text-xs text-muted-foreground mt-0.5">{account.username}</p>
        </div>

        <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
          <p className="text-xs font-medium text-amber-800">
            Your Microsoft account doesn't have an active Financial Data Analyzer subscription.
            Subscribe on AppSource to unlock all Pro features.
          </p>
        </div>

        <a
          href={appSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#0078d4] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#106ebe] transition-colors"
        >
          Subscribe on AppSource ↗
        </a>

        <button
          onClick={() => refresh(false)}
          disabled={refreshing}
          className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 py-1 transition-colors"
        >
          {refreshing ? "Checking…" : "I've already subscribed — check again"}
        </button>

        <div className="pt-1 border-t border-border w-full">
          <button
            onClick={handleSignOut}
            className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1.5"
          >
            {confirmLogout ? "⚠ Tap again to confirm sign-out" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  // ── Active subscription ───────────────────────────────────────────────────

  const planLabel = subscription.planId
    ? subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1)
    : "Pro";

  return (
    <div className="px-4 py-5 space-y-4">

      {/* Account + plan card */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-2xl p-4 text-white shadow-md">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg className="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Pro Active</span>
            </div>
            <p className="text-lg font-extrabold text-white">{planLabel}</p>
            <p className="text-[11px] text-blue-200 mt-0.5">{account.username}</p>
          </div>
          <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
            {subscription.status ?? "Active"}
          </span>
        </div>

        {/* Microsoft AppSource badge */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
          <svg className="w-3 h-3" viewBox="0 0 21 21" fill="none">
            <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          <span className="text-[10px] text-blue-100 font-medium">Billed via Microsoft AppSource</span>
        </div>
      </div>

      {/* Included features */}
      <div className="bg-green-50 rounded-xl border border-green-100 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wider">Your Pro features</p>
        {[
          "Analyze & categorize transactions",
          "Highlight cells by category",
          "Export full summary sheet",
          "Budget tracking",
          "Recurring charge detection",
          "Duplicate detection",
        ].map((f) => (
          <div key={f} className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-xs text-green-800">{f}</span>
          </div>
        ))}
      </div>

      {/* Manage subscription */}
      <div className="border border-border rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground">Manage subscription</p>
        <p className="text-[11px] text-muted-foreground">
          Your subscription is managed by Microsoft. To cancel, change plan, or update billing details, visit Microsoft 365.
        </p>
        <a
          href="https://admin.microsoft.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
        >
          Open Microsoft 365 Admin ↗
        </a>
      </div>

      {/* Refresh status */}
      <button
        onClick={() => refresh(false)}
        disabled={refreshing}
        className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 py-1 transition-colors"
      >
        {refreshing ? "Refreshing…" : "Refresh subscription status"}
      </button>

      {/* Sign out */}
      <div className="pt-1 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-2"
        >
          {confirmLogout ? "⚠ Tap again to confirm sign-out" : "Sign out of Microsoft"}
        </button>
      </div>
    </div>
  );
}
