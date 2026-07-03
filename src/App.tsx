import { useState, useEffect, useCallback } from "react";
import {
  getStoredLicenseKey, verifyLicense, clearLicenseKey,
  type SubscriptionInfo,
} from "./lib/license";
import Dashboard    from "./pages/Dashboard";
import BackupWizard from "./pages/BackupWizard";
import RestoreWizard from "./pages/RestoreWizard";
import CleanupWizard from "./pages/CleanupWizard";
import Analytics    from "./pages/Analytics";
import Settings     from "./pages/Settings";
import {
  LayoutDashboard, Archive, RotateCcw, Trash2, BarChart3,
  Settings as SettingsIcon, Shield, ChevronDown, KeyRound,
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

interface LicenseState {
  subscription: SubscriptionInfo | null;
  loading:      boolean;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [showSettings, setShowSettings] = useState(false);

  const [state, setState] = useState<LicenseState>({ subscription: null, loading: true });

  const refreshLicense = useCallback(async () => {
    const key = getStoredLicenseKey();
    if (!key) { setState({ subscription: { subscribed: false }, loading: false }); return; }
    const sub = await verifyLicense(key);
    if (!sub.subscribed) clearLicenseKey();
    setState({ subscription: sub, loading: false });
  }, []);

  useEffect(() => { refreshLicense(); }, [refreshLicense]);

  const handleSubscriptionChange = useCallback((sub: SubscriptionInfo) => {
    setState({ subscription: sub, loading: false });
  }, []);

  if (state.loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse-ring">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading MailVault Pro…</p>
      </div>
    );
  }

  const isPro = state.subscription?.subscribed ?? false;

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
              <button
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors"
                data-testid="button-menu"
              >
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <KeyRound className="w-3 h-3 text-white" />
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <div className="px-2 py-1.5">
                <p className="font-bold truncate">{isPro ? "Pro License" : "Free Plan"}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isPro ? state.subscription?.planLabel : "No license activated"}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowSettings(true)} data-testid="menu-settings">
                <SettingsIcon className="w-3.5 h-3.5" /> Settings & License
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {showSettings
          ? <Settings subscription={state.subscription} onSubscriptionChange={handleSubscriptionChange} onBack={() => setShowSettings(false)} />
          : <>
              {tab === "dashboard"  && <Dashboard  subscription={state.subscription} onNavigate={setTab} onOpenSettings={() => setShowSettings(true)} />}
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
