import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Shield, Users, Building2, Archive, BarChart3,
  Activity, Settings, AlertCircle, CheckCircle2,
  XCircle, Clock, Search, Download, KeyRound, Wallet,
  Plus, Ban, RotateCcw as RestoreIcon, Trash2, Check, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminPassword, setAdminPassword,
  fetchSettings, saveSettings, type SiteSettings, type Plan,
  fetchLicenses, createLicenses, revokeLicense, unrevokeLicense, deleteLicense,
  fetchPayments, approvePayment, rejectPayment,
} from "@/lib/adminApi";

type AdminSection = "dashboard" | "organizations" | "users" | "licenses" | "payments" | "billing-settings" | "jobs" | "logs";

interface OrgRow  { id: string; name: string; users: number; seats: number; plan: string; status: string; storage: string; }
interface UserRow  { id: string; name: string; email: string; org: string; role: string; lastSeen: string; licensed: boolean; }
interface JobRow   { id: string; type: string; user: string; status: string; started: string; duration: string; size: string; }
interface LogRow   { id: string; action: string; user: string; org: string; ts: string; result: string; }

const MOCK_ORGS: OrgRow[] = [
  { id: "o1", name: "Contoso Ltd",       users: 120, seats: 150, plan: "Pro Annual",  status: "active",  storage: "1.2 TB" },
  { id: "o2", name: "Fabrikam Inc",      users: 45,  seats: 50,  plan: "Pro Monthly", status: "active",  storage: "420 GB" },
  { id: "o3", name: "Northwind Traders", users: 8,   seats: 10,  plan: "Pro Monthly", status: "trial",   storage: "84 GB"  },
  { id: "o4", name: "Adventure Works",   users: 230, seats: 250, plan: "Pro Annual",  status: "active",  storage: "3.1 TB" },
  { id: "o5", name: "Woodgrove Bank",    users: 12,  seats: 15,  plan: "Pro Monthly", status: "expired", storage: "140 GB" },
];

const MOCK_USERS: UserRow[] = [
  { id: "u1", name: "Alice Johnson", email: "alice@contoso.com",   org: "Contoso",        role: "Owner",   lastSeen: "Today",     licensed: true  },
  { id: "u2", name: "Bob Smith",     email: "bob@fabrikam.com",    org: "Fabrikam",        role: "Admin",   lastSeen: "Yesterday", licensed: true  },
  { id: "u3", name: "Carol White",   email: "carol@northwind.com", org: "Northwind",       role: "User",    lastSeen: "Jun 28",    licensed: false },
  { id: "u4", name: "David Lee",     email: "david@contoso.com",   org: "Contoso",        role: "Manager", lastSeen: "Today",     licensed: true  },
  { id: "u5", name: "Emma Davis",    email: "emma@adventure.com",  org: "Adventure Works", role: "User",    lastSeen: "Jun 25",    licensed: true  },
];

const MOCK_JOBS: JobRow[] = [
  { id: "j1", type: "Backup",  user: "alice@contoso.com",   status: "completed", started: "Today 3:00 AM",  duration: "7m 12s", size: "1.2 GB" },
  { id: "j2", type: "Cleanup", user: "bob@fabrikam.com",    status: "running",   started: "Today 9:45 AM",  duration: "—",      size: "—" },
  { id: "j3", type: "Restore", user: "david@contoso.com",   status: "completed", started: "Yesterday",      duration: "3m 8s",  size: "420 MB" },
  { id: "j4", type: "Backup",  user: "carol@northwind.com", status: "failed",    started: "Jun 28",         duration: "—",      size: "—" },
  { id: "j5", type: "Backup",  user: "emma@adventure.com",  status: "completed", started: "Jun 27 3:00 AM", duration: "12m 4s", size: "2.1 GB" },
];

