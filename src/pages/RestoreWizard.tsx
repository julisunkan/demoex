import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Archive, Loader2, FolderOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BackupRecord {
  id:        string;
  label:     string;
  date:      string;
  size:      string;
  folders:   string[];
  encrypted: boolean;
  source:    string;
}

const MOCK_BACKUPS: BackupRecord[] = [
  { id: "b1", label: "Full Mailbox Backup",  date: "Today, 3:00 AM",     size: "1.2 GB", folders: ["Inbox","Sent","Archive","Drafts","Deleted","Junk"], encrypted: true,  source: "Local" },
  { id: "b2", label: "Sent Items Backup",    date: "Jun 28, 11:45 PM",   size: "340 MB", folders: ["Sent"], encrypted: false, source: "OneDrive" },
  { id: "b3", label: "Full Mailbox Backup",  date: "Jun 26, 3:00 AM",    size: "1.1 GB", folders: ["Inbox","Sent","Archive","Drafts","Deleted","Junk"], encrypted: true,  source: "Local" },
  { id: "b4", label: "Inbox Backup",         date: "Jun 24, 6:00 PM",    size: "620 MB", folders: ["Inbox"], encrypted: false, source: "Azure Blob" },
];

const SCOPES = [
  { id: "full",    label: "Entire Backup",      desc: "Restore all folders and emails" },
  { id: "folder",  label: "Specific Folders",   desc: "Choose folders to restore" },
  { id: "email",   label: "Individual Emails",  desc: "Search and pick specific emails" },
];

const CONFLICTS = [
  { id: "skip",  label: "Skip Duplicates",   desc: "Don't import if email already exists" },
  { id: "replace",label: "Replace Existing", desc: "Overwrite matching emails" },
  { id: "keep",  label: "Keep Both",         desc: "Import all and keep both copies" },
];

const DESTINATIONS_RESTORE = [
  { id: "original", label: "Original Folder",  desc: "Restore each email to its original location" },
  { id: "inbox",    label: "Inbox",             desc: "Place all restored emails in Inbox" },
  { id: "archive",  label: "Archive",           desc: "Place all restored emails in Archive" },
];

const TOTAL = 5;
const LABELS = ["Select Backup", "Scope", "Conflict", "Destination", "Summary"];

