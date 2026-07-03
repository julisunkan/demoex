import { useState } from "react";
import { Shield, Mail, MessageSquare, Book, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const FAQS = [
  { q: "How do I set up my first backup?", a: "Open the add-in in Outlook, sign in with your Microsoft account, tap 'Backup' in the bottom nav, and follow the 6-step wizard. You can select folders, set filters, choose a storage destination, enable encryption, and schedule automatic backups." },
  { q: "What email folders can I back up?", a: "You can back up Inbox, Sent Items, Archive, Drafts, Deleted Items, Junk Email, and any custom folders you have created in Outlook." },
  { q: "Is my backup encrypted?", a: "Pro users can enable AES-256-GCM encryption with a custom password. Encrypted backups cannot be read without the password, which is never stored on our servers." },
  { q: "Which cloud storage providers are supported?", a: "Pro plan supports Azure Blob Storage, OneDrive, Amazon S3, Google Drive, and Dropbox. Free plan supports local storage only." },
  { q: "How do I restore emails from a backup?", a: "Go to the Restore tab in the add-in, select a backup, choose your scope (full, folder, or individual emails), set conflict resolution, and click Start Restore." },
  { q: "Can I schedule automatic backups?", a: "Yes — Pro users can set up daily, weekly, or monthly scheduled backups with a custom time. Free users can run manual backups only." },
  { q: "How do I cancel my subscription?", a: "Subscriptions are managed through Microsoft AppSource. Sign in at appsource.microsoft.com and manage your subscription from there." },
];

export default function SupportPage() {
  const { toast } = useToast();
  const [openFaq, setOpenFaq]   = useState<number | null>(null);
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [email, setEmail]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setSubject(""); setMessage(""); setEmail("");
    toast({ title: "✅ Ticket submitted", description: "We'll reply within 24 hours." });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="bg-white border-b border-border px-6 py-3 flex items-center gap-3">
        <a href="/landing" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm">MailVault Pro</span>
        </a>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-bold">Support</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2">How can we help?</h1>
          <p className="text-muted-foreground">Browse FAQs or submit a support ticket below.</p>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Book,          title: "Documentation",  desc: "Guides & tutorials",    href: "#faq" },
            { icon: MessageSquare, title: "Submit Ticket",  desc: "Get personalized help",  href: "#ticket" },
            { icon: Mail,          title: "Email Support",  desc: "support@mailvault.io",   href: "mailto:support@mailvault.io" },
          ].map(({ icon: Icon, title, desc, href }) => (
            <a key={title} href={href} className="bg-white border border-border rounded-2xl p-4 hover:shadow-md transition-shadow text-center block">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-bold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <section id="faq">
          <h2 className="text-xl font-black mb-4">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <p className="text-sm font-bold pr-4">{faq.q}</p>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Ticket form */}
        <section id="ticket">
          <h2 className="text-xl font-black mb-4">Submit a Support Ticket</h2>
          <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs font-bold block mb-1">Your Email</label>
              <Input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Subject</label>
              <Input required placeholder="Brief description of your issue" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Message</label>
              <textarea
                required rows={5}
                placeholder="Describe your issue in detail…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {submitting ? "Submitting…" : "Submit Ticket"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
