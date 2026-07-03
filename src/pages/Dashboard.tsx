import { useQuery } from "@tanstack/react-query";
import { formatExpiry, type SubscriptionInfo } from "@/lib/license";
import { isInOutlook } from "@/lib/outlookContext";
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
  connected:      boolean;
  totalSize:      number;
  totalEmails:    number;
  storageUsedPct: number | null;
  lastBackup:     string | null;
  nextBackup:     string | null;
  backupCount:    number;
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
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<MailboxStats>({
    queryKey: ["/api/mailbox/stats"],
    staleTime: 60_000,
    // Poll every 5 s while not yet connected so data appears as soon as the
    // Outlook token becomes available.  Stop polling once connected.
    refetchInterval: (query) => query.state.data?.connected ? false : 5_000,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<RecentJob[]>({
    queryKey:  ["/api/backup/recent"],
    staleTime: 30_000,
  });

  const isPro      = subscription?.subscribed ?? false;
  const connected  = stats?.connected ?? false;
  const inOutlook  = isInOutlook();

  return (
    <div className="p-4 space-y-4 animate-fade-in-up">
      {/* Greeting */}
      <div>
        <h2 className="text-base font-black">Welcome back 👋</h2>
        <p className="text-xs text-muted-foreground">Your mailbox is protected and monitored.</p>
      </div>

      {/* Not-in-Outlook banner */}
      {!inOutlook && (
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-blue-800">Open inside Outlook</p>
            <p className="text-[10px] text-blue-700">
              Load this add-in from the Outlook task pane to connect to your real mailbox.
            </p>
          </div>
        </div>
      )}

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
          value={statsLoading ? "…" : connected ? fmtBytes(stats!.totalSize) : "—"}
          icon={HardDrive}
          colorClass="stat-blue"
        />
        <StatCard
          title="Total Emails"
          value={statsLoading ? "…" : connected ? fmtNum(stats!.totalEmails) : "—"}
          icon={Mail}
          colorClass="stat-purple"
        />
        <StatCard
          title="Backups Made"
          value={statsLoading ? "…" : connected ? String(stats!.backupCount) : "—"}
          icon={Archive}
          colorClass="stat-green"
        />
        <StatCard
          title="Storage Used"
          value={statsLoading ? "…" : connected && stats!.storageUsedPct != null ? `${stats!.storageUsedPct}%` : "—"}
          icon={Zap}
          colorClass="stat-amber"
        />
      </div>

      {/* Storage bar — only when we have real data */}
      {connected && stats!.totalSize > 0 && (
        <div className="bg-white border border-border rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">Mailbox Size</p>
            <p className="text-xs text-muted-foreground">{fmtBytes(stats!.totalSize)}</p>
          </div>
          {stats!.storageUsedPct != null && (
            <>
              <Progress value={stats!.storageUsedPct} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                {stats!.storageUsedPct > 80
                  ? "⚠️ Storage almost full — run a cleanup to free space"
                  : "✅ Storage usage is healthy"
                }
              </p>
            </>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "backup",    icon: Archive,   label: "Start Backup",   desc: "Back up emails now",     color: "bg-blue-50 border-blue-200 text-blue-700" },
            { id: "restore",   icon: RotateCcw, label: "Restore",        desc: "Recover from backup",    color: "bg-green-50 border-green-200 text-green-700" },
            { id: "cleanup",   icon: Trash2,    label: "Cleanup",        desc: "Free up mailbox space",  color: "bg-red-50 border-red-200 text-red-700" },
            { id: "analytics", icon: BarChart3, label: "Analytics",      desc: "View mailbox insights",  color: "bg-purple-50 border-purple-200 text-purple-700" },
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
        <div className="flex items-center justify-between">
          <p className="text-xs font-black">Backup Status</p>
          {connected && (
            <button onClick={() => refetchStats()} className="text-[10px] text-primary font-bold flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <InfoPill label="Last Backup" value={stats?.lastBackup ?? "Never"} icon={CheckCircle2} color="text-green-600" />
          <InfoPill label="Next Backup" value={stats?.nextBackup ?? "Not scheduled"} icon={Calendar} color="text-blue-600" />
        </div>
      </div>

      {/* Recent jobs */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Recent Jobs</p>
        <div className="space-y-2">
          {jobsLoading
            ? [1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)
            : !jobs?.length
            ? <p className="text-xs text-muted-foreground text-center py-4">No jobs yet — start a backup or cleanup.</p>
            : jobs.slice(0, 5).map(job => <JobRow key={job.id} job={job} />)
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
  const JobIcon = JOB_ICONS[job.type] ?? Archive;
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
