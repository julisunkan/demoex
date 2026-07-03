import { useState } from "react";
import {
  Shield, Check, Archive, RotateCcw, Trash2, BarChart3,
  Cloud, Lock, Star, Users, Building2, ChevronDown, ChevronRight,
  Zap, Clock, Globe, ArrowRight, KeyRound, Wallet,
} from "lucide-react";

const PLANS = [
  {
    id: "free", name: "Free", price: "$0", period: "",
    desc: "Get started at no cost",
    features: [
      "1 mailbox",
      "Local storage only",
      "Manual backups",
      "Basic analytics",
      "Community support",
    ],
    cta: "Download Free", highlighted: false, badge: null,
  },
  {
    id: "monthly", name: "Pro Monthly", price: "$9.99", period: "/month",
    desc: "Full-featured email protection",
    features: [
      "Unlimited mailboxes",
      "All cloud storage providers",
      "AES-256-GCM encryption",
      "Automated scheduling",
      "AI-powered analytics",
      "Multi-user & group support",
      "Priority email support",
    ],
    cta: "Get License", highlighted: false, badge: null,
  },
  {
    id: "annual", name: "Pro Annual", price: "$99.99", period: "/year",
    desc: "Save 17% — best value for teams",
    features: [
      "Everything in Pro Monthly",
      "17% annual discount",
      "Custom retention policies",
      "99.9% uptime SLA",
      "Advanced audit logs",
      "Volume seat discounts",
    ],
    cta: "Get License", highlighted: true, badge: "BEST VALUE",
  },
];

const FEATURES = [
  { icon: Archive,   title: "Automated Backups",    desc: "Schedule daily, weekly, or monthly backups of your entire mailbox or selected folders. Runs silently in the background — no manual steps." },
  { icon: RotateCcw, title: "One-Click Restore",    desc: "Restore individual emails, entire folders, or your complete mailbox from any backup point. Preview before restoring — no accidental overwrites." },
  { icon: Trash2,    title: "Smart Cleanup",        desc: "Safely delete old newsletters, duplicates, and promotional emails. Full preview before anything is permanently removed." },
  { icon: BarChart3, title: "Mailbox Analytics",    desc: "Deep insights into email volume trends, largest senders, folder sizes, storage usage over time, and projected cleanup savings." },
  { icon: Cloud,     title: "Multi-Cloud Storage",  desc: "Store backups on Local, Azure Blob, OneDrive, Amazon S3, Google Drive, or Dropbox — configure multiple destinations simultaneously." },
  { icon: Lock,      title: "AES-256 Encryption",   desc: "All backups are compressed and encrypted with AES-256-GCM before leaving your device. Your encryption keys, your data." },
  { icon: Clock,     title: "Retention Policies",   desc: "Define how long backups are kept — 30 days, 1 year, or forever. Automated pruning keeps storage costs in check." },
  { icon: Zap,       title: "Instant Activation",   desc: "Install the add-in, pay with USDT or enter a license key, and your first backup runs in under 2 minutes. No sign-in required." },
  { icon: Globe,     title: "Centralized IT Deployment", desc: "IT admins can deploy to the entire organization via Microsoft 365 Admin Center with zero user action required." },
];

const TESTIMONIALS = [
  { name: "Sarah Chen", title: "IT Director · Contoso Ltd", body: "We rolled MailVault Pro to 120 users in under an hour using Centralized Deployment. The audit log and analytics are exactly what compliance needed.", stars: 5 },
  { name: "James Miller", title: "CTO · Fabrikam Inc", body: "After losing an email thread due to accidental deletion, MailVault's one-click restore saved the day. Worth every penny.", stars: 5 },
  { name: "Emma Wilson", title: "Office Manager · Northwind", body: "I'm not technical at all, but the setup wizard was incredibly simple. Scheduled backups just run — I never have to think about it.", stars: 5 },
];

