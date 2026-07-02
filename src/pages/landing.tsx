/**
 * landing.tsx — Microsoft AppSource SaaS Landing Page
 *
 * Microsoft redirects here after a user purchases the add-in from AppSource.
 * URL format: /landing?token={marketplace_token}
 *
 * Flow:
 *  1. User clicks "Get it now" on AppSource → Microsoft redirects here with ?token=...
 *  2. User signs in with Microsoft (redirect flow)
 *  3. We call /api/saas/resolve → get subscription details
 *  4. We call /api/saas/activate → activate the subscription + auto-issue a license key
 *  5. Show success screen with the license key and instructions
 */

import { useState, useEffect } from "react";
import { getMsalInstance, signInRedirect, getAccessToken } from "../lib/auth";
import type { AccountInfo } from "@azure/msal-browser";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const PLAN_LABELS: Record<string, string> = {
  monthly: "Monthly", quarterly: "3-Month", biannual: "6-Month", annual: "Annual",
};

type LandingStep =
  | "init"
  | "needs-signin"
  | "signing-in"
  | "resolving"
  | "activating"
  | "success"
  | "error";

interface ResolvedSub {
  id:       string;
  name?:    string;
  planId?:  string;
  offerId?: string;
}

interface ActivationResult {
  licenseKey: string;
  expiresAt:  string;
  planId:     string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      data-testid="button-copy-license-key"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </>
      )}
    </button>
  );
}

export default function LandingPage() {
  const [step,       setStep]       = useState<LandingStep>("init");
  const [account,   setAccount]    = useState<AccountInfo | null>(null);
  const [resolved,  setResolved]   = useState<ResolvedSub | null>(null);
  const [activation, setActivation] = useState<ActivationResult | null>(null);
  const [errMsg,    setErrMsg]     = useState("");

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
        const result = await msal.handleRedirectPromise();
        if (result?.account) {
          setAccount(result.account);
          await runResolveAndActivate(result.account, marketplaceToken);
          return;
        }
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

      // Step 2: Activate + auto-issue license key
      setStep("activating");
      const accessToken = await getAccessToken(acc);
      const activateRes = await fetch(`${API_BASE}/api/saas/activate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ subscriptionId: sub.id }),
      });
      if (!activateRes.ok) {
        const body = await activateRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Activation failed (${activateRes.status})`);
      }
      const act = await activateRes.json();
      setActivation({ licenseKey: act.licenseKey, expiresAt: act.expiresAt, planId: act.planId ?? sub.planId ?? "" });
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
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5">
          <div className="flex items-center gap-3">
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

          {/* Init */}
          {step === "init" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          )}

          {/* Sign-in */}
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
                data-testid="button-sign-in-microsoft"
                className="w-full flex items-center justify-center gap-2.5 bg-[#0078d4] text-white font-semibold py-3 rounded-xl hover:bg-[#106ebe] transition-colors disabled:opacity-60"
              >
                {step === "signing-in" ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Redirecting to Microsoft…</>
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
                Your subscription and license key will be generated automatically after sign-in.
              </p>
            </div>
          )}

          {/* Resolving */}
          {step === "resolving" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Verifying your purchase…</p>
                <p className="text-xs text-gray-500 mt-0.5">Contacting Microsoft Marketplace</p>
              </div>
            </div>
          )}

          {/* Activating */}
          {step === "activating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">Activating your subscription…</p>
                {account && <p className="text-xs text-gray-500 mt-0.5">{account.username}</p>}
                {resolved?.planId && (
                  <p className="text-xs text-blue-600 mt-0.5 font-medium">
                    Plan: {PLAN_LABELS[resolved.planId] ?? resolved.planId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === "success" && activation && (
            <div className="space-y-5">
              {/* Tick + headline */}
              <div className="flex flex-col items-center gap-2 pt-1">
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

              {/* License key card */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 space-y-2" data-testid="card-license-key">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Your License Key</p>
                  {activation.planId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      {PLAN_LABELS[activation.planId] ?? activation.planId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 px-3 py-2.5">
                  <code
                    className="flex-1 font-mono text-sm font-bold text-gray-900 tracking-widest select-all break-all"
                    data-testid="text-license-key"
                  >
                    {activation.licenseKey}
                  </code>
                  <CopyButton text={activation.licenseKey} />
                </div>
                {activation.expiresAt && (
                  <p className="text-xs text-blue-600">
                    Valid until <span className="font-semibold">{fmtDate(activation.expiresAt)}</span>
                  </p>
                )}
                <p className="text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                  <strong>Save this key.</strong> You'll enter it inside the Excel add-in to unlock Pro features. It has been emailed to {account?.username ?? "your Microsoft account"} as well.
                </p>
              </div>

              {/* Next steps */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Next steps</p>
                {[
                  "Open Microsoft Excel",
                  'Go to Insert → Add-ins → search "Bank Statement Analyzer"',
                  "Click Open to launch the add-in",
                  'Click "Enter License Key" and paste your key above',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700">{s}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-gray-400">
                Need help?{" "}
                <a href="/support" className="text-blue-600 underline underline-offset-2">Contact support</a>
              </p>
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
                <p className="text-xs text-red-700 font-mono break-all" data-testid="text-error-message">{errMsg}</p>
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
