import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart3, TrendingUp, Users, HardDrive } from "lucide-react";

const COLORS = ["#0078d4", "#6264a7", "#107c10", "#e6a118", "#d13438", "#008272", "#8764b8"];

interface AnalyticsData {
  folderSizes:   { name: string; emails: number; sizeMB: number }[];
  topSenders:    { name: string; count: number; sizeMB: number }[];
  monthlyTrends: { month: string; received: number; sent: number }[];
  storageBreakdown: { name: string; value: number }[];
}

const MOCK: AnalyticsData = {
  folderSizes: [
    { name: "Archive", emails: 5612, sizeMB: 1240 },
    { name: "Inbox",   emails: 4821, sizeMB: 890 },
    { name: "Sent",    emails: 2103, sizeMB: 420 },
    { name: "Deleted", emails: 392,  sizeMB: 68 },
    { name: "Junk",    emails: 88,   sizeMB: 14 },
    { name: "Drafts",  emails: 14,   sizeMB: 2 },
  ],
  topSenders: [
    { name: "GitHub",       count: 1840, sizeMB: 380 },
    { name: "Newsletters",  count: 1204, sizeMB: 290 },
    { name: "Amazon",       count: 890,  sizeMB: 180 },
    { name: "LinkedIn",     count: 740,  sizeMB: 120 },
    { name: "Work / HR",    count: 620,  sizeMB: 95 },
    { name: "Google",       count: 480,  sizeMB: 60 },
  ],
  monthlyTrends: [
    { month: "Jan", received: 620, sent: 180 },
    { month: "Feb", received: 540, sent: 210 },
    { month: "Mar", received: 780, sent: 240 },
    { month: "Apr", received: 690, sent: 190 },
    { month: "May", received: 820, sent: 260 },
    { month: "Jun", received: 710, sent: 220 },
  ],
  storageBreakdown: [
    { name: "Attachments", value: 58 },
    { name: "Email Bodies", value: 28 },
    { name: "Metadata",    value: 8 },
    { name: "Other",       value: 6 },
  ],
};

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
    queryKey: ["/api/analytics"],
    staleTime: 120_000,
  });

  const d = data ?? MOCK;

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

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total Emails", value: "12,847", icon: BarChart3, color: "text-primary" },
          { label: "Growth / mo",  value: "+4.2%",  icon: TrendingUp, color: "text-green-600" },
          { label: "Top Sender",   value: "GitHub",  icon: Users,      color: "text-purple-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-border rounded-xl p-2.5 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <p className="text-xs font-black">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly email trends */}
      <div className="bg-white border border-border rounded-2xl p-3">
        <p className="text-xs font-black mb-3">Monthly Email Volume</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={d.monthlyTrends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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

      {/* Folder sizes */}
      <div className="bg-white border border-border rounded-2xl p-3">
        <p className="text-xs font-black mb-3">Folder Sizes (MB)</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={d.folderSizes} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="sizeMB" name="Size (MB)" radius={[4, 4, 0, 0]}>
              {d.folderSizes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Storage breakdown */}
      <div className="bg-white border border-border rounded-2xl p-3">
        <p className="text-xs font-black mb-3">Storage Breakdown</p>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={d.storageBreakdown} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value">
                {d.storageBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {d.storageBreakdown.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
                  <p className="text-[10px]">{item.name}</p>
                </div>
                <p className="text-[10px] font-bold">{item.value}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top senders */}
      <div className="bg-white border border-border rounded-2xl p-3">
        <p className="text-xs font-black mb-3">Top Senders by Volume</p>
        <div className="space-y-2">
          {d.topSenders.map((sender, i) => {
            const maxCount = d.topSenders[0].count;
            const pct = Math.round((sender.count / maxCount) * 100);
            return (
              <div key={sender.name} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                    <p className="text-[10px] font-bold">{sender.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{sender.count.toLocaleString()} · {sender.sizeMB} MB</p>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage health */}
      <div className="bg-white border border-border rounded-2xl p-3">
        <p className="text-xs font-black mb-2">Storage Health</p>
        <div className="space-y-2">
          {[
            { label: "Duplicate Emails",    value: "142",   unit: "found",       color: "text-amber-600", action: "Cleanup" },
            { label: "Newsletters",         value: "1,204", unit: "unsubscribed",color: "text-red-600",   action: "Cleanup" },
            { label: "Largest Attachment",  value: "48 MB", unit: "single file", color: "text-blue-600",  action: "View" },
            { label: "Oldest Email",        value: "2019",  unit: "unarchived",  color: "text-purple-600",action: "Archive" },
          ].map(({ label, value, unit, color, action }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div>
                <p className="text-[10px] font-bold">{label}</p>
                <p className="text-[9px] text-muted-foreground">{unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-xs font-black ${color}`}>{value}</p>
                <button className="text-[9px] font-bold text-primary">{action}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro AI insight teaser */}
      {!isPro && (
        <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 text-center space-y-2">
          <p className="text-sm font-black text-purple-800">🤖 AI-Powered Insights</p>
          <p className="text-[10px] text-purple-700">Upgrade to Pro for AI email categorization, smart cleanup suggestions, duplicate detection, and natural language search.</p>
          <a href="/landing" className="inline-block text-xs font-black bg-purple-600 text-white px-4 py-2 rounded-xl">
            Upgrade to Pro
          </a>
        </div>
      )}
    </div>
  );
}
