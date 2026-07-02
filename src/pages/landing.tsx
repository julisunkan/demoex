/**
 * landing.tsx — Microsoft AppSource SaaS Landing Page (bold redesign)
 *
 * Microsoft redirects here after a user purchases the add-in from AppSource.
 * URL format: /landing?token={marketplace_token}
 */

import { useState, useEffect } from "react";
import { getMsalInstance, signInRedirect, getAccessToken } from "../lib/auth";
import type { AccountInfo } from "@azure/msal-browser";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const PLAN_LABELS: Record<string, string> = {
  monthly: "Monthly", annual: "Annual (1 Year)",
};

type LandingStep = "init" | "needs-signin" | "signing-in" | "resolving" | "activating" | "success" | "error";

interface ResolvedSub  { id: string; name?: string; planId?: string; offerId?: string; }
interface ActivationResult { licenseKey: string; expiresAt: string; planId: string; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button
      onClick={copy}
      data-testid="button-copy-license-key"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
        copied ? "bg-green-600 text-white" : "bg-primary text-white hover:opacity-90"
      }`}
    >
      {copied ? (
        <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
      ) : (
        <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
      )}
    </button>
  );
}

function Spinner({ color = "border-primary" }: { color?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className={`w-10 h-10 rounded-full border-4 border-t-transparent animate-spin ${color}`} />
      </div>
    </div>
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
        setStep("error"); return;
      }
      try {
        const msal = getMsalInstance();
        await msal.initialize();
        const result = await msal.handleRedirectPromise();
        if (result?.account) { setAccount(result.account); await runResolveAndActivate(result.account, marketplaceToken); return; }
        const accounts = msal.getAllAccounts();
        if (accounts.length > 0) { setAccount(accounts[0]); await runResolveAndActivate(accounts[0], marketplaceToken); }
        else { setStep("needs-signin"); }
      } catch (err: unknown) { setErrMsg(err instanceof Error ? err.message : String(err)); setStep("error"); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runResolveAndActivate(acc: AccountInfo, token: string) {
    try {
      setStep("resolving");
      const resolveRes = await fetch(`${API_BASE}/api/saas/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!resolveRes.ok) { const b = await resolveRes.json().catch(() => ({})); throw new Error(b.error ?? `Resolve failed (${resolveRes.status})`); }
      const sub: ResolvedSub = await resolveRes.json();
      setResolved(sub);

      setStep("activating");
      const accessToken = await getAccessToken(acc);
      const activateRes = await fetch(`${API_BASE}/api/saas/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ subscriptionId: sub.id }),
      });
      if (!activateRes.ok) { const b = await activateRes.json().catch(() => ({})); throw new Error(b.error ?? `Activation failed (${activateRes.status})`); }
      const act = await activateRes.json();
      setActivation({ licenseKey: act.licenseKey, expiresAt: act.expiresAt, planId: act.planId ?? sub.planId ?? "" });
      setStep("success");
    } catch (err: unknown) { setErrMsg(err instanceof Error ? err.message : String(err)); setStep("error"); }
  }

  async function handleSignIn() {
    setStep("signing-in");
    try { await signInRedirect(); }
    catch (err: unknown) { setErrMsg(err instanceof Error ? err.message : String(err)); setStep("error"); }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-green-100">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 px-6 py-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="flex items-center gap-4 relative">
            <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
              <span className="text-white text-2xl">📊</span>
            </div>
            <div>
              <p className="text-white font-black text-lg tracking-tight">Financial Data Analyzer</p>
              <p className="text-green-100 text-xs font-semibold">Microsoft Excel Add-in · AppSource</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">

          {/* ── Features strip (always visible) ── */}
          {(step === "needs-signin" || step === "signing-in" || step === "init") && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { emoji: "⚡", label: "Auto-categorize", color: "bg-amber-50 border-amber-200 text-amber-700" },
                { emoji: "🎨", label: "Color highlights", color: "bg-green-50 border-green-200 text-green-700" },
                { emoji: "📈", label: "Smart reports",   color: "bg-blue-50 border-blue-200 text-blue-700"   },
              ].map((f) => (
                <div key={f.label} className={`border rounded-xl px-2 py-2.5 text-center animate-fade-in-up ${f.color}`}>
                  <span className="text-lg block mb-1">{f.emoji}</span>
                  <p className="text-[10px] font-black leading-tight">{f.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Init */}
          {step === "init" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner />
              <p className="text-sm text-muted-foreground font-medium">Initializing…</p>
            </div>
          )}

          {/* Sign-in */}
          {(step === "needs-signin" || step === "signing-in") && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-black text-foreground tracking-tight">Complete your setup</h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Sign in with the Microsoft account you used to purchase Financial Data Analyzer on AppSource.
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-3.5 space-y-2.5">
                {[
                  { n: "1", color: "bg-green-500", text: "Sign in with your Microsoft account" },
                  { n: "2", color: "bg-blue-500",  text: "We verify your AppSource purchase" },
                  { n: "3", color: "bg-red-500",   text: "Your license key is generated instantly" },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full ${s.color} text-white text-[10px] font-black flex items-center justify-center shrink-0`}>{s.n}</div>
                    <p className="text-xs text-green-800 font-medium">{s.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSignIn}
                disabled={step === "signing-in"}
                data-testid="button-sign-in-microsoft"
                className="w-full flex items-center justify-center gap-3 bg-[#0078d4] text-white font-black py-3.5 rounded-xl hover:bg-[#106ebe] transition-colors disabled:opacity-60 shadow-md"
              >
                {step === "signing-in" ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Redirecting to Microsoft…</>
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
              <p className="text-xs text-center text-muted-foreground">
                Your license key is generated automatically after sign-in — no extra steps needed.
              </p>
            </div>
          )}

          {/* Resolving */}
          {step === "resolving" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Spinner color="border-blue-500" />
              <div className="text-center">
                <p className="text-base font-black text-foreground">Verifying your purchase…</p>
                <p className="text-sm text-muted-foreground mt-1">Contacting Microsoft Marketplace</p>
              </div>
            </div>
          )}

          {/* Activating */}
          {step === "activating" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Spinner color="border-primary" />
              <div className="text-center">
                <p className="text-base font-black text-foreground">Activating your subscription…</p>
                {account && <p className="text-xs text-muted-foreground mt-1">{account.username}</p>}
                {resolved?.planId && (
                  <span className="inline-block mt-2 text-[11px] font-black px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                    {PLAN_LABELS[resolved.planId] ?? resolved.planId} Plan
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === "success" && activation && (
            <div className="space-y-4 animate-scale-in">
              {/* Success tick */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center shadow-md animate-bounce-check">
                  <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h1 className="text-xl font-black text-foreground tracking-tight">You're all set! 🎉</h1>
                {account && (
                  <p className="text-xs text-muted-foreground">
                    Signed in as <span className="font-bold text-foreground">{account.username}</span>
                  </p>
                )}
              </div>

              {/* License key card */}
              <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-teal-50 p-4 space-y-3" data-testid="card-license-key">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest">Your License Key</p>
                  {activation.planId && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-green-600 text-white shadow-sm">
                      {PLAN_LABELS[activation.planId] ?? activation.planId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-green-200 px-3 py-3 shadow-sm">
                  <code
                    className="flex-1 font-mono text-sm font-black text-foreground tracking-wider select-all break-all"
                    data-testid="text-license-key"
                  >
                    {activation.licenseKey}
                  </code>
                  <CopyButton text={activation.licenseKey} />
                </div>
                {activation.expiresAt && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Valid until <span className="font-black">{fmtDate(activation.expiresAt)}</span>
                  </div>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>📧 Save this key!</strong> Enter it inside the Excel add-in to activate Pro. A copy has been emailed to{" "}
                    <span className="font-bold">{account?.username ?? "your account"}</span>.
                  </p>
                </div>
              </div>

              {/* Next steps */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-black text-foreground">Next steps</p>
                {[
                  { icon: "🖥️", text: "Open Microsoft Excel on your computer" },
                  { icon: "🔌", text: 'Go to Insert → Add-ins → search "Financial Data Analyzer"' },
                  { icon: "▶️", text: "Click Open to launch the add-in in Excel" },
                  { icon: "🔑", text: 'Click "Enter License Key" and paste your key above' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground/80 leading-snug pt-1">{s.icon} {s.text}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Need help?{" "}
                <a href="/support" className="text-primary font-bold underline underline-offset-2">Contact support</a>
              </p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="space-y-4 animate-scale-in">
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center shadow-md">
                  <svg className="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h1 className="text-xl font-black text-foreground">Setup failed</h1>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-700 font-mono break-all leading-relaxed" data-testid="text-error-message">{errMsg}</p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                If this issue persists, contact{" "}
                <a href="/support" className="text-primary font-bold underline">support</a>
                {" "}with the error above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
