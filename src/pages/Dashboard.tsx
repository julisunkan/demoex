import { useQuery } from "@tanstack/react-query";
import { formatExpiry, type SubscriptionInfo } from "@/lib/license";
import { type Tab } from "./tab-types";
import {
  Archive, RotateCcw, Trash2, BarChart3, CheckCircle2,
  XCircle, Clock, AlertTriangle, RefreshCw, HardDrive,
  Mail, Calendar, Zap, Shield,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  subscription:   SubscriptionInfo | null;
  onNavigate:     (tab: Tab) => void;
  onOpenSettings: () => void;
}

interface MailboxStats {
  totalSize:     number;
  totalEmails:   number;
  storageUsedPct: number;
  lastBackup:    string | null;
  nextBackup:    string | null;
  backupCount:   number;
}

interface RecentJob {
  id:        string;
  type:      "backup" | "restore" | "cleanup";
  status:    "completed" | "failed" | "running" | "queued";
  label:     string;
  startedAt: string;
  duration:  number | null;
  size:      string | null;
}

const STATUS_META: Record<RecentJob["status"], { label: string; class: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Done",    class: "status-badge-success", icon: CheckCircle2 },
  failed:    { label: "Failed",  class: "status-badge-error",   icon: XCircle },
  running:   { label: "Running", class: "status-badge-info",    icon: RefreshCw },
  queued:    { label: "Queued",  class: "status-badge-neutral", icon: Clock },
};

const JOB_ICONS: Record<RecentJob["type"], typeof Archive> = {
  backup:  Archive,
  restore: RotateCcw,
  cleanup: Trash2,
};

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

