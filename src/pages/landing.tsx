/**
 * landing.tsx — Microsoft AppSource SaaS Landing Page
 *
 * Microsoft redirects here after a user purchases the add-in from AppSource.
 * URL format: /landing?token={marketplace_token}
 *
 * This page is a REQUIRED component of Microsoft AppSource SaaS offers.
 * Configure this URL as the "Landing page URL" in Partner Center.
 *
 * Flow:
 *  1. User clicks "Get it now" on AppSource → Microsoft redirects here with ?token=...
 *  2. User signs in with Microsoft (redirect flow)
 *  3. We call /api/saas/resolve → get subscription details
 *  4. We call /api/saas/activate → activate the subscription
 *  5. Show success screen with instructions to open the Excel add-in
 */

import { useState, useEffect } from "react";
import { getMsalInstance, signInRedirect, loginScopes, getAccessToken } from "../lib/auth";
import type { AccountInfo } from "@azure/msal-browser";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type LandingStep =
  | "init"
  | "needs-signin"
  | "signing-in"
  | "resolving"
  | "activating"
  | "success"
  | "error";

interface ResolvedSub {
  id:          string;
  name?:       string;
  planId?:     string;
  offerId?:    string;
  beneficiary?: { objectId: string; tenantId: string; emailId: string };
  purchaser?:   { objectId: string; tenantId: string; emailId: string };
}

export default function LandingPage() {
  const [step,     setStep]     = useState<LandingStep>("init");
  const [account,  setAccount]  = useState<AccountInfo | null>(null);
  const [resolved, setResolved] = useState<ResolvedSub | null>(null);
  const [errMsg,   setErrMsg]   = useState("");

  // Extract marketplace token from URL
  const marketplaceToken = new URLSearchParams(window.location.search).get("token") ?? "";

  useEffect(() => {
    (async () => {
      if (!marketplaceToken) {
        setErrMsg("No marketplace token found in the URL. This page should only be accessed via AppSource.");
        setStep("error");
        return;
      }

      try {
        const msal = getMsalInstance();
        await msal.initialize();
        // Handle redirect result (user returning after Microsoft sign-in)
        const result = await msal.handleRedirectPromise();
        if (result?.account) {
          setAccount(result.account);
          await runResolveAndActivate(result.account, marketplaceToken);
          return;
        }

        // Check for an existing cached session
        const accounts = msal.getAllAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await runResolveAndActivate(accounts[0], marketplaceToken);
        } else {
          setStep("needs-signin");
        }
      } catch (err: unknown) {
        setErrMsg(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runResolveAndActivate(acc: AccountInfo, token: string) {
    try {
      // Step 1: Resolve the marketplace token
      setStep("resolving");
      const resolveRes = await fetch(`${API_BASE}/api/saas/resolve`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token }),
      });

      if (!resolveRes.ok) {
        const body = await resolveRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Resolve failed (${resolveRes.status})`);
      }

      const sub: ResolvedSub = await resolveRes.json();
      setResolved(sub);

      // Step 2: Activate the subscription (with the user's MS access token for identity)
      setStep("activating");
      const accessToken = await getAccessToken(acc);
      const activateRes = await fetch(`${API_BASE}/api/saas/activate`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subscriptionId: sub.id,
          planId:         sub.planId,
          quantity:       1,
          beneficiary:    sub.beneficiary,
          purchaser:      sub.purchaser,
        }),
      });

      if (!activateRes.ok) {
        const body = await activateRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Activation failed (${activateRes.status})`);
      }

      setStep("success");
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  async function handleSignIn() {
    setStep("signing-in");
    try {
      await signInRedirect();
      // Page will reload after redirect — useEffect handles the result
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <p className="text-white font-bold">Bank Statement Analyzer</p>
              <p className="text-blue-100 text-xs">Excel Add-in · AppSource</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">

          {/* Init / loading */}
          {step === "init" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}

          {/* Needs sign-in */}
          {(step === "needs-signin" || step === "signing-in") && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900">Complete your setup</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Sign in with the Microsoft account used to purchase Bank Statement Analyzer on AppSource.
                </p>
              </div>

              <button
                onClick={handleSignIn}
                disabled={step === "signing-in"}
                className="w-full flex items-center justify-center gap-2.5 bg-[#0078d4] text-white font-semibold py-3 rounded-xl hover:bg-[#106ebe] transition-colors disabled:opacity-60"
              >
                {step === "signing-in" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Redirecting to Microsoft…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                      <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
                      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                Your subscription will be activated automatically after sign-in.
              </p>
            </div>
          )}

          {/* Resolving */}
          {step === "resolving" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Verifying your purchase…</p>
                <p className="text-xs text-gray-500 mt-0.5">Contacting Microsoft Marketplace</p>
              </div>
            </div>
          )}

          {/* Activating */}
          {step === "activating" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Activating your subscription…</p>
                {account && <p className="text-xs text-gray-500 mt-0.5">{account.username}</p>}
                {resolved?.planId && (
                  <p className="text-xs text-blue-600 mt-0.5 font-medium">Plan: {resolved.planId}</p>
                )}
              </div>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-gray-900">Subscription activated!</h1>
                {account && (
                  <p className="text-xs text-gray-500 text-center">
                    Signed in as <span className="font-medium">{account.username}</span>
                  </p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2.5">
                <p className="text-sm font-semibold text-blue-900">Next steps</p>
                {[
                  "Open Microsoft Excel",
                  "Go to Insert → Add-ins → My Add-ins",
                  'Find "Bank Statement Analyzer" and click Open',
                  "Sign in with the same Microsoft account",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-blue-800">{step}</p>
                  </div>
                ))}
              </div>

              {resolved?.planId && (
                <p className="text-xs text-center text-gray-500">
                  Active plan: <span className="font-semibold">{resolved.planId}</span>
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-gray-900">Setup failed</h1>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-700 font-mono break-all">{errMsg}</p>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  If this issue persists, contact{" "}
                  <a href="/support" className="text-blue-600 underline">support</a>
                  {" "}with the error above.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
