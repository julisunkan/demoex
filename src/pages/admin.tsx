import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  Shield, Users, Building2, Archive, BarChart3,
  Activity, Settings, AlertCircle, CheckCircle2,
  XCircle, Clock, Search, Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type AdminSection = "dashboard" | "organizations" | "users" | "licenses" | "jobs" | "logs";

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
};
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2, running: Clock, failed: XCircle,
  active: CheckCircle2, trial: AlertCircle, expired: XCircle,
};

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [search, setSearch]   = useState("");

  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
  const [authed, setAuthed]   = useState(!adminPassword);
  const [pass, setPass]       = useState("");
  const [passErr, setPassErr] = useState(false);

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
          onKeyDown={e => e.key === "Enter" && (pass === adminPassword ? setAuthed(true) : setPassErr(true))}
          className={passErr ? "border-destructive" : ""}
        />
        {passErr && <p className="text-xs text-destructive">Incorrect password</p>}
        <button onClick={() => pass === adminPassword ? setAuthed(true) : setPassErr(true)}
          className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm">
          Sign In
        </button>
      </div>
    </div>
  );

  const NAV: { id: AdminSection; label: string; icon: typeof Shield }[] = [
    { id: "dashboard",     label: "Dashboard",     icon: BarChart3 },
    { id: "organizations", label: "Organizations", icon: Building2 },
    { id: "users",         label: "Users",         icon: Users },
    { id: "licenses",      label: "Licenses",      icon: Shield },
    { id: "jobs",          label: "Jobs",          icon: Archive },
    { id: "logs",          label: "Audit Logs",    icon: Activity },
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

        {section === "licenses" && (
          <div className="p-6 space-y-4">
            <h1 className="text-xl font-black">License Management</h1>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Seats Sold", value: "15,200", color: "stat-blue"   },
                { label: "Active Seats",     value: "12,847", color: "stat-green"  },
                { label: "Available Seats",  value: "2,353",  color: "stat-purple" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-2xl p-4 ${color}`}>
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-xs opacity-75 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>{["Organization","Plan","Seats","Used","Utilization","Status"].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_ORGS.map(org => {
                    const pct = Math.round((org.users / org.seats) * 100);
                    return (
                      <tr key={org.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-bold">{org.name}</td>
                        <td className="px-4 py-3">{org.plan}</td>
                        <td className="px-4 py-3">{org.seats}</td>
                        <td className="px-4 py-3">{org.users}</td>
                        <td className="px-4 py-3 w-36">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-[10px] font-bold w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[org.status]}`}>{org.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