const MOCK_LOGS: LogRow[] = [
  { id: "l1", action: "Backup Created",      user: "alice@contoso.com",   org: "Contoso",  ts: "Today 03:07 AM",  result: "success" },
  { id: "l2", action: "User Login",          user: "bob@fabrikam.com",    org: "Fabrikam", ts: "Today 09:41 AM",  result: "success" },
  { id: "l3", action: "Backup Failed",       user: "carol@northwind.com", org: "Northwind",ts: "Jun 28 03:00 AM", result: "error"   },
  { id: "l4", action: "License Renewed",     user: "admin@contoso.com",   org: "Contoso",  ts: "Jun 27 12:00 PM", result: "success" },
  { id: "l5", action: "Emails Deleted (142)",user: "david@contoso.com",   org: "Contoso",  ts: "Jun 26 02:30 PM", result: "success" },
];

const BACKUP_TREND = [
  { day: "Mon", count: 48 }, { day: "Tue", count: 62 }, { day: "Wed", count: 55 },
  { day: "Thu", count: 71 }, { day: "Fri", count: 69 }, { day: "Sat", count: 18 }, { day: "Sun", count: 12 },
];

const STATUS_CLS: Record<string, string> = {
  completed: "status-badge-success", running: "status-badge-info", failed: "status-badge-error",
  active: "status-badge-success",    trial:   "status-badge-warning", expired: "status-badge-error",
  success: "status-badge-success",   error:   "status-badge-error",
  pending: "status-badge-warning",   approved: "status-badge-success", rejected: "status-badge-error",
};
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2, running: Clock, failed: XCircle,
  active: CheckCircle2, trial: AlertCircle, expired: XCircle,
};

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [search, setSearch]   = useState("");
  const { toast } = useToast();

  const [authed, setAuthed]   = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pass, setPass]       = useState("");
  const [passErr, setPassErr] = useState(false);

  const trySignIn = async (candidate: string) => {
    setAdminPassword(candidate);
    try {
      await fetchSettings();
      setAuthed(true);
      setPassErr(false);
    } catch {
      setAdminPassword("");
      setAuthed(false);
      setPassErr(true);
    } finally {
      setCheckingAuth(false);
    }
  };

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const stored = getAdminPassword();
    trySignIn(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-white border border-border rounded-2xl p-8 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black">Admin Portal</p>
            <p className="text-xs text-muted-foreground">MailVault Pro</p>
          </div>
        </div>
        <Input type="password" placeholder="Admin password" value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && trySignIn(pass)}
          className={passErr ? "border-destructive" : ""}
          data-testid="input-admin-password"
        />
        {passErr && <p className="text-xs text-destructive">Incorrect password</p>}
        <button onClick={() => trySignIn(pass)}
          className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm"
          data-testid="button-admin-signin">
          Sign In
        </button>
      </div>
    </div>
  );

  const NAV: { id: AdminSection; label: string; icon: typeof Shield }[] = [
    { id: "dashboard",        label: "Dashboard",       icon: BarChart3 },
    { id: "organizations",    label: "Organizations",   icon: Building2 },
    { id: "users",            label: "Users",           icon: Users },
    { id: "licenses",         label: "Licenses",        icon: KeyRound },
    { id: "payments",         label: "USDT Payments",   icon: Wallet },
    { id: "billing-settings", label: "Billing Settings",icon: Settings },
    { id: "jobs",             label: "Jobs",            icon: Archive },
    { id: "logs",             label: "Audit Logs",      icon: Activity },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-52 bg-sidebar-background text-sidebar-foreground flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black">MailVault Pro</p>
              <p className="text-[10px] opacity-60">Admin Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                section === id ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "hover:bg-sidebar-accent/50"
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <a href="/" className="flex items-center gap-2 text-xs text-sidebar-foreground opacity-60 hover:opacity-100">
            <Settings className="w-3.5 h-3.5" /> Back to Add-in
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {section === "dashboard" && (
          <div className="p-6 space-y-6">
            <h1 className="text-xl font-black">Dashboard</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Organizations",  value: "415",    color: "stat-blue"   },
                { label: "Licensed Users", value: "12,847", color: "stat-purple" },
                { label: "Backups Today",  value: "3,241",  color: "stat-green"  },
                { label: "Failed Jobs",    value: "12",     color: "stat-red"    },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl p-4 ${color}`}>
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-xs opacity-75 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-border rounded-2xl p-4">
              <p className="text-sm font-black mb-4">Backups This Week</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={BACKUP_TREND} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Backups" radius={[4, 4, 0, 0]}>
                    {BACKUP_TREND.map((_, i) => <Cell key={i} fill={i === 3 ? "#0078d4" : "#93c4f0"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
                <p className="text-sm font-black">System Health</p>
                {[
                  { label: "API",     pct: 100, color: "bg-green-500"  },
                  { label: "Storage", pct: 68,  color: "bg-blue-500"   },
                  { label: "Queue",   pct: 12,  color: "bg-amber-500"  },
                  { label: "DB",      pct: 34,  color: "bg-purple-500" },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs"><span>{label}</span><span className="font-bold">{pct}%</span></div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-border rounded-2xl p-4">
                <p className="text-sm font-black mb-3">Recent Jobs</p>
                <div className="space-y-2">
                  {MOCK_JOBS.slice(0, 4).map(j => {
                    const StatusIcon = STATUS_ICON[j.status] ?? Clock;
                    return (
                      <div key={j.id} className="flex items-center gap-2">
                        <StatusIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate">{j.type} — {j.user.split("@")[0]}</p>
                          <p className="text-[9px] text-muted-foreground">{j.started}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_CLS[j.status]}`}>{j.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "organizations" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">Organizations</h1>
              <div className="relative"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input className="pl-8 w-52 text-xs" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>{["Organization","Users","Seats","Plan","Storage","Status"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_ORGS.filter(o => o.name.toLowerCase().includes(search.toLowerCase())).map(org => {
                    const StatusIcon = STATUS_ICON[org.status] ?? Clock;
                    return (
                      <tr key={org.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-bold">{org.name}</td>
                        <td className="px-4 py-3">{org.users}</td>
                        <td className="px-4 py-3">{org.seats}</td>
                        <td className="px-4 py-3">{org.plan}</td>
                        <td className="px-4 py-3">{org.storage}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 w-fit text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[org.status]}`}>
                            <StatusIcon className="w-3 h-3" />{org.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "users" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">Users</h1>
              <div className="relative"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input className="pl-8 w-52 text-xs" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>{["Name","Email","Organization","Role","Last Seen","License"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)).map(user => (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-bold">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">{user.org}</td>
                      <td className="px-4 py-3"><span className="status-badge-info text-[10px] px-2 py-0.5 rounded-full font-bold">{user.role}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{user.lastSeen}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.licensed ? "status-badge-success" : "status-badge-neutral"}`}>
                          {user.licensed ? "Licensed" : "Unlicensed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "licenses" && <LicensesPanel toast={toast} />}
        {section === "payments" && <PaymentsPanel toast={toast} />}
        {section === "billing-settings" && <BillingSettingsPanel toast={toast} />}

        {section === "jobs" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">Job Monitor</h1>
              <button className="flex items-center gap-1.5 text-xs font-bold bg-white border border-border px-3 py-2 rounded-lg hover:bg-muted">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>{["Type","User","Status","Started","Duration","Size"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_JOBS.map(job => (
                    <tr key={job.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-bold">{job.type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{job.user}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[job.status]}`}>{job.status}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{job.started}</td>
                      <td className="px-4 py-3">{job.duration}</td>
                      <td className="px-4 py-3">{job.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "logs" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">Audit Logs</h1>
              <button className="flex items-center gap-1.5 text-xs font-bold bg-white border border-border px-3 py-2 rounded-lg hover:bg-muted">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>{["Action","User","Organization","Timestamp","Result"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_LOGS.map(log => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-bold">{log.action}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.user}</td>
                      <td className="px-4 py-3">{log.org}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.ts}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[log.result]}`}>{log.result}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

type ToastFn = ReturnType<typeof useToast>["toast"];

function LicensesPanel({ toast }: { toast: ToastFn }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/licenses"], queryFn: fetchLicenses });
  const { data: settings } = useQuery({ queryKey: ["/api/admin/settings"], queryFn: fetchSettings });

  const [planId, setPlanId] = useState("");
  const [days, setDays]     = useState("");
  const [count, setCount]   = useState("1");
  const [email, setEmail]   = useState("");

  const createMutation = useMutation({
    mutationFn: () => createLicenses({
      planId,
      days: days.trim() ? Number(days) : null,
      count: Number(count) || 1,
      email: email.trim() || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      toast({ title: "License(s) created", description: `${res.items.length} key(s) generated.` });
      setEmail("");
    },
    onError: (err: Error) => toast({ title: "Failed to create license", description: err.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (key: string) => revokeLicense(key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/licenses"] }); toast({ title: "License revoked" }); },
  });
  const unrevokeMutation = useMutation({
    mutationFn: (key: string) => unrevokeLicense(key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/licenses"] }); toast({ title: "License restored" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (key: string) => deleteLicense(key),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/licenses"] }); toast({ title: "License deleted" }); },
  });

  const plans: Plan[] = settings?.plans ?? [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-black">License Management</h1>

      <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-black">Generate License Keys</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-[10px] font-bold">Plan</Label>
            <select value={planId} onChange={e => setPlanId(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2 py-2 mt-1" data-testid="select-plan">
              <option value="">Select plan…</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-bold">Days (blank = lifetime)</Label>
            <Input value={days} onChange={e => setDays(e.target.value)} placeholder="30" className="text-xs mt-1" data-testid="input-days" />
          </div>
          <div>
            <Label className="text-[10px] font-bold">Count</Label>
            <Input value={count} onChange={e => setCount(e.target.value)} placeholder="1" className="text-xs mt-1" data-testid="input-count" />
          </div>
          <div>
            <Label className="text-[10px] font-bold">Email (optional)</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" className="text-xs mt-1" data-testid="input-license-email" />
          </div>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!planId || createMutation.isPending}
          className="flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-3 py-2 rounded-lg disabled:opacity-40"
          data-testid="button-generate-license"
        >
          <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["License Key","Plan","Issued","Expires","Status","Email","Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : (data?.items ?? []).length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No licenses yet</td></tr>
            ) : (data?.items ?? []).slice().reverse().map(l => (
              <tr key={l.licenseKey} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-mono">{l.licenseKey}</td>
                <td className="px-4 py-3">{l.planId}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(l.issuedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : "Lifetime"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.revoked ? "status-badge-error" : l.activatedAt ? "status-badge-success" : "status-badge-neutral"}`}>
                    {l.revoked ? "Revoked" : l.activatedAt ? "Active" : "Unused"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{l.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {l.revoked
                      ? <button onClick={() => unrevokeMutation.mutate(l.licenseKey)} title="Restore" data-testid={`button-unrevoke-${l.licenseKey}`}><RestoreIcon className="w-3.5 h-3.5 text-green-600" /></button>
                      : <button onClick={() => revokeMutation.mutate(l.licenseKey)} title="Revoke" data-testid={`button-revoke-${l.licenseKey}`}><Ban className="w-3.5 h-3.5 text-amber-600" /></button>
                    }
                    <button onClick={() => deleteMutation.mutate(l.licenseKey)} title="Delete" data-testid={`button-delete-${l.licenseKey}`}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsPanel({ toast }: { toast: ToastFn }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/payments"], queryFn: fetchPayments });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePayment(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/licenses"] });
      toast({ title: "Payment approved", description: `License key: ${res.license.licenseKey}` });
    },
    onError: (err: Error) => toast({ title: "Approval failed", description: err.message, variant: "destructive" }),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectPayment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payments"] }); toast({ title: "Payment rejected" }); },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-black">USDT Payments</h1>
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Submitted","Plan","Price","Tx Hash","From Wallet","Status","License","Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : (data?.items ?? []).length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No payments submitted yet</td></tr>
            ) : (data?.items ?? []).map(p => (
              <tr key={p.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold">{p.planLabel}</td>
                <td className="px-4 py-3">{p.price} USDT</td>
                <td className="px-4 py-3 font-mono max-w-[160px] truncate" title={p.txHash}>{p.txHash}</td>
                <td className="px-4 py-3 font-mono max-w-[140px] truncate">{p.walletFrom ?? "—"}</td>
                <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[p.status]}`}>{p.status}</span></td>
                <td className="px-4 py-3 font-mono">{p.licenseKey ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => approveMutation.mutate(p.id)} title="Approve" data-testid={`button-approve-${p.id}`}>
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                      <button onClick={() => rejectMutation.mutate(p.id)} title="Reject" data-testid={`button-reject-${p.id}`}>
                        <X className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingSettingsPanel({ toast }: { toast: ToastFn }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["/api/admin/settings"], queryFn: fetchSettings });

  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork]             = useState("tron");
  const [plans, setPlans]                 = useState<Plan[]>([]);
  const [hydrated, setHydrated]           = useState(false);

  if (data && !hydrated) {
    setWalletAddress(data.payment.walletAddress);
    setNetwork(data.payment.network);
    setPlans(data.plans);
    setHydrated(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => saveSettings({ payment: { walletAddress, network }, plans }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/billing/config"] });
      toast({ title: "Billing settings saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  function updatePlan(idx: number, field: keyof Plan, value: string) {
    setPlans(prev => prev.map((p, i) => i === idx ? {
      ...p,
      [field]: field === "price" ? Number(value) : field === "days" ? (value.trim() ? Number(value) : null) : value,
    } : p));
  }

  function addPlan() {
    setPlans(prev => [...prev, { id: `plan_${Date.now()}`, label: "New Plan", price: 0, days: 30 }]);
  }

  function removePlan(idx: number) {
    setPlans(prev => prev.filter((_, i) => i !== idx));
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-black">Billing Settings</h1>

      <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-black">USDT Wallet</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold">Wallet Address</Label>
            <Input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} className="text-xs mt-1 font-mono" data-testid="input-wallet-address" />
          </div>
          <div>
            <Label className="text-[10px] font-bold">Network</Label>
            <select value={network} onChange={e => setNetwork(e.target.value)} className="w-full text-xs border border-border rounded-lg px-2 py-2 mt-1" data-testid="select-network">
              <option value="tron">Tron (TRC-20)</option>
              <option value="ethereum">Ethereum (ERC-20)</option>
              <option value="bsc">BNB Smart Chain (BEP-20)</option>
              <option value="solana">Solana</option>
              <option value="polygon">Polygon</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black">Plans</p>
          <button onClick={addPlan} className="flex items-center gap-1 text-xs font-bold text-primary" data-testid="button-add-plan">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>
        {plans.map((p, idx) => (
          <div key={p.id} className="grid grid-cols-5 gap-2 items-end border-b border-border pb-3 last:border-0">
            <div className="col-span-2">
              <Label className="text-[10px] font-bold">Label</Label>
              <Input value={p.label} onChange={e => updatePlan(idx, "label", e.target.value)} className="text-xs mt-1" />
            </div>
            <div>
              <Label className="text-[10px] font-bold">Price (USDT)</Label>
              <Input value={String(p.price)} onChange={e => updatePlan(idx, "price", e.target.value)} className="text-xs mt-1" />
            </div>
            <div>
              <Label className="text-[10px] font-bold">Days (blank=lifetime)</Label>
              <Input value={p.days === null ? "" : String(p.days)} onChange={e => updatePlan(idx, "days", e.target.value)} className="text-xs mt-1" />
            </div>
            <button onClick={() => removePlan(idx)} className="text-xs font-bold text-destructive pb-2" data-testid={`button-remove-plan-${idx}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="text-xs font-bold bg-primary text-white px-4 py-2.5 rounded-lg disabled:opacity-40"
        data-testid="button-save-billing-settings"
      >
        {saveMutation.isPending ? "Saving…" : "Save Billing Settings"}
      </button>
    </div>
  );
}