export default function RestoreWizard() {
  const { toast } = useToast();
  const [step, setStep]         = useState(1);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [progress, setProgress] = useState(0);

  const [selected, setSelected]   = useState<string>("");
  const [scope, setScope]         = useState("full");
  const [conflict, setConflict]   = useState("skip");
  const [restoreDest, setRestDest]= useState("original");

  const { data: backups } = useQuery<BackupRecord[]>({
    queryKey: ["/api/backup/list"],
    staleTime: 60_000,
  });

  const allBackups = backups ?? MOCK_BACKUPS;
  const pickedBackup = allBackups.find(b => b.id === selected);

  async function startRestore() {
    setRunning(true); setProgress(0);
    const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 10, 99)), 500);
    await new Promise(r => setTimeout(r, 5000));
    clearInterval(iv); setProgress(100); setRunning(false); setDone(true);
    toast({ title: "✅ Restore complete", description: "Emails restored to your mailbox." });
  }

  if (done) return (
    <div className="p-6 text-center space-y-4 animate-fade-in-up">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-base font-black">Restore Complete!</h2>
      <p className="text-sm text-muted-foreground">Emails from "{pickedBackup?.label}" have been restored.</p>
      <button onClick={() => { setDone(false); setStep(1); setSelected(""); }} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm">
        Start New Restore
      </button>
    </div>
  );

  if (running) return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-3">
          <RotateCcw className="w-7 h-7 text-green-600 animate-spin" />
        </div>
        <h2 className="text-base font-black">Restoring Emails</h2>
        <p className="text-xs text-muted-foreground mt-1">This may take a few minutes</p>
      </div>
      <Progress value={Math.min(progress, 100)} className="h-3" />
      <p className="text-center text-sm font-bold text-primary">{Math.min(Math.round(progress), 100)}%</p>
      <div className="bg-muted rounded-xl p-3 space-y-1.5">
        {["Verifying backup integrity…", "Decrypting archive…", "Processing emails…", "Importing to mailbox…", "Finalizing restore…"]
          .map((msg, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${progress > i * 20 ? "text-foreground" : "text-muted-foreground"}`}>
              {progress > (i + 1) * 20 ? <Check className="w-3 h-3 text-green-600 shrink-0" />
               : progress > i * 20 ? <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
               : <div className="w-3 h-3 rounded-full border border-border shrink-0" />}
              {msg}
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="px-4 pt-4 pb-3 bg-white border-b">
        <div className="flex items-center gap-1 mb-2">
          {LABELS.map((label, i) => {
            const n = i + 1; const isDone = n < step; const active = n === step;
            return (
              <div key={n} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                  isDone ? "bg-green-600 text-white" : active ? "bg-green-100 text-green-700 ring-2 ring-green-600" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-2.5 h-2.5" /> : n}
                </div>
                {i < LABELS.length - 1 && <div className={`step-connector ${isDone ? "!bg-green-600" : ""}`} />}
              </div>
            );
          })}
        </div>
        <p className="text-xs font-black">Step {step}: {LABELS[step - 1]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Select Backup */}
        {step === 1 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Choose the backup to restore from.</p>
            <div className="space-y-2">
              {allBackups.map(b => (
                <button key={b.id} onClick={() => setSelected(b.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    selected === b.id ? "border-green-600 bg-green-50" : "border-border bg-white hover:border-green-300"
                  }`}>
                  <Archive className={`w-5 h-5 shrink-0 ${selected === b.id ? "text-green-600" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground">{b.date} · {b.size} · {b.source}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {b.folders.slice(0, 3).map(f => (
                        <span key={f} className="text-[9px] bg-muted px-1.5 rounded">{f}</span>
                      ))}
                      {b.folders.length > 3 && <span className="text-[9px] bg-muted px-1.5 rounded">+{b.folders.length - 3} more</span>}
                    </div>
                  </div>
                  {b.encrypted && <span className="text-[9px] status-badge-info px-1.5 py-0.5 rounded-full">🔒</span>}
                  {selected === b.id && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Scope */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">What would you like to restore from <strong>{pickedBackup?.label}</strong>?</p>
            <div className="space-y-2">
              {SCOPES.map(s => (
                <button key={s.id} onClick={() => setScope(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    scope === s.id ? "border-green-600 bg-green-50" : "border-border bg-white"
                  }`}>
                  <FolderOpen className={`w-4 h-4 shrink-0 ${scope === s.id ? "text-green-600" : "text-muted-foreground"}`} />
                  <div><p className="text-xs font-bold">{s.label}</p><p className="text-[10px] text-muted-foreground">{s.desc}</p></div>
                  {scope === s.id && <Check className="w-4 h-4 text-green-600 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Conflict */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">How should existing emails be handled?</p>
            <div className="space-y-2">
              {CONFLICTS.map(c => (
                <button key={c.id} onClick={() => setConflict(c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    conflict === c.id ? "border-green-600 bg-green-50" : "border-border bg-white"
                  }`}>
                  <div className="flex-1"><p className="text-xs font-bold">{c.label}</p><p className="text-[10px] text-muted-foreground">{c.desc}</p></div>
                  {conflict === c.id && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Destination */}
        {step === 4 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Where should restored emails be placed?</p>
            <div className="space-y-2">
              {DESTINATIONS_RESTORE.map(d => (
                <button key={d.id} onClick={() => setRestDest(d.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    restoreDest === d.id ? "border-green-600 bg-green-50" : "border-border bg-white"
                  }`}>
                  <FolderOpen className={`w-4 h-4 shrink-0 ${restoreDest === d.id ? "text-green-600" : "text-muted-foreground"}`} />
                  <div><p className="text-xs font-bold">{d.label}</p><p className="text-[10px] text-muted-foreground">{d.desc}</p></div>
                  {restoreDest === d.id && <Check className="w-4 h-4 text-green-600 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-xs text-muted-foreground">Review restore details before starting.</p>
            <div className="bg-white border border-border rounded-2xl divide-y text-xs">
              <SumRow label="Backup"      value={pickedBackup?.label ?? ""} />
              <SumRow label="Date"        value={pickedBackup?.date ?? ""} />
              <SumRow label="Size"        value={pickedBackup?.size ?? ""} />
              <SumRow label="Scope"       value={SCOPES.find(s => s.id === scope)?.label ?? scope} />
              <SumRow label="Conflicts"   value={CONFLICTS.find(c => c.id === conflict)?.label ?? conflict} />
              <SumRow label="Destination" value={DESTINATIONS_RESTORE.find(d => d.id === restoreDest)?.label ?? restoreDest} />
            </div>
            <div className="text-[10px] text-muted-foreground bg-amber-50 border border-amber-100 rounded-xl p-2.5">
              ⚠️ Restore will import emails into your live mailbox. This action cannot be automatically undone.
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="border-t bg-white p-3 flex gap-2 shrink-0">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        {step < TOTAL ? (
          <button
            onClick={() => { if (step === 1 && !selected) { toast({ title: "Select a backup", variant: "destructive" }); return; } setStep(s => s + 1); }}
            className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-green-700"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={startRestore} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl text-sm font-black hover:bg-green-700 shadow-lg">
            <RotateCcw className="w-4 h-4" /> Start Restore
          </button>
        )}
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold max-w-[55%] text-right truncate">{value}</p>
    </div>
  );
}