const COMPARE_ROWS: { feature: string; mv: boolean | "partial"; manual: boolean | "partial"; others: boolean | "partial" }[] = [
  { feature: "Works inside Outlook",            mv: true,  manual: false, others: "partial" },
  { feature: "Automated scheduling",            mv: true,  manual: false, others: true },
  { feature: "AES-256 encryption at rest",      mv: true,  manual: false, others: "partial" },
  { feature: "One-click restore",               mv: true,  manual: false, others: true },
  { feature: "Multi-cloud storage",             mv: true,  manual: false, others: true },
  { feature: "AI-powered analytics",            mv: true,  manual: false, others: false },
  { feature: "IT centralized deployment",       mv: true,  manual: false, others: "partial" },
  { feature: "Pay with USDT or license key",    mv: true,  manual: false, others: false },
  { feature: "No forced Microsoft sign-in",     mv: true,  manual: false, others: "partial" },
  { feature: "SOC 2 / GDPR ready",             mv: true,  manual: false, others: "partial" },
];

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-bold hover:text-primary transition-colors">
        {q}
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {open && <div className="pb-4 text-sm text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  );
}

function Cell({ val }: { val: boolean | "partial" }) {
  if (val === true)      return <span className="text-green-600 font-black text-base">✓</span>;
  if (val === false)     return <span className="text-red-400 font-black text-base">✗</span>;
  return <span className="text-amber-500 text-xs font-bold">Partial</span>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ── Nav ── */}
      <nav className="bg-white border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-base">MailVault Pro</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="#features"  className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how"       className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing"   className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#compare"   className="text-sm text-muted-foreground hover:text-foreground transition-colors">Compare</a>
          <a href="/deploy"    className="text-sm text-muted-foreground hover:text-foreground transition-colors">IT Admin Guide</a>
        </div>
        <div className="flex items-center gap-2">
          <a href="/deploy" className="hidden sm:flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors">
            <Building2 className="w-3 h-3" /> Deploy
          </a>
          <a href="/" className="flex items-center gap-1.5 text-sm font-bold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
            Open App <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-primary via-blue-700 to-secondary text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold mb-2">
            <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            <span>4.9 / 5 · 500+ organizations</span>
          </div>
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Enterprise Email Backup<br />for Microsoft 365
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            MailVault Pro backs up, encrypts, and restores your Outlook emails — automatically
            and securely, directly inside Outlook. No sign-in wall, no third-party billing portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#pricing"
              className="flex items-center justify-center gap-2 bg-white text-primary font-black px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
              <Wallet className="w-4 h-4" />
              Pay with USDT or Use a License Key
            </a>
            <a href="#how"
              className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors border border-white/20 text-sm">
              See How It Works
            </a>
          </div>
          <p className="text-sm text-blue-200">Pay once with USDT · No recurring billing · License keys never expire unless you choose a term</p>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="bg-white border-b border-border py-5 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          {[
            "Microsoft 365 Certified",
            "SOC 2 Type II Ready",
            "GDPR Compliant",
            "AES-256-GCM Encrypted",
            "99.9% Uptime SLA",
            "Instant Activation",
          ].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="font-semibold">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof numbers ── */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "500+",   label: "Organizations" },
            { value: "50K+",   label: "Mailboxes backed up" },
            { value: "99.9%",  label: "Uptime SLA" },
            { value: "4.9★",   label: "Customer rating" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-black text-primary mb-1">{value}</p>
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Features</p>
            <h2 className="text-3xl font-black mb-3">Everything you need to protect your email</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">Works directly inside Outlook — no separate app to install, no forced sign-in to remember.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-black text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">How it works</p>
            <h2 className="text-3xl font-black mb-3">Up and running in minutes</h2>
            <p className="text-muted-foreground text-sm">Three simple steps — no Microsoft account required to unlock Pro.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "1", icon: Wallet,    title: "Pay with USDT or get a key", desc: "Send USDT to our wallet and submit your transaction hash, or receive a license key directly from your administrator." },
              { n: "2", icon: Users,     title: "Deploy to users",        desc: "Use Centralized Deployment in Settings → Integrated Apps to push the add-in to users or groups — zero user action needed." },
              { n: "3", icon: KeyRound,  title: "Enter your license key & go", desc: "Open MailVault Pro in the ribbon, enter your license key in Settings, and your first backup starts automatically." },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black text-primary mb-1">STEP {n}</div>
                <h3 className="font-black text-sm mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href="/deploy" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              Full IT Admin Deployment Guide <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Testimonials</p>
            <h2 className="text-3xl font-black mb-3">Loved by IT teams and end users alike</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, title, body, stars }) => (
              <div key={name} className="bg-white border border-border rounded-2xl p-5 flex flex-col">
                <div className="flex mb-3">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">"{body}"</p>
                <div>
                  <p className="text-xs font-black">{name}</p>
                  <p className="text-[10px] text-muted-foreground">{title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Pricing</p>
            <h2 className="text-3xl font-black mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-sm">Pay once with USDT or redeem a license key issued by your administrator. No recurring Microsoft billing.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {PLANS.map(plan => (
              <div key={plan.id} className={`rounded-2xl p-5 border-2 flex flex-col ${
                plan.highlighted ? "border-primary bg-primary shadow-xl shadow-primary/20 text-white" : "border-border bg-white"
              }`}>
                {plan.badge && (
                  <div className="text-center mb-3">
                    <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1 rounded-full">{plan.badge}</span>
                  </div>
                )}
                <p className="font-black text-sm mb-0.5">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-black">{plan.price}</span>
                  {plan.period && <span className={`text-xs mb-1 ${plan.highlighted ? "text-blue-100" : "text-muted-foreground"}`}>{plan.period}</span>}
                </div>
                <p className={`text-xs mb-4 ${plan.highlighted ? "text-blue-100" : "text-muted-foreground"}`}>{plan.desc}</p>
                <div className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${plan.highlighted ? "text-blue-200" : "text-green-600"}`} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="#how"
                  className={`block text-center font-black text-sm py-2.5 rounded-xl transition-colors ${
                    plan.highlighted ? "bg-white text-primary hover:bg-blue-50" : "bg-primary text-white hover:bg-primary/90"
                  }`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-5">
            Pay once with USDT — no recurring subscriptions, no third-party billing portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <a href="/"
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-primary border border-primary/20 bg-primary/5 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">
              <Wallet className="w-3.5 h-3.5" /> Open the app to pay with USDT
            </a>
            <a href="mailto:enterprise@mailvault.app"
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors">
              <Building2 className="w-3.5 h-3.5" /> Enterprise pricing (100+ seats)
            </a>
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section id="compare" className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">Compare</p>
            <h2 className="text-3xl font-black mb-3">Why MailVault Pro?</h2>
            <p className="text-muted-foreground text-sm">See how we stack up against manual backup methods and generic tools.</p>
          </div>
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-bold">Feature</th>
                  <th className="px-4 py-3 text-primary font-black text-center">MailVault Pro</th>
                  <th className="px-4 py-3 text-muted-foreground font-bold text-center">Manual</th>
                  <th className="px-4 py-3 text-muted-foreground font-bold text-center">Other tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARE_ROWS.map(({ feature, mv, manual, others }) => (
                  <tr key={feature} className="hover:bg-muted/30">
                    <td className="px-5 py-3 text-foreground">{feature}</td>
                    <td className="px-4 py-3 text-center"><Cell val={mv} /></td>
                    <td className="px-4 py-3 text-center"><Cell val={manual} /></td>
                    <td className="px-4 py-3 text-center"><Cell val={others} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── IT Admin CTA ── */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto bg-white border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-black text-base mb-1">IT Administrator?</p>
            <p className="text-sm text-muted-foreground">Deploy MailVault Pro to your entire organization in under an hour using Microsoft 365 Centralized Deployment. Full PowerShell support included.</p>
          </div>
          <a href="/deploy" className="shrink-0 flex items-center gap-2 bg-primary text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap">
            Deployment Guide <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">FAQ</p>
            <h2 className="text-3xl font-black mb-3">Common questions</h2>
          </div>
          <div className="bg-white border border-border rounded-2xl px-6">
            <FaqItem q="Does MailVault Pro require a separate login?">
              No. MailVault Pro opens directly inside Outlook — there's no Microsoft sign-in wall. To unlock Pro features, pay with USDT or enter a license key issued by your administrator.
            </FaqItem>
            <FaqItem q="Where are my backups stored?">
              You choose: Local disk, Azure Blob Storage, OneDrive, Amazon S3, Google Drive, or Dropbox. We never store your email content on our own servers.
            </FaqItem>
            <FaqItem q="Is there a free trial?">
              The Free plan lets you try core backup features immediately. Upgrading to Pro is a one-time USDT payment or a license key — no recurring billing, cancel anytime by simply not renewing.
            </FaqItem>
            <FaqItem q="Can IT admins deploy to the whole organization?">
              Yes. Use Microsoft 365 Admin Center Centralized Deployment or PowerShell. The add-in appears in users' Outlook ribbons automatically — no user action needed. See the <a href="/deploy" className="text-primary font-bold hover:underline">IT Admin Deployment Guide</a>.
            </FaqItem>
            <FaqItem q="What Outlook versions are supported?">
              Outlook 2016+, Microsoft 365 Apps, Outlook on the web, Outlook for iOS, and Outlook for Android. New Outlook for Windows is also supported.
            </FaqItem>
            <FaqItem q="How is billing handled?">
              Pay directly with USDT to the wallet address shown in the app, then submit your transaction hash for verification. Alternatively, redeem a license key issued by your administrator. No third-party payment portal.
            </FaqItem>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-secondary text-white text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-3xl font-black">Ready to protect your email?</h2>
          <p className="text-blue-100 text-sm leading-relaxed">
            Join 500+ organizations that trust MailVault Pro to back up, restore,
            and secure their Microsoft 365 email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/"
              className="flex items-center justify-center gap-2 bg-white text-primary font-black px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
              Get Started — Pay with USDT
            </a>
            <a href="/deploy"
              className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors border border-white/20 text-sm">
              <Building2 className="w-4 h-4" /> IT Admin Guide
            </a>
          </div>
          <p className="text-xs text-blue-200">No recurring billing · No forced sign-in · Instant activation with a license key</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-sm">MailVault Pro</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Enterprise email backup & recovery built for Microsoft 365. Pay with USDT or a license key — no forced sign-in.
              </p>
            </div>
            <div className="flex gap-12 text-xs">
              <div className="space-y-2">
                <p className="font-black text-foreground">Product</p>
                <div className="space-y-1.5 text-muted-foreground">
                  <a href="#features" className="block hover:text-foreground">Features</a>
                  <a href="#pricing"  className="block hover:text-foreground">Pricing</a>
                  <a href="#compare"  className="block hover:text-foreground">Compare</a>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-black text-foreground">Resources</p>
                <div className="space-y-1.5 text-muted-foreground">
                  <a href="/deploy"   className="block hover:text-foreground font-bold text-foreground">IT Deployment Guide</a>
                  <a href="/support"  className="block hover:text-foreground">Support</a>
                  <a href="/eula"     className="block hover:text-foreground">EULA</a>
                  <a href="/privacy"  className="block hover:text-foreground">Privacy Policy</a>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-black text-foreground">Contact</p>
                <div className="space-y-1.5 text-muted-foreground">
                  <a href="mailto:support@mailvault.app"    className="block hover:text-foreground">Support</a>
                  <a href="mailto:enterprise@mailvault.app" className="block hover:text-foreground">Enterprise Sales</a>
                  <a href="mailto:security@mailvault.app"   className="block hover:text-foreground">Security</a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2026 MailVault. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span>Microsoft 365 Certified Add-in</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