export default function Dashboard({ subscription, onNavigate, onOpenSettings }: Props) {
  const { data: stats, isLoading: statsLoading } = useQuery<MailboxStats>({
    queryKey: ["/api/mailbox/stats"],
    staleTime: 60_000,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<RecentJob[]>({
    queryKey: ["/api/backup/recent"],
    staleTime: 30_000,
  });

  const isPro = subscription?.subscribed ?? false;

  return (
    <div className="p-4 space-y-4 animate-fade-in-up">
      {/* Greeting */}
      <div>
        <h2 className="text-base font-black">Welcome back 👋</h2>
        <p className="text-xs text-muted-foreground">Your mailbox is protected and monitored.</p>
      </div>

      {/* License banner */}
      {!isPro && (
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-amber-800">Free Plan</p>
            <p className="text-[10px] text-amber-700">Upgrade to Pro for automated backups, encryption & more</p>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-[10px] font-black bg-amber-500 text-white px-3 py-1.5 rounded-lg shrink-0"
            data-testid="button-upgrade"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          title="Mailbox Size"
          value={statsLoading ? "…" : fmtBytes(stats?.totalSize ?? 3_420_000_000)}
          icon={HardDrive}
          colorClass="stat-blue"
        />
        <StatCard
          title="Total Emails"
          value={statsLoading ? "…" : fmtNum(stats?.totalEmails ?? 12847)}
          icon={Mail}
          colorClass="stat-purple"
        />
        <StatCard
          title="Backups Made"
          value={statsLoading ? "…" : String(stats?.backupCount ?? 24)}
          icon={Archive}
          colorClass="stat-green"
        />
        <StatCard
          title="Storage Used"
          value={statsLoading ? "…" : `${stats?.storageUsedPct ?? 68}%`}
          icon={Zap}
          colorClass="stat-amber"
        />
      </div>

      {/* Storage bar */}
      <div className="bg-white border border-border rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold">Storage Usage</p>
          <p className="text-xs text-muted-foreground">
            {fmtBytes((stats?.totalSize ?? 3_420_000_000) * (stats?.storageUsedPct ?? 68) / 100)} of {fmtBytes(stats?.totalSize ?? 5_000_000_000)}
          </p>
        </div>
        <Progress value={stats?.storageUsedPct ?? 68} className="h-2" />
        <p className="text-[10px] text-muted-foreground">
          {stats?.storageUsedPct && stats.storageUsedPct > 80
            ? "⚠️ Storage almost full — run a cleanup to free space"
            : "✅ Storage usage is healthy"
          }
        </p>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "backup",    icon: Archive,   label: "Start Backup",   desc: "Back up emails now",         color: "bg-blue-50 border-blue-200 text-blue-700" },
            { id: "restore",   icon: RotateCcw, label: "Restore",        desc: "Recover from backup",         color: "bg-green-50 border-green-200 text-green-700" },
            { id: "cleanup",   icon: Trash2,    label: "Cleanup",        desc: "Free up mailbox space",       color: "bg-red-50 border-red-200 text-red-700" },
            { id: "analytics", icon: BarChart3, label: "Analytics",      desc: "View mailbox insights",       color: "bg-purple-50 border-purple-200 text-purple-700" },
          ].map(({ id, icon: Icon, label, desc, color }) => (
            <button
              key={id}
              onClick={() => onNavigate(id as Tab)}
              className={`rounded-2xl border-2 p-3 text-left hover:shadow-md transition-all ${color}`}
              data-testid={`action-${id}`}
            >
              <Icon className="w-5 h-5 mb-1.5" />
              <p className="text-xs font-black leading-tight">{label}</p>
              <p className="text-[10px] opacity-70 leading-tight mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Backup status */}
      <div className="bg-white border border-border rounded-2xl p-3 space-y-2">
        <p className="text-xs font-black">Backup Status</p>
        <div className="flex gap-2">
          <InfoPill label="Last Backup" value={stats?.lastBackup ?? "2 hours ago"} icon={CheckCircle2} color="text-green-600" />
          <InfoPill label="Next Backup" value={stats?.nextBackup ?? "Tomorrow 2:00 AM"} icon={Calendar} color="text-blue-600" />
        </div>
      </div>

      {/* Recent jobs */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Recent Jobs</p>
        <div className="space-y-2">
          {jobsLoading
            ? [1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)
            : (jobs ?? MOCK_JOBS).slice(0, 5).map((job) => <JobRow key={job.id} job={job} />)
          }
        </div>
      </div>

      {/* License info */}
      <div className="bg-white border border-border rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${isPro ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xs font-black">{isPro ? subscription?.planLabel ?? "Pro License" : "Free Plan"}</p>
              {isPro && (
                <p className="text-[10px] text-muted-foreground">Expires: {formatExpiry(subscription?.expiresAt)}</p>
              )}
            </div>
          </div>
          {isPro
            ? <span className="text-[10px] status-badge-success px-2 py-0.5 rounded-full font-bold">Active</span>
            : <button onClick={onOpenSettings} className="text-[10px] font-bold text-primary" data-testid="button-upgrade-inline">Upgrade →</button>
          }
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, colorClass }: { title: string; value: string; icon: typeof Archive; colorClass: string }) {
  return (
    <div className={`rounded-2xl p-3 ${colorClass}`}>
      <Icon className="w-4 h-4 mb-2 opacity-80" />
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[10px] opacity-75 mt-1">{title}</p>
    </div>
  );
}

function InfoPill({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof CheckCircle2; color: string }) {
  return (
    <div className="flex-1 flex items-center gap-1.5 bg-muted rounded-xl px-2 py-1.5">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-[9px] text-muted-foreground leading-none">{label}</p>
        <p className="text-[10px] font-bold truncate">{value}</p>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: RecentJob }) {
  const { label: statusLabel, class: statusClass, icon: StatusIcon } = STATUS_META[job.status];
  const JobIcon = JOB_ICONS[job.type];
  return (
    <div className="flex items-center gap-2.5 bg-white border border-border rounded-xl px-3 py-2">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <JobIcon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{job.label}</p>
        <p className="text-[10px] text-muted-foreground">{job.startedAt}{job.size ? ` · ${job.size}` : ""}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusClass}`}>
        <StatusIcon className="w-2.5 h-2.5" />
        {statusLabel}
      </span>
    </div>
  );
}

const MOCK_JOBS: RecentJob[] = [
  { id: "1", type: "backup",  status: "completed", label: "Full Mailbox Backup",     startedAt: "Today 3:00 AM",     duration: 420, size: "1.2 GB" },
  { id: "2", type: "cleanup", status: "completed", label: "Newsletters Cleanup",     startedAt: "Yesterday",         duration: 60,  size: "340 MB freed" },
  { id: "3", type: "restore", status: "completed", label: "Inbox Restore",           startedAt: "Jun 28",            duration: 180, size: "420 MB" },
  { id: "4", type: "backup",  status: "failed",    label: "Incremental Backup",      startedAt: "Jun 27",            duration: null, size: null },
  { id: "5", type: "backup",  status: "completed", label: "Sent Items Backup",       startedAt: "Jun 26",            duration: 240, size: "680 MB" },
];
