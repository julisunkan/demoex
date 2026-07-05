import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isInOutlook } from "@/lib/outlookContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Archive, ChevronRight, ChevronLeft, Check, Cloud, HardDrive,
  FolderOpen, Shield, CalendarClock, Play, Loader2, AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const TOTAL_STEPS  = 6;
const STEP_LABELS  = ["Folders", "Filters", "Destination", "Options", "Schedule", "Summary"];

interface FolderInfo { name: string; count: number; sizeMB: number; }
interface MailboxStats { connected: boolean; folders: FolderInfo[]; }

const DESTINATIONS = [
  { id: "local",   icon: HardDrive, label: "Local Storage",  desc: "Save to this device",  free: true  },
  { id: "onedrive",icon: Cloud,     label: "OneDrive",       desc: "Microsoft OneDrive",   free: false },
  { id: "azure",   icon: Cloud,     label: "Azure Blob",     desc: "Azure Blob Storage",   free: false },
  { id: "s3",      icon: Cloud,     label: "Amazon S3",      desc: "AWS S3 bucket",        free: false },
  { id: "gdrive",  icon: Cloud,     label: "Google Drive",   desc: "Google Drive folder",  free: false },
  { id: "dropbox", icon: Cloud,     label: "Dropbox",        desc: "Dropbox folder",       free: false },
];

const SCHEDULES = [
  { id: "manual",  label: "Manual",  desc: "Run only when I click Start" },
  { id: "daily",   label: "Daily",   desc: "Every day at selected time"  },
  { id: "weekly",  label: "Weekly",  desc: "Once a week"                 },
  { id: "monthly", label: "Monthly", desc: "Once a month"                },
];

