import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart3, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { isMsalConfigured } from "@/lib/outlookContext";

const COLORS = ["#0078d4", "#6264a7", "#107c10", "#e6a118", "#d13438", "#008272", "#8764b8"];

interface AnalyticsData {
  connected:        boolean;
  folderSizes:      { name: string; emails: number; sizeMB: number }[];
  topSenders:       { name: string; count: number; sizeMB: number }[];
  monthlyTrends:    { month: string; received: number; sent: number }[];
  storageBreakdown: { name: string; value: number }[];
  healthInsights:   {
    duplicateEmails?:     number;
    newsletters?:         number;
    largestAttachmentMB?: number;
    oldestEmailYear?:     number | null;
    oldEmails?:           number;
  };
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-bold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: COLORS[i] }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Analytics({ isPro }: { isPro: boolean }) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey:  ["/api/analytics"],
    staleTime: 120_000,
  });

  const connected = data?.connected ?? false;

  if (isLoading) return (
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black">Mailbox Insights</h2>
          <p className="text-[10px] text-muted-foreground">Your email storage analysis</p>
        </div>
        {!isPro && (
          <a href="/landing" className="text-[10px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-lg">
            Upgrade for AI insights
          </a>
        )}
      </div>

      {/* Not connected banner */}
      {!connected && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-blue-800">Connecting to mailbox…</p>
            <p className="text-[10px] text-blue-700">Sign in with Microsoft to analyse your real mailbox.</p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {connected && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Emails", value: data!.folderSizes.reduce((s, f) => s + f.emails, 0).toLocaleString(), icon: BarChart3, color: "text-primary" },
            { label: "Folders",      value: String(data!.folderSizes.length),                                      icon: TrendingUp, color: "text-green-600" },
            { label: "Top Sender",   value: data!.topSenders[0]?.name ?? "—",                                     icon: Users,      color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-border rounded-xl p-2.5 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className="text-xs font-black truncate">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly email trends */}
      {connected && data!.monthlyTrends.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-3">
          <p className="text-xs font-black mb-3">Monthly Email Volume</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data!.monthlyTrends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="received" name="Received" stroke="#0078d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sent"     name="Sent"     stroke="#6264a7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 justify-center">
            <span className="text-[10px] flex items-center gap-1"><span className="w-2.5 h-0.5 bg-primary inline-block rounded" /> Received</span>
            <span className="text-[10px] flex items-center gap-1"><span className="w-2.5 h-0.5 bg-secondary inline-block rounded" /> Sent</span>
          </div>
        </div>
      )}

      {/* Folder sizes */}
      {connected && data!.folderSizes.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-3">
          <p className="text-xs font-black mb-3">Folder Sizes (MB)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data!.folderSizes} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sizeMB" name="Size (MB)" radius={[4, 4, 0, 0]}>
                {data!.folderSizes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Storage breakdown */}
      {connected && data!.storageBreakdown.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-3">
          <p className="text-xs font-black mb-3">Storage Breakdown by Folder</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={data!.storageBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value">
                  {data!.storageBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {data!.storageBreakdown.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
                    <p className="text-[10px] truncate max-w-[80px]">{item.name}</p>
                  </div>
                  <p className="text-[10px] font-bold">{item.value}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top senders */}
      {connected && data!.topSenders.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-3">
          <p className="text-xs font-black mb-3">Top Senders by Volume</p>
          <div className="space-y-2">
            {data!.topSenders.map((sender, i) => {
              const maxCount = data!.topSenders[0].count;
              const pct = Math.round((sender.count / maxCount) * 100);
              return (
                <div key={sender.name} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <p className="text-[10px] font-bold truncate max-w-[120px]">{sender.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{sender.count.toLocaleString()} emails</p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Health insights */}
      {connected && data!.healthInsights && (
        <div className="bg-white border border-border rounded-2xl p-3">
          <p className="text-xs font-black mb-2">Mailbox Health</p>
          <div className="space-y-2">
            {[
              data!.healthInsights.oldEmails != null && data!.healthInsights.oldEmails > 0
                ? { label: "Old Emails (>180 days)", value: String(data!.healthInsights.oldEmails), unit: "found", color: "text-amber-600", action: "Cleanup" }
                : null,
              data!.healthInsights.oldestEmailYear
                ? { label: "Oldest Email", value: String(data!.healthInsights.oldestEmailYear), unit: "year", color: "text-purple-600", action: "Archive" }
                : null,
            ].filter(Boolean).map(row => row && (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-[10px] font-bold">{row.label}</p>
                  <p className="text-[9px] text-muted-foreground">{row.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-xs font-black ${row.color}`}>{row.value}</p>
                  <span className="text-[9px] font-bold text-primary">{row.action}</span>
                </div>
              </div>
            ))}
            {(!data!.healthInsights.oldEmails && !data!.healthInsights.oldestEmailYear) && (
              <p className="text-[10px] text-muted-foreground">No health insights yet — load more emails to analyse.</p>
            )}
          </div>
        </div>
      )}

      {/* Empty / connecting state when not connected */}
      {!connected && !isLoading && (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center space-y-2">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
          {!isMsalConfigured() ? (
            <>
              <p className="text-sm font-black">Azure app not configured</p>
              <p className="text-[10px] text-muted-foreground">Set <code className="bg-muted px-1 rounded">VITE_AZURE_CLIENT_ID</code> in your Replit environment to connect to your mailbox.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-black">Connecting to mailbox…</p>
              <p className="text-[10px] text-muted-foreground">Signing in to Microsoft Graph. A sign-in popup may appear.</p>
              <div className="flex justify-center pt-1">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Pro AI insight teaser */}
      {!isPro && (
        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 text-center space-y-2">
          <p className="text-sm font-black text-purple-800">🤖 AI-Powered Insights</p>
          <p className="text-[10px] text-purple-700">Upgrade to Pro for AI email categorisation, smart cleanup suggestions, duplicate detection, and natural language search.</p>
          <a href="/landing" className="inline-block text-xs font-black bg-purple-600 text-white px-4 py-2 rounded-xl">
            Upgrade to Pro
          </a>
        </div>
      )}
    </div>
  );
}
