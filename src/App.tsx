import { useState, useEffect, useCallback } from "react";
import { type AccountInfo } from "@azure/msal-browser";
import {
  initializeMsal, signInPopup, signOut, getExistingAccount,
  getAccessToken, checkSubscription, formatUserName, formatUserInitials,
  type SubscriptionInfo,
} from "./lib/auth";
import Dashboard    from "./pages/Dashboard";
import BackupWizard from "./pages/BackupWizard";
import RestoreWizard from "./pages/RestoreWizard";
import CleanupWizard from "./pages/CleanupWizard";
import Analytics    from "./pages/Analytics";
import Settings     from "./pages/Settings";
import { useToast }  from "@/hooks/use-toast";
import {
  LayoutDashboard, Archive, RotateCcw, Trash2, BarChart3,
  Settings as SettingsIcon, LogOut, Shield, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Tab = "dashboard" | "backup" | "restore" | "cleanup" | "analytics";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Home",     icon: LayoutDashboard },
  { id: "backup",    label: "Backup",   icon: Archive },
  { id: "restore",   label: "Restore",  icon: RotateCcw },
  { id: "cleanup",   label: "Cleanup",  icon: Trash2 },
  { id: "analytics", label: "Insights", icon: BarChart3 },
];

interface AuthState {
  account:      AccountInfo | null;
  subscription: SubscriptionInfo | null;
  loading:      boolean;
  error:        string | null;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const [auth, setAuth] = useState<AuthState>({
    account: null, subscription: null, loading: true, error: null,
  });

  const restoreSession = useCallback(async () => {
    try {
      await initializeMsal();
      const account = await getExistingAccount();
      if (!account) { setAuth({ account: null, subscription: null, loading: false, error: null }); return; }
      const token = await getAccessToken(account).catch(() => null);
      const sub   = token ? await checkSubscription(token).catch(() => null) : null;
      setAuth({ account, subscription: sub, loading: false, error: null });
    } catch {
      setAuth({ account: null, subscription: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const handleSignIn = async () => {
    setAuth(s => ({ ...s, loading: true, error: null }));
    try {
      const account = await signInPopup();
      const token   = await getAccessToken(account).catch(() => null);
      const sub     = token ? await checkSubscription(token).catch(() => null) : null;
      setAuth({ account, subscription: sub, loading: false, error: null });
      toast({ title: "Signed in", description: `Welcome, ${formatUserName(account)}` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign-in failed";
      setAuth(s => ({ ...s, loading: false, error: msg }));
      toast({ title: "Sign-in failed", description: msg, variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    if (!auth.account) return;
    try {
      await signOut(auth.account);
      setAuth({ account: null, subscription: null, loading: false, error: null });
      toast({ title: "Signed out" });
    } catch {
      toast({ title: "Sign-out error", variant: "destructive" });
    }
  };

  if (auth.loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse-ring">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading MailVault Pro…</p>
      </div>
    );
  }

  if (!auth.account) {
    return <SignInScreen onSignIn={handleSignIn} error={auth.error} />;
  }

  const isPro = auth.subscription?.subscribed ?? false;
  const initials = formatUserInitials(auth.account);
  const displayName = formatUserName(auth.account);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-3 py-2 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-foreground leading-none">MailVault Pro</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">for Outlook</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPro
            ? <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 font-bold">PRO</Badge>
            : <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">FREE</Badge>
          }
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[9px] font-black text-white">{initials}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <div className="px-2 py-1.5">
                <p className="font-bold truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{auth.account.username}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowSettings(true)}>
                <SettingsIcon className="w-3.5 h-3.5" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={handleSignOut}>
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {showSettings
          ? <Settings account={auth.account} subscription={auth.subscription} onBack={() => setShowSettings(false)} />
          : <>
              {tab === "dashboard"  && <Dashboard  account={auth.account} subscription={auth.subscription} onNavigate={setTab} />}
              {tab === "backup"     && <BackupWizard isPro={isPro} />}
              {tab === "restore"    && <RestoreWizard />}
              {tab === "cleanup"    && <CleanupWizard isPro={isPro} />}
              {tab === "analytics"  && <Analytics isPro={isPro} />}
            </>
        }
      </main>

      {/* ── Bottom Nav ── */}
      {!showSettings && (
        <nav className="border-t bg-white shrink-0">
          <div className="flex">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${id}`}
                >
                  <Icon className={`w-4.5 h-4.5 ${active ? "" : ""}`} style={{ width: 18, height: 18 }} />
                  <span className={`text-[10px] font-${active ? "black" : "medium"}`}>{label}</span>
                  {active && <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-t-full" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function SignInScreen({ onSignIn, error }: { onSignIn: () => void; error: string | null }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary via-blue-600 to-secondary px-6 py-10 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tight mb-1">MailVault Pro</h1>
        <p className="text-sm text-blue-100">Enterprise email backup & recovery for Microsoft 365</p>
      </div>

      {/* Features */}
      <div className="p-4 space-y-2">
        {[
          { icon: "💾", title: "Automated Backups",  desc: "Schedule daily, weekly, or monthly backups" },
          { icon: "🔄", title: "One-Click Restore",  desc: "Restore any email, folder, or entire mailbox" },
          { icon: "🗑️", title: "Smart Cleanup",      desc: "Remove duplicates and free up mailbox space" },
          { icon: "🔒", title: "AES-256 Encryption", desc: "Military-grade encryption for all backups" },
          { icon: "📊", title: "Mailbox Analytics",  desc: "Deep insights into your email storage" },
          { icon: "☁️", title: "Multi-Cloud Storage", desc: "Azure, OneDrive, S3, Google Drive & more" },
        ].map((f) => (
          <div key={f.title} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-border">
            <span className="text-lg w-8 text-center">{f.icon}</span>
            <div>
              <p className="text-xs font-bold">{f.title}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sign in */}
      <div className="p-4 pt-0 space-y-3">
        {error && (
          <div className="status-badge-error rounded-xl px-3 py-2 text-xs">{error}</div>
        )}
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-primary/20"
          data-testid="button-sign-in"
        >
          <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none">
            <path d="M0 0h10v10H0zM11 0h10v10H11zM0 11h10v10H0zM11 11h10v10H11z" fill="currentColor" opacity=".6"/>
          </svg>
          Sign in with Microsoft
        </button>
        <p className="text-center text-[10px] text-muted-foreground">
          Sign in with your Microsoft 365 or personal Microsoft account
        </p>
      </div>
    </div>
  );
}
