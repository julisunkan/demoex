/**
 * SignInGate.tsx
 * Bold, colorful redesign — prompts the user to sign in with Microsoft and
 * verifies they have an active AppSource subscription before unlocking Pro.
 */

import { useState, useEffect, useCallback } from "react";
import { signInPopup, getAccessToken, checkSubscription, getExistingAccount, type SubscriptionInfo } from "../lib/auth";
import type { AccountInfo } from "@azure/msal-browser";

interface Props {
  onUnlocked: (sub: SubscriptionInfo) => void;
  onDismiss:  () => void;
}

type GateStep = "idle" | "signing-in" | "checking" | "no-subscription" | "error";

const PRO_FEATURES = [
  { icon: "🎨", label: "Color Highlights",     desc: "Color-code cells by category",      color: "bg-green-50  border-green-200  text-green-700"  },
  { icon: "📊", label: "Export Reports",        desc: "Excel sheet, CSV & PDF",            color: "bg-blue-50   border-blue-200   text-blue-700"   },
  { icon: "🔁", label: "Recurring Detector",   desc: "Spot subscriptions automatically",  color: "bg-amber-50  border-amber-200  text-amber-700"  },
  { icon: "💼", label: "Budget Tracker",        desc: "Set & track category budgets",      color: "bg-red-50    border-red-200    text-red-700"    },
  { icon: "🧾", label: "Tax Deduction Tagger", desc: "Tag & total deductible expenses",   color: "bg-purple-50 border-purple-200 text-purple-700" },
  { icon: "📈", label: "Cash Flow Projection", desc: "Forecast next month's net income",  color: "bg-teal-50   border-teal-200   text-teal-700"   },
];

export default function SignInGate({ onUnlocked, onDismiss }: Props) {
  const [step,    setStep]   = useState<GateStep>("idle");
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [errMsg,  setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const cached = await getExistingAccount();
        if (cached) { setAccount(cached); await verify(cached); }
      } catch { /* no cached session */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = useCallback(async (acc: AccountInfo) => {
    setStep("checking");
    setErrMsg("");
    try {
      const token = await getAccessToken(acc);
      const sub   = await checkSubscription(token);
      if (sub.subscribed) { onUnlocked(sub); }
      else { setStep("no-subscription"); }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Subscription check failed.");
      setStep("error");
    }
  }, [onUnlocked]);

  const handleSignIn = useCallback(async () => {
    setStep("signing-in");
    setErrMsg("");
    try {
      const acc = await signInPopup();
      setAccount(acc);
      await verify(acc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("user_cancelled") || msg.includes("popup_window_error")) { setStep("idle"); }
      else { setErrMsg(msg); setStep("error"); }
    }
  }, [verify]);

  const appSourceUrl = import.meta.env.VITE_APPSOURCE_URL ?? "https://appsource.microsoft.com";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-slide-bottom max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 px-5 py-4 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
          <div>
            <p className="text-white font-black text-base tracking-tight">Unlock Pro Features</p>
            <p className="text-green-100 text-[11px] font-medium mt-0.5">Powered by Microsoft AppSource</p>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors shrink-0"
            data-testid="button-dismiss-signin-gate"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-2">
              {PRO_FEATURES.map((f, i) => (
                <div
                  key={f.label}
                  className={`border rounded-xl p-2.5 animate-fade-in-up ${f.color}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <span className="text-xl block mb-1">{f.icon}</span>
                  <p className="text-xs font-black leading-tight">{f.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* ── Idle / sign-in ── */}
            {(step === "idle" || step === "signing-in") && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-green-800 font-medium leading-relaxed">
                    Sign in with your Microsoft account to verify your AppSource subscription and unlock all Pro features instantly.
                  </p>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={step === "signing-in"}
                  data-testid="button-signin-microsoft"
                  className="w-full flex items-center justify-center gap-3 bg-[#0078d4] text-white text-sm font-black py-3 rounded-xl hover:bg-[#106ebe] transition-colors disabled:opacity-60 shadow-md"
                >
                  {step === "signing-in" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in…
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

                <p className="text-[11px] text-center text-muted-foreground">
                  Don't have a subscription?{" "}
                  <a href={appSourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-primary font-bold underline underline-offset-2">
                    Get it on AppSource →
                  </a>
                </p>
              </div>
            )}

            {/* ── Checking ── */}
            {step === "checking" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative">
                  <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/10 animate-pulse-ring" />
                  <div className="w-12 h-12 border-4 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-foreground">Verifying subscription…</p>
                  {account && <p className="text-xs text-muted-foreground mt-1">{account.username}</p>}
                </div>
              </div>
            )}

            {/* ── No subscription ── */}
            {step === "no-subscription" && (
              <div className="space-y-3">
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">⚠️</span>
                    <div>
                      <p className="text-sm font-black text-amber-800">No active subscription found</p>
                      {account?.username && (
                        <p className="text-xs text-amber-700 font-medium mt-0.5">{account.username}</p>
                      )}
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        This Microsoft account doesn't have an active Financial Data Analyzer subscription on AppSource.
                      </p>
                    </div>
                  </div>
                </div>

                <a
                  href={appSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-black py-3 rounded-xl hover:opacity-90 transition-colors shadow-md"
                  data-testid="link-subscribe-appsource"
                >
                  Subscribe on AppSource →
                </a>

                <button
                  onClick={handleSignIn}
                  className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 py-1 transition-colors"
                >
                  Try a different account
                </button>
              </div>
            )}

            {/* ── Error ── */}
            {step === "error" && (
              <div className="space-y-3">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm font-black text-red-700 mb-1">Something went wrong</p>
                  <p className="text-xs text-red-600 font-mono break-all leading-relaxed">{errMsg}</p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="w-full text-sm font-black py-2.5 rounded-xl border-2 border-border hover:bg-muted transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
