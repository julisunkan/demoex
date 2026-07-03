import { useState } from "react";
import { type AccountInfo } from "@azure/msal-browser";
import { type SubscriptionInfo, formatUserName } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Cloud, HardDrive, Bell, Shield, User,
  CreditCard, Check, ChevronRight, Key,
} from "lucide-react";

interface Props {
  account:      AccountInfo | null;
  subscription: SubscriptionInfo | null;
  onBack:       () => void;
}

type Section = "main" | "storage" | "notifications" | "security" | "account" | "license";

const STORAGE_PROVIDERS = [
  { id: "local",    label: "Local Storage", icon: HardDrive, connected: true,  pro: false },
  { id: "onedrive", label: "OneDrive",       icon: Cloud,     connected: false, pro: true  },
  { id: "azure",    label: "Azure Blob",     icon: Cloud,     connected: false, pro: true  },
  { id: "s3",       label: "Amazon S3",      icon: Cloud,     connected: false, pro: true  },
  { id: "gdrive",   label: "Google Drive",   icon: Cloud,     connected: false, pro: true  },
  { id: "dropbox",  label: "Dropbox",        icon: Cloud,     connected: false, pro: true  },
];

export default function Settings({ account, subscription, onBack }: Props) {
  const { toast } = useToast();
  const [section, setSection] = useState<Section>("main");
  const [connected, setConnected] = useState<Set<string>>(new Set(["local"]));

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
  const name  = formatUserName(account);

  function handleConnect(id: string) {
    if (!isPro && STORAGE_PROVIDERS.find(p => p.id === id)?.pro) {
      toast({ title: "Pro required", description: "Upgrade to connect cloud storage providers.", variant: "destructive" });
      return;
    }
    setConnected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    toast({ title: connected.has(id) ? "Disconnected" : "Connected" });
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
          <div key={id} className="flex items-center gap-3 bg-white border border-border rounded-xl p-3">
            <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold">{label}</p>
                {pro && !isPro && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PRO</span>}
              </div>
              {connected.has(id) && <p className="text-[10px] text-green-600 font-bold">Connected</p>}
            </div>
            <button
              onClick={() => handleConnect(id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                connected.has(id) ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
              }`}
            >
              {connected.has(id) ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
        {id => id === "azure" && isPro && (
          <div className="space-y-2 animate-fade-in-up">
            <Label className="text-[10px] font-bold">Connection String</Label>
            <Input type="password" placeholder="DefaultEndpointsProtocol=https;…" className="text-xs" />
            <Label className="text-[10px] font-bold">Container Name</Label>
            <Input placeholder="mailvault-backups" className="text-xs" />
          </div>
        )}
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

  if (section === "account") return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={() => setSection("main")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">Account</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-sm font-black text-white">{name.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-black">{name}</p>
            <p className="text-xs text-muted-foreground">{account?.username}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Microsoft 365 Account</p>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl divide-y text-xs">
          <Row label="Tenant ID" value={account?.tenantId?.slice(0, 8) + "…" ?? "—"} />
          <Row label="Object ID" value={account?.localAccountId?.slice(0, 8) + "…" ?? "—"} />
          <Row label="Account Type" value="Microsoft 365" />
        </div>
        <div className="text-[10px] text-muted-foreground bg-muted rounded-xl p-2.5">
          MailVault Pro uses Microsoft Identity Platform for secure authentication. Your credentials are never stored.
        </div>
      </div>
    </div>
  );

  if (section === "license") return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b flex items-center gap-2">
        <button onClick={() => setSection("main")} className="p-1.5 rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black">License & Subscription</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isPro ? (
          <>
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-4 text-white space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <p className="font-black">Pro License — Active</p>
              </div>
              <p className="text-xs opacity-80">Plan: {subscription?.planName ?? "MailVault Pro Monthly"}</p>
              {subscription?.seats && <p className="text-xs opacity-80">{subscription.usedSeats ?? 1} of {subscription.seats} seats used</p>}
              {subscription?.renewsAt && <p className="text-xs opacity-80">Renews: {subscription.renewsAt}</p>}
            </div>
            <div className="bg-white border border-border rounded-xl divide-y text-xs">
              <Row label="Status"        value="✅ Active" />
              <Row label="Plan"          value={subscription?.planName ?? "Monthly"} />
              <Row label="Subscription"  value={subscription?.subscriptionId?.slice(0, 8) + "…" ?? "—"} />
            </div>
            <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer" className="block text-center text-xs font-bold text-primary py-2">
              Manage on Microsoft AppSource →
            </a>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-center space-y-2">
              <p className="text-sm font-black text-amber-800">Free Plan</p>
              <p className="text-xs text-amber-700">Upgrade to Pro to unlock all features</p>
            </div>
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
            <a href="/landing" className="block w-full text-center bg-primary text-white font-bold text-sm py-3 rounded-xl">
              Upgrade to Pro on AppSource
            </a>
          </div>
        )}
      </div>
    </div>
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
          { id: "account",       icon: User,        label: "Account",                 desc: "Your Microsoft account info" },
          { id: "license",       icon: CreditCard,  label: "License & Subscription",  desc: isPro ? "Pro — Active" : "Free Plan — Upgrade" },
        ].map(({ id, icon: Icon, label, desc }) => (
          <button
            key={id}
            onClick={() => setSection(id as Section)}
            className="w-full flex items-center gap-3 bg-white border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
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
          <p className="text-[10px] text-muted-foreground">© 2025 MailVault. All rights reserved.</p>
        </div>
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
