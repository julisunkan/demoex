import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  type SubscriptionInfo, type BillingConfig,
  fetchBillingConfig, redeemLicense, submitUsdtPayment,
  storeLicenseKey, clearLicenseKey, formatExpiry, maskLicenseKey,
} from "@/lib/license";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Cloud, HardDrive, Bell, Shield, KeyRound,
  CreditCard, Check, ChevronRight, Key, Copy, Wallet,
} from "lucide-react";

interface Props {
  subscription:         SubscriptionInfo | null;
  onSubscriptionChange: (sub: SubscriptionInfo) => void;
  onBack:               () => void;
}

type Section = "main" | "storage" | "notifications" | "security" | "license";

const STORAGE_PROVIDERS = [
  { id: "local",    label: "Local Storage", icon: HardDrive, connected: true,  pro: false },
  { id: "onedrive", label: "OneDrive",       icon: Cloud,     connected: false, pro: true  },
  { id: "azure",    label: "Azure Blob",     icon: Cloud,     connected: false, pro: true  },
  { id: "s3",       label: "Amazon S3",      icon: Cloud,     connected: false, pro: true  },
  { id: "gdrive",   label: "Google Drive",   icon: Cloud,     connected: false, pro: true  },
  { id: "dropbox",  label: "Dropbox",        icon: Cloud,     connected: false, pro: true  },
];

