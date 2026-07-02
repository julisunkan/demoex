/**
 * SignInGate.tsx
 * Replaces PaymentGate. Prompts the user to sign in with Microsoft and
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

export default function SignInGate({ onUnlocked, onDismiss }: Props) {
  const [step,    setStep]   = useState<GateStep>("idle");
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [errMsg,  setErrMsg] = useState("");

  // Try silent sign-in with any cached account
  useEffect(() => {
    (async () => {
      try {
        const cached = await getExistingAccount();
        if (cached) {
          setAccount(cached);
          await verify(cached);
        }
      } catch { /* no cached session */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verify = useCallback(async (acc: AccountInfo) => {
    setStep("checking");
    setErrMsg("");
    try {
      const token = await getAccessToken(acc);
      const sub   = await checkSubscription(token);
      if (sub.subscribed) {
        onUnlocked(sub);
      } else {
        setStep("no-subscription");
      }
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
      if (msg.includes("user_cancelled") || msg.includes("popup_window_error")) {
        setStep("idle");
      } else {
        setErrMsg(msg);
        setStep("error");
      }
    }
  }, [verify]);

  const appSourceUrl = import.meta.env.VITE_APPSOURCE_URL ??
    "https://appsource.microsoft.com";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full bg-white rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Pro Features</p>
            <p className="text-blue-100 text-[10px]">Powered by Microsoft AppSource</p>
          </div>
          <button onClick={onDismiss} className="text-white/70 hover:text-white p-1 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🎨", label: "Highlight Cells",  desc: "Color-code by category" },
              { icon: "📊", label: "Export Reports",   desc: "Full summary export"    },
              { icon: "🔁", label: "Recurring Detect", desc: "Find recurring charges" },
              { icon: "📈", label: "Budget Tracking",  desc: "Set & track budgets"    },
            ].map((f) => (
              <div key={f.label} className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                <p className="text-base mb-0.5">{f.icon}</p>
                <p className="text-xs font-semibold text-blue-800">{f.label}</p>
                <p className="text-[10px] text-blue-600">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Idle / sign-in prompt ── */}
          {(step === "idle" || step === "signing-in") && (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                Sign in with your Microsoft account to access Pro features included in your AppSource subscription.
              </p>

              <button
                onClick={handleSignIn}
                disabled={step === "signing-in"}
                className="w-full flex items-center justify-center gap-2.5 bg-[#0078d4] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#106ebe] transition-colors disabled:opacity-60"
              >
                {step === "signing-in" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    {/* Microsoft logo mark */}
                    <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
                      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-muted-foreground">
                Don't have a subscription?{" "}
                <a
                  href={appSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Get it on AppSource
                </a>
              </p>
            </div>
          )}

          {/* ── Checking subscription ── */}
          {step === "checking" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Verifying subscription…</p>
                {account && (
                  <p className="text-xs text-muted-foreground mt-0.5">{account.username}</p>
                )}
              </div>
            </div>
          )}

          {/* ── No subscription ── */}
          {step === "no-subscription" && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">No active subscription found</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {account?.username && (
                        <span className="block font-medium mb-0.5">{account.username}</span>
                      )}
                      Your Microsoft account doesn't have an active Bank Statement Analyzer subscription.
                    </p>
                  </div>
                </div>
              </div>

              <a
                href={appSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#0078d4] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#106ebe] transition-colors"
              >
                Subscribe on AppSource
              </a>

              <button
                onClick={handleSignIn}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 py-1 transition-colors"
              >
                Sign in with a different account
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-red-700">Something went wrong</p>
                <p className="text-xs text-red-600 mt-0.5 font-mono break-all">{errMsg}</p>
              </div>
              <button
                onClick={() => setStep("idle")}
                className="w-full text-sm font-semibold py-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