export default function BackupWizard({ isPro }: { isPro: boolean }) {
  const { toast } = useToast();
  const [step, setStep]         = useState(1);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [sender, setSender]         = useState("");
  const [subject, setSubject]       = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasAttach, setHasAttach]   = useState(false);
  const [dest, setDest]             = useState("local");
  const [compression, setComp]      = useState(true);
  const [encrypt, setEncrypt]       = useState(false);
  const [password, setPassword]     = useState("");
  const [incremental, setIncremental] = useState(false);
  const [schedule, setSchedule]     = useState("manual");
  const [time, setTime]             = useState("02:00");

  // Real mailbox folders from Outlook
  const { data: mailboxStats, isLoading: foldersLoading } = useQuery<MailboxStats>({
    queryKey: ["/api/mailbox/stats"],
    staleTime: 120_000,
  });

  const inOutlook = isInOutlook();
  const connected = mailboxStats?.connected ?? false;
  const folders   = mailboxStats?.folders ?? [];

  function toggleFolder(name: string) {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function startBackup() {
    if (!inOutlook) {
      toast({ title: "Not connected", description: "Open this add-in inside Outlook to run a backup.", variant: "destructive" });
      return;
    }

    setRunning(true);
    setProgress(0);

    // Kick off the real backup on the server
    const res = await apiRequest("POST", "/api/backup/start", {
      folders:     Array.from(selectedFolders),
      filters:     { dateFrom, dateTo, sender, subject, unreadOnly, hasAttach },
      destination: dest,
      options:     { compression, encrypt, incremental },
      schedule,
      time,
    }).catch(() => null);

    if (!res?.ok) {
      toast({ title: "Failed to start backup", variant: "destructive" });
      setRunning(false);
      return;
    }

    // Animate progress while job runs in background
    const iv = setInterval(() => {
      setProgress(p => (p >= 90 ? 90 : p + Math.random() * 6));
    }, 600);

    // Poll status
    const { jobId } = await res.json();
    let attempts = 0;
    while (attempts < 120) { // max 4 min
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      try {
        const statusRes = await apiRequest("GET", `/api/backup/status/${jobId}`);
        const { status } = await statusRes.json();
        if (status === "completed") break;
        if (status === "failed") {
          clearInterval(iv);
          setRunning(false);
          toast({ title: "Backup failed", variant: "destructive" });
          return;
        }
      } catch { /* keep polling */ }
    }

    clearInterval(iv);
    setProgress(100);
    await new Promise(r => setTimeout(r, 400));
    setRunning(false);
    setDone(true);
    toast({ title: "✅ Backup complete", description: "Your selected folders have been backed up." });
  }

  if (done) {
    return (
      <div className="p-6 text-center space-y-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-base font-black">Backup Complete!</h2>
        <p className="text-sm text-muted-foreground">
          {selectedFolders.size > 0 ? `${selectedFolders.size} folder(s)` : "All folders"} backed up to {DESTINATIONS.find(d => d.id === dest)?.label}.
        </p>
        <button
          onClick={() => { setDone(false); setStep(1); setProgress(0); }}
          className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90"
        >
          Start New Backup
        </button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <h2 className="text-base font-black">Backup in Progress</h2>
          <p className="text-xs text-muted-foreground mt-1">Do not close the add-in during backup</p>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-3" />
        <p className="text-center text-sm font-bold text-primary">{Math.min(Math.round(progress), 100)}%</p>
        <div className="bg-muted rounded-xl p-3 space-y-1.5">
          {["Reading email headers…", "Downloading messages…", "Compressing data…", "Encrypting backup…", "Saving to storage…"]
            .map((msg, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${progress > i * 20 ? "text-foreground" : "text-muted-foreground"}`}>
                {progress > (i + 1) * 20
                  ? <Check className="w-3 h-3 text-green-600 shrink-0" />
                  : progress > i * 20
                  ? <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                  : <div className="w-3 h-3 rounded-full border border-border shrink-0" />
                }
                {msg}
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="px-4 pt-4 pb-3 bg-white border-b">
        <div className="flex items-center gap-1 mb-2">
          {STEP_LABELS.map((_, i) => {
            const n = i + 1; const isDone = n < step; const active = n === step;
            return (
              <div key={n} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                  isDone ? "bg-primary text-white" : active ? "bg-primary/20 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-2.5 h-2.5" /> : n}
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`step-connector ${isDone ? "done" : ""}`} />}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-black">Step {step}: {STEP_LABELS[step - 1]}</p>
          <p className="text-[10px] text-muted-foreground">{step} of {TOTAL_STEPS}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Folders */}
        {step === 1 && (
          <div className="space-y-3 animate-fade-in-up">
            {!inOutlook && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700">Open inside Outlook to see your real folders and email counts.</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Select which folders to include in this backup.</p>
            {foldersLoading
              ? <div className="h-40 rounded-xl bg-muted animate-pulse" />
              : folders.length === 0
              ? <div className="py-4 text-center space-y-2">
                  {inOutlook && !connected
                    ? <>
                        <div className="flex justify-center">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-xs text-muted-foreground">Connecting to Outlook…</p>
                      </>
                    : <p className="text-xs text-muted-foreground">
                        {connected ? "No folders found in your mailbox." : "Open inside Outlook to load your folders."}
                      </p>
                  }
                </div>
              : (
                <div className="space-y-2">
                  {folders.map(f => (
                    <label key={f.name} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedFolders.has(f.name) ? "border-primary bg-primary/5" : "border-border bg-white"
                    }`}>
                      <Checkbox
                        checked={selectedFolders.has(f.name)}
                        onCheckedChange={() => toggleFolder(f.name)}
                        className="shrink-0"
                      />
                      <FolderOpen className={`w-4 h-4 shrink-0 ${selectedFolders.has(f.name) ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className="text-xs font-bold">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {f.count.toLocaleString()} emails · {f.sizeMB} MB
                        </p>
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={() => setSelectedFolders(new Set(folders.map(f => f.name)))}
                    className="text-xs text-primary font-bold"
                  >Select All</button>
                </div>
              )
            }
          </div>
        )}

        {/* Step 2: Filters */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Optionally narrow the emails included in this backup.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-bold">From Date</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold">To Date</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-bold">Sender Email</Label>
                <Input placeholder="e.g. boss@company.com" value={sender} onChange={e => setSender(e.target.value)} className="text-xs mt-1" />
              </div>
              {[
                { id: "unread", label: "Unread emails only",   state: unreadOnly, set: setUnreadOnly },
                { id: "attach", label: "Has attachments only", state: hasAttach,  set: setHasAttach },
              ].map(({ id, label, state, set }) => (
                <div key={id} className="flex items-center justify-between p-2.5 bg-muted rounded-xl">
                  <Label className="text-xs font-medium">{label}</Label>
                  <Switch checked={state} onCheckedChange={set} />
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                💡 Leave all filters blank to back up all emails in the selected folders.
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Destination */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Choose where to store the backup archive.</p>
            <div className="space-y-2">
              {DESTINATIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => (d.free || isPro) ? setDest(d.id) : null}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    dest === d.id ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
                  } ${!d.free && !isPro ? "opacity-50" : ""}`}
                >
                  <d.icon className={`w-5 h-5 shrink-0 ${dest === d.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-bold">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground">{d.desc}</p>
                  </div>
                  {!d.free && !isPro && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PRO</span>}
                  {dest === d.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Options */}
        {step === 4 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Configure compression, encryption, and backup behaviour.</p>
            <div className="space-y-2">
              {[
                { id: "comp", label: "Compression",        desc: "ZIP compress (saves ~60% space)",         state: compression,  set: setComp,        pro: false },
                { id: "enc",  label: "AES-256 Encryption", desc: "Encrypt with military-grade security",     state: encrypt,      set: setEncrypt,     pro: true  },
                { id: "inc",  label: "Incremental Backup", desc: "Only back up emails since last backup",    state: incremental,  set: setIncremental, pro: true  },
              ].map(({ id, label, desc, state, set, pro }) => (
                <div key={id} className={`flex items-start gap-3 p-3 rounded-xl border ${state ? "border-primary/30 bg-primary/5" : "border-border bg-white"}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold">{label}</p>
                      {pro && !isPro && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PRO</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={state} onCheckedChange={set} disabled={pro && !isPro} />
                </div>
              ))}
              {encrypt && (
                <div className="space-y-1.5 animate-fade-in-up">
                  <Label className="text-[10px] font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Encryption Password
                  </Label>
                  <Input type="password" placeholder="Strong password for this backup" value={password} onChange={e => setPassword(e.target.value)} className="text-xs" />
                  <p className="text-[10px] text-amber-600">⚠️ You must remember this password — it cannot be recovered.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Schedule */}
        {step === 5 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Run this backup once now, or set a recurring schedule.</p>
            <div className="space-y-2">
              {SCHEDULES.map(s => (
                <button
                  key={s.id}
                  onClick={() => (s.id === "manual" || isPro) ? setSchedule(s.id) : null}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    schedule === s.id ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
                  } ${s.id !== "manual" && !isPro ? "opacity-50" : ""}`}
                >
                  <CalendarClock className={`w-4 h-4 shrink-0 ${schedule === s.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-bold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </div>
                  {s.id !== "manual" && !isPro && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PRO</span>}
                  {schedule === s.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
            {schedule !== "manual" && (
              <div className="animate-fade-in-up space-y-1.5">
                <Label className="text-[10px] font-bold">Backup Time</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="text-xs" />
                <p className="text-[10px] text-muted-foreground">Times are in your local timezone.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Summary */}
        {step === 6 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Review your backup configuration before starting.</p>
            <div className="bg-white border border-border rounded-2xl divide-y divide-border text-xs">
              <SummaryRow label="Folders"     value={selectedFolders.size === 0 ? "All folders" : `${selectedFolders.size} selected`} />
              <SummaryRow label="Date Filter" value={dateFrom || dateTo ? `${dateFrom || "any"} → ${dateTo || "any"}` : "All dates"} />
              <SummaryRow label="Sender"      value={sender || "Any sender"} />
              <SummaryRow label="Destination" value={DESTINATIONS.find(d => d.id === dest)?.label ?? dest} />
              <SummaryRow label="Compression" value={compression ? "✅ Enabled" : "Disabled"} />
              <SummaryRow label="Encryption"  value={encrypt ? "✅ AES-256" : "Disabled"} />
              <SummaryRow label="Incremental" value={incremental ? "✅ Enabled" : "Full backup"} />
              <SummaryRow label="Schedule"    value={SCHEDULES.find(s => s.id === schedule)?.label ?? schedule} />
            </div>
            {!inOutlook && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700">You must open this add-in inside Outlook to run a real backup.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-t bg-white p-3 flex gap-2 shrink-0">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-1 bg-primary text-white py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={startBackup}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-black hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Play className="w-4 h-4" /> Start Backup
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold text-right max-w-[55%] truncate">{value}</p>
    </div>
  );
}
