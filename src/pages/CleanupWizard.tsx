import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isInOutlook } from "@/lib/outlookContext";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight, Trash2, Loader2, AlertTriangle, Search } from "lucide-react";

const TOTAL  = 3;
const LABELS = ["Filters", "Preview", "Confirm"];

interface EmailItem {
  id:             string;
  subject:        string;
  from:           string;
  fromName:       string;
  date:           string;
  sizeMB:         number;
  hasAttachments: boolean;
  reason:         string;
}

export default function CleanupWizard({ isPro }: { isPro: boolean }) {
  const { toast } = useToast();
  const [step, setStep]         = useState(1);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [progress, setProgress] = useState(0);

  // Filters
  const [olderThan, setOlderThan]       = useState("180");
  const [newsletters, setNewsletters]   = useState(true);
  const [promotional, setPromotional]   = useState(true);
  const [social, setSocial]             = useState(false);
  const [backupFirst, setBackupFirst]   = useState(true);
  const [senderFilter, setSenderFilter] = useState("");

  // Scan results
  const [scanning, setScanning]       = useState(false);
  const [scanned, setScanned]         = useState(false);
  const [emails, setEmails]           = useState<EmailItem[]>([]);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [confirm, setConfirm]         = useState(false);

  const inOutlook = isInOutlook();

  function toggleEmail(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedEmails = emails.filter(e => selected.has(e.id));
  const totalSizeMB    = Math.round(selectedEmails.reduce((s, e) => s + (e.sizeMB ?? 0), 0) * 10) / 10;

  async function runScan() {
    if (!inOutlook) {
      toast({ title: "Open inside Outlook to scan your real mailbox.", variant: "destructive" });
      return;
    }
    setScanning(true);
    setScanned(false);
    setEmails([]);
    setSelected(new Set());

    try {
      const qs = new URLSearchParams({
        olderThan:    olderThan,
        newsletters:  String(newsletters),
        promotional:  String(promotional),
        social:       String(social),
        senderFilter: senderFilter,
      });
      const res  = await apiRequest("GET", `/api/cleanup/scan?${qs}`);
      const data = await res.json();
      const found: EmailItem[] = data.emails ?? [];
      setEmails(found);
      setSelected(new Set(found.map(e => e.id)));
      setScanned(true);
      setStep(2);
    } catch (err: unknown) {
      toast({ title: "Scan failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }

  async function runCleanup() {
    if (!confirm) { toast({ title: "Please confirm deletion", variant: "destructive" }); return; }
    if (!inOutlook) {
      toast({ title: "Open inside Outlook to delete emails.", variant: "destructive" });
      return;
    }

    setRunning(true); setProgress(0);

    try {
      await apiRequest("POST", "/api/cleanup/start", {
        emailIds:    selectedEmails.map(e => e.id),
        backupFirst,
        // Lightweight headers so the server can save a pre-deletion snapshot
        emailMeta:   selectedEmails.map(e => ({
          id: e.id, subject: e.subject, from: e.from, date: e.date, sizeMB: e.sizeMB,
        })),
      });
    } catch (err: unknown) {
      toast({ title: "Cleanup failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      setRunning(false);
      return;
    }

    // Animate while deletion runs server-side
    const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 15, 99)), 400);
    await new Promise(r => setTimeout(r, 3000));
    clearInterval(iv);
    setProgress(100);
    await new Promise(r => setTimeout(r, 300));
    setRunning(false);
    setDone(true);
    toast({ title: "✅ Cleanup complete", description: `${selectedEmails.length} emails deleted · ${totalSizeMB} MB freed.` });
  }

  if (done) return (
    <div className="p-6 text-center space-y-4 animate-fade-in-up">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-base font-black">Cleanup Complete!</h2>
      <p className="text-sm text-muted-foreground">{selectedEmails.length} emails deleted · {totalSizeMB} MB freed</p>
      <button onClick={() => { setDone(false); setStep(1); setScanned(false); setConfirm(false); }} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm">
        New Cleanup
      </button>
    </div>
  );

  if (running) return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-7 h-7 text-red-600 animate-bounce" />
        </div>
        <h2 className="text-base font-black">Deleting Emails…</h2>
        <p className="text-xs text-muted-foreground mt-1">{selectedEmails.length} emails being removed</p>
      </div>
      <Progress value={Math.min(progress, 100)} className="h-3" />
      <p className="text-center text-sm font-bold text-red-600">{Math.min(Math.round(progress), 100)}%</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="px-4 pt-4 pb-3 bg-white border-b">
        <div className="flex items-center gap-1 mb-2">
          {LABELS.map((_, i) => {
            const n = i + 1; const isDone = n < step; const active = n === step;
            return (
              <div key={n} className="flex items-center gap-1 flex-1 min-w-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                  isDone ? "bg-red-600 text-white" : active ? "bg-red-100 text-red-600 ring-2 ring-red-600" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-2.5 h-2.5" /> : n}
                </div>
                {i < LABELS.length - 1 && <div className={`step-connector ${isDone ? "!bg-red-600" : ""}`} />}
              </div>
            );
          })}
        </div>
        <p className="text-xs font-black">Step {step}: {LABELS[step - 1]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Filters */}
        {step === 1 && (
          <div className="space-y-3 animate-fade-in-up">
            {!inOutlook && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700">Open inside Outlook to scan your real mailbox.</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Configure which emails to find and delete.</p>
            <div className="space-y-2">
              <div>
                <Label className="text-[10px] font-bold">Emails older than (days)</Label>
                <Input type="number" value={olderThan} onChange={e => setOlderThan(e.target.value)} className="text-xs mt-1" min="1" />
              </div>
              <div>
                <Label className="text-[10px] font-bold">From Sender (optional)</Label>
                <Input placeholder="noreply@newsletter.com" value={senderFilter} onChange={e => setSenderFilter(e.target.value)} className="text-xs mt-1" />
              </div>
              {[
                { id: "news", label: "Newsletters",          desc: "Automated newsletter senders",       state: newsletters,  set: setNewsletters, pro: false },
                { id: "promo",label: "Promotional Emails",   desc: "Sales, offers, deals",               state: promotional,  set: setPromotional, pro: false },
                { id: "soc",  label: "Social Notifications", desc: "Facebook, LinkedIn, Twitter alerts", state: social,       set: setSocial,      pro: true  },
              ].map(({ id, label, desc, state, set, pro }) => (
                <div key={id} className={`flex items-start gap-3 p-3 rounded-xl border ${state ? "border-red-200 bg-red-50" : "border-border bg-white"}`}>
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
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-white">
                <div className="flex-1">
                  <p className="text-xs font-bold">Backup Before Delete</p>
                  <p className="text-[10px] text-muted-foreground">Recommended — create a backup archive first</p>
                </div>
                <Switch checked={backupFirst} onCheckedChange={setBackupFirst} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview (real scan results) */}
        {step === 2 && (
          <div className="space-y-3 animate-fade-in-up">
            {scanning
              ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Scanning your mailbox…</p>
                </div>
              )
              : emails.length === 0
              ? (
                <div className="py-10 text-center space-y-2">
                  <Check className="w-8 h-8 text-green-600 mx-auto" />
                  <p className="text-xs font-bold">No emails found</p>
                  <p className="text-[10px] text-muted-foreground">No emails matched your filters. Try adjusting them.</p>
                  <button onClick={() => setStep(1)} className="text-xs text-primary font-bold">← Back to Filters</button>
                </div>
              )
              : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{emails.length} emails found</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground">~{totalSizeMB} MB</p>
                      <button
                        onClick={() => setSelected(prev => prev.size === emails.length ? new Set() : new Set(emails.map(e => e.id)))}
                        className="text-[10px] text-primary font-bold"
                      >
                        {selected.size === emails.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {emails.map(email => (
                      <label key={email.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        selected.has(email.id) ? "border-red-200 bg-red-50" : "border-border bg-white"
                      }`}>
                        <input
                          type="checkbox"
                          checked={selected.has(email.id)}
                          onChange={() => toggleEmail(email.id)}
                          className="mt-0.5 accent-red-600 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate">{email.subject}</p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {email.from} · {email.date}
                            {email.sizeMB > 0 ? ` · ${email.sizeMB} MB` : ""}
                            {email.hasAttachments ? " · 📎" : ""}
                          </p>
                          <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{email.reason}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
              <p className="text-sm font-black text-red-800">This action is permanent</p>
              <p className="text-xs text-red-700">
                <strong>{selected.size} emails</strong> will be permanently deleted from your Outlook mailbox.<br />
                {totalSizeMB > 0 && <>This frees approximately <strong>{totalSizeMB} MB</strong> of storage.</>}
              </p>
            </div>
            {backupFirst && (
              <div className="status-badge-info rounded-xl p-3 text-xs">
                ✅ A backup will be created automatically before deletion.
              </div>
            )}
            <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-border bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={confirm}
                onChange={e => setConfirm(e.target.checked)}
                className="mt-0.5 accent-red-600 shrink-0"
              />
              <p className="text-xs">I understand this will permanently delete {selected.size} emails from my Outlook mailbox and this cannot be undone.</p>
            </label>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-t bg-white p-3 flex gap-2 shrink-0">
        {step > 1 && !scanning && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}

        {step === 1 && (
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {scanning ? "Scanning…" : "Scan Mailbox"}
          </button>
        )}

        {step === 2 && !scanning && (
          <button
            onClick={() => { if (selected.size === 0) { toast({ title: "Select at least one email", variant: "destructive" }); return; } setStep(3); }}
            className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={runCleanup}
            disabled={!confirm || selected.size === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl text-sm font-black hover:bg-red-700 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" /> Delete {selected.size} Emails
          </button>
        )}
      </div>
    </div>
  );
}