export default function Settings({ subscription, onSubscriptionChange, onBack }: Props) {
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("main");
  const [connected, setConnected]     = useState<Set<string>>(new Set(["local"]))
  const [expandedProvider, setExpanded] = useState<string | null>(null)
  const [azureConnStr, setAzureConnStr] = useState("")
  const [azureContainer, setAzureContainer] = useState("mailvault-backups")
  const [s3Bucket, setS3Bucket]       = useState("")
  const [s3Region, setS3Region]       = useState("us-east-1");

  // Notification prefs
  const [notifBackupDone,    setNotifBackupDone]    = useState(true);
  const [notifBackupFailed,  setNotifBackupFailed]  = useState(true);
  const [notifStorageFull,   setNotifStorageFull]   = useState(true);
  const [notifLicenseExpiry, setNotifLicenseExpiry] = useState(true);
  const [notifRestoreDone,   setNotifRestoreDone]   = useState(false);

  // Security prefs
  const [autoLock,     setAutoLock]     = useState(true);
  const [auditLog,     setAuditLog]     = useState(true);

  const isPro = subscription?.subscribed ?? false;

  function handleConnect(id: string) {
    if (!isPro && STORAGE_PROVIDERS.find(p => p.id === id)?.pro) {
      toast({ title: "Pro required", description: "Upgrade to connect cloud storage providers.", variant: "destructive" });
      return;
    }
    if (connected.has(id)) {
      setConnected(prev => { const n = new Set(prev); n.delete(id); return n; });
      setExpanded(null);
      toast({ title: "Disconnected", description: `${id} storage removed` });
    } else {
      setExpanded(id);
    }
  }

  function confirmConnect(id: string) {
    setConnected(prev => new Set([...prev, id]));
    setExpanded(null);
    toast({ title: "Connected", description: `${id} storage connected successfully` });
  }

  if (section === "storage") return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={() => setSection("main")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">Storage Providers</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <p className="text-xs text-muted-foreground">Connect storage providers to save your backups to the cloud.</p>
        {STORAGE_PROVIDERS.map(({ id, label, icon: Icon, pro }) => (
          <div key={id} className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold">{label}</p>
                  {pro && !isPro && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PRO</span>}
                </div>
                {connected.has(id)
                  ? <p className="text-[10px] text-green-600 font-bold">✅ Connected</p>
                  : expandedProvider === id
                  ? <p className="text-[10px] text-blue-600 font-bold">Enter credentials below</p>
                  : null
                }
              </div>
              <button
                onClick={() => handleConnect(id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  connected.has(id)
                    ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                }`}
              >
                {connected.has(id) ? "Disconnect" : "Connect"}
              </button>
            </div>

            {/* Azure credentials form */}
            {expandedProvider === "azure" && id === "azure" && (
              <div className="border-t border-border px-3 pb-3 pt-2 space-y-2 bg-blue-50/40 animate-fade-in-up">
                <div>
                  <Label className="text-[10px] font-bold">Connection String</Label>
                  <Input type="password" value={azureConnStr} onChange={e => setAzureConnStr(e.target.value)}
                    placeholder="DefaultEndpointsProtocol=https;AccountName=…" className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Container Name</Label>
                  <Input value={azureContainer} onChange={e => setAzureContainer(e.target.value)}
                    placeholder="mailvault-backups" className="text-xs mt-1" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setExpanded(null)} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
                  <button onClick={() => confirmConnect("azure")} disabled={!azureConnStr.trim()}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-40">
                    Save & Connect
                  </button>
                </div>
              </div>
            )}

            {/* S3 credentials form */}
            {expandedProvider === "s3" && id === "s3" && (
              <div className="border-t border-border px-3 pb-3 pt-2 space-y-2 bg-blue-50/40 animate-fade-in-up">
                <div>
                  <Label className="text-[10px] font-bold">Bucket Name</Label>
                  <Input value={s3Bucket} onChange={e => setS3Bucket(e.target.value)}
                    placeholder="my-mailvault-bucket" className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">Region</Label>
                  <Input value={s3Region} onChange={e => setS3Region(e.target.value)}
                    placeholder="us-east-1" className="text-xs mt-1" />
                </div>
                <p className="text-[10px] text-muted-foreground">AWS credentials are read from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY).</p>
                <div className="flex gap-2">
                  <button onClick={() => setExpanded(null)} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
                  <button onClick={() => confirmConnect("s3")} disabled={!s3Bucket.trim()}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-40">
                    Save & Connect
                  </button>
                </div>
              </div>
            )}

            {/* OAuth providers (OneDrive, GDrive, Dropbox) */}
            {expandedProvider === id && !["azure", "s3", "local"].includes(id) && (
              <div className="border-t border-border px-3 pb-3 pt-2 space-y-2 bg-blue-50/40 animate-fade-in-up">
                <p className="text-[10px] text-muted-foreground">You will be redirected to {label} to authorize access. No passwords are stored.</p>
                <div className="flex gap-2">
                  <button onClick={() => setExpanded(null)} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
                  <button onClick={() => confirmConnect(id)}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">
                    Authorize with {label}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (section === "notifications") return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={() => setSection("main")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">Notifications</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-xs text-muted-foreground">Control when MailVault Pro notifies you.</p>
        {[
          { label: "Backup Completed",    desc: "Get notified when a backup finishes",       state: notifBackupDone,    set: setNotifBackupDone    },
          { label: "Backup Failed",       desc: "Alert when a backup fails",                 state: notifBackupFailed,  set: setNotifBackupFailed  },
          { label: "Storage Almost Full", desc: "Alert at 80% storage usage",                state: notifStorageFull,   set: setNotifStorageFull   },
          { label: "License Expiring",    desc: "30-day and 7-day warning before renewal",   state: notifLicenseExpiry, set: setNotifLicenseExpiry },
          { label: "Restore Completed",   desc: "Get notified when a restore finishes",      state: notifRestoreDone,   set: setNotifRestoreDone   },
        ].map(({ label, desc, state, set }) => (
          <div key={label} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-white">
            <div className="flex-1">
              <p className="text-xs font-bold">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
            <Switch checked={state} onCheckedChange={set} />
          </div>
        ))}
      </div>
    </div>
  );

  if (section === "security") return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={() => setSection("main")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">Security</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          { label: "Auto-lock after idle",     desc: "Lock the add-in after 10 minutes of inactivity", state: autoLock,  set: setAutoLock  },
          { label: "Audit logging",            desc: "Record all backup, restore, and cleanup actions", state: auditLog,  set: setAuditLog  },
        ].map(({ label, desc, state, set }) => (
          <div key={label} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-white">
            <div className="flex-1">
              <p className="text-xs font-bold">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
            <Switch checked={state} onCheckedChange={set} />
          </div>
        ))}
        <div className="bg-white border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs font-bold">API Key</p>
          </div>
          <div className="bg-muted rounded-lg p-2 font-mono text-[10px] break-all text-muted-foreground">
            mv_live_••••••••••••••••••••••••••••••••
          </div>
          <button className="text-[10px] text-primary font-bold">Regenerate API Key</button>
        </div>
        <div className="text-[10px] text-muted-foreground bg-blue-50 border border-blue-100 rounded-xl p-2.5">
          All backups are transmitted over HTTPS. Encrypted backups use AES-256-GCM with PBKDF2 key derivation.
        </div>
      </div>
    </div>
  );

  if (section === "license") return (
    <LicenseSection
      subscription={subscription}
      isPro={isPro}
      onBack={() => setSection("main")}
      onSubscriptionChange={onSubscriptionChange}
    />
  );

  // Main settings menu
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">Settings</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {[
          { id: "storage",       icon: Cloud,       label: "Storage Providers",       desc: "Connect cloud storage for backups" },
          { id: "notifications", icon: Bell,        label: "Notifications",           desc: "Control email and in-app alerts" },
          { id: "security",      icon: Shield,      label: "Security",                desc: "Encryption, audit logs, API keys" },
          { id: "license",       icon: CreditCard,  label: "License & Billing",       desc: isPro ? "Pro — Active" : "Free Plan — Upgrade" },
        ].map(({ id, icon: Icon, label, desc }) => (
          <button
            key={id}
            onClick={() => setSection(id as Section)}
            className="w-full flex items-center gap-3 bg-white border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
            data-testid={`settings-nav-${id}`}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold">{label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-[10px] text-muted-foreground">MailVault Pro v1.0.0</p>
          <p className="text-[10px] text-muted-foreground">© 2026 MailVault. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

function LicenseSection({
  subscription, isPro, onBack, onSubscriptionChange,
}: {
  subscription: SubscriptionInfo | null;
  isPro: boolean;
  onBack: () => void;
  onSubscriptionChange: (sub: SubscriptionInfo) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"usdt" | "key">("usdt");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [walletFrom, setWalletFrom] = useState("");
  const [licenseInput, setLicenseInput] = useState("");
  const [submittedPaymentId, setSubmittedPaymentId] = useState<string | null>(null);

  const { data: billing, isLoading: billingLoading } = useQuery<BillingConfig>({
    queryKey: ["/api/billing/config"],
    queryFn: fetchBillingConfig,
    staleTime: 60_000,
  });

  const redeemMutation = useMutation({
    mutationFn: (key: string) => redeemLicense(key),
    onSuccess: (sub) => {
      storeLicenseKey(licenseInput.trim());
      onSubscriptionChange(sub);
      toast({ title: "License activated", description: `${sub.planLabel ?? "Pro"} is now active.` });
      setLicenseInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Invalid license key", description: err.message, variant: "destructive" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () => submitUsdtPayment({ planId: selectedPlan!, txHash: txHash.trim(), walletFrom: walletFrom.trim() || undefined }),
    onSuccess: (payment) => {
      setSubmittedPaymentId(payment.id);
      toast({ title: "Payment submitted", description: "We'll review your transaction and issue a license key shortly." });
    },
    onError: () => {
      toast({ title: "Submission failed", description: "Could not submit payment. Try again.", variant: "destructive" });
    },
  });

  function copyWallet() {
    if (!billing?.walletAddress) return;
    navigator.clipboard.writeText(billing.walletAddress);
    toast({ title: "Copied", description: "Wallet address copied to clipboard." });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">License & Billing</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isPro ? (
          <>
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-4 text-white space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <p className="font-black">{subscription?.planLabel ?? "Pro License"} — Active</p>
              </div>
              <p className="text-xs opacity-80">Expires: {formatExpiry(subscription?.expiresAt)}</p>
            </div>
            <div className="bg-white border border-border rounded-xl divide-y text-xs">
              <Row label="Status"       value="✅ Active" />
              <Row label="License Key" value={maskLicenseKey(subscription?.licenseKey)} />
              <Row label="Plan"        value={subscription?.planLabel ?? "—"} />
              <Row label="Expires"     value={formatExpiry(subscription?.expiresAt)} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Need to switch keys? Enter a new license key below to replace the active one.
            </p>
            <div className="flex gap-2">
              <Input
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                placeholder="MVP-XXXXXXXXXXXXXXXXXXXXXXXX"
                className="text-xs font-mono"
                data-testid="input-license-key-replace"
              />
              <button
                onClick={() => licenseInput.trim() && redeemMutation.mutate(licenseInput.trim())}
                disabled={!licenseInput.trim() || redeemMutation.isPending}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-40"
                data-testid="button-redeem-license-replace"
              >
                {redeemMutation.isPending ? "…" : "Apply"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center space-y-1">
              <p className="text-sm font-black text-amber-800">Free Plan</p>
              <p className="text-xs text-amber-700">Pay with USDT or enter a license key to unlock Pro</p>
            </div>

            <div className="flex rounded-xl border border-border bg-white p-1">
              <button
                onClick={() => setTab("usdt")}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${tab === "usdt" ? "bg-primary text-white" : "text-muted-foreground"}`}
                data-testid="tab-usdt"
              >
                Pay with USDT
              </button>
              <button
                onClick={() => setTab("key")}
                className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors ${tab === "key" ? "bg-primary text-white" : "text-muted-foreground"}`}
                data-testid="tab-license-key"
              >
                Enter License Key
              </button>
            </div>

            {tab === "usdt" && (
              <div className="space-y-3">
                {billingLoading ? (
                  <div className="h-32 rounded-xl bg-muted animate-pulse" />
                ) : !billing?.walletAddress ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    USDT payments are not configured yet. Please contact the administrator.
                  </p>
                ) : submittedPaymentId ? (
                  <div className="bg-white border border-border rounded-xl p-4 text-center space-y-2">
                    <Check className="w-6 h-6 text-green-600 mx-auto" />
                    <p className="text-xs font-bold">Payment submitted</p>
                    <p className="text-[10px] text-muted-foreground">
                      Reference ID: <span className="font-mono">{submittedPaymentId}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Once the administrator verifies your transaction, you'll receive a license key. Enter it under the "Enter License Key" tab to activate Pro.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-border rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-primary shrink-0" />
                        <p className="text-xs font-bold">Send USDT ({billing.network.toUpperCase()}) to:</p>
                      </div>
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                        <p className="font-mono text-[10px] break-all flex-1">{billing.walletAddress}</p>
                        <button onClick={copyWallet} className="shrink-0" data-testid="button-copy-wallet">
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Select Plan</Label>
                      <div className="space-y-1.5">
                        {(billing.plans ?? []).map((plan) => (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                              selectedPlan === plan.id ? "border-primary bg-primary/5" : "border-border bg-white"
                            }`}
                            data-testid={`plan-${plan.id}`}
                          >
                            <div>
                              <p className="text-xs font-bold">{plan.label}</p>
                              <p className="text-[10px] text-muted-foreground">{plan.days ? `${plan.days} days` : "Lifetime"}</p>
                            </div>
                            <p className="text-xs font-black">{plan.price} USDT</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold">Transaction Hash</Label>
                      <Input
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="0x… or transaction ID"
                        className="text-xs mt-1 font-mono"
                        data-testid="input-tx-hash"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold">Your Wallet Address (optional)</Label>
                      <Input
                        value={walletFrom}
                        onChange={(e) => setWalletFrom(e.target.value)}
                        placeholder="Wallet you sent from"
                        className="text-xs mt-1 font-mono"
                        data-testid="input-wallet-from"
                      />
                    </div>

                    <button
                      onClick={() => paymentMutation.mutate()}
                      disabled={!selectedPlan || !txHash.trim() || paymentMutation.isPending}
                      className="w-full text-xs font-bold py-2.5 rounded-xl bg-primary text-white disabled:opacity-40"
                      data-testid="button-submit-payment"
                    >
                      {paymentMutation.isPending ? "Submitting…" : "Submit Payment for Review"}
                    </button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      After you send USDT, submit the transaction hash above. The administrator will verify it and issue your license key.
                    </p>
                  </>
                )}
              </div>
            )}

            {tab === "key" && (
              <div className="space-y-3">
                <div className="bg-white border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs font-bold">Have a license key?</p>
                  </div>
                  <Input
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="MVP-XXXXXXXXXXXXXXXXXXXXXXXX"
                    className="text-xs font-mono"
                    data-testid="input-license-key"
                  />
                  <button
                    onClick={() => licenseInput.trim() && redeemMutation.mutate(licenseInput.trim())}
                    disabled={!licenseInput.trim() || redeemMutation.isPending}
                    className="w-full text-xs font-bold py-2.5 rounded-xl bg-primary text-white disabled:opacity-40"
                    data-testid="button-redeem-license"
                  >
                    {redeemMutation.isPending ? "Activating…" : "Activate License"}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  License keys are issued by your administrator after purchase or manual approval.
                </p>
              </div>
            )}

            <div className="space-y-1.5 pt-2">
              {[
                "Automated scheduled backups",
                "AES-256 encryption",
                "Cloud storage (Azure, OneDrive, S3)",
                "Incremental backups",
                "AI-powered insights",
                "Multi-user / organization support",
                "Priority support",
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs">
                  <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-bold text-xs">{value}</p>
    </div>
  );
}
