import { Shield, Check, Archive, RotateCcw, Trash2, BarChart3, Cloud, Lock } from "lucide-react";

const PLANS = [
  {
    id: "monthly", name: "Pro Monthly", price: "$9.99", period: "/user/month",
    desc: "Full-featured email backup and recovery",
    features: [
      "Unlimited backup storage",
      "All cloud providers",
      "AES-256 encryption",
      "Automated scheduling",
      "AI-powered analytics",
      "Multi-user support",
      "Priority support",
    ],
    cta: "Start Free Trial", highlighted: false,
  },
  {
    id: "annual", name: "Pro Annual", price: "$99.99", period: "/user/year",
    desc: "Save 17% with annual billing — best value",
    features: [
      "Everything in Monthly",
      "17% annual discount",
      "Dedicated account manager",
      "Custom retention policies",
      "SLA 99.9% uptime",
      "Advanced audit logs",
      "Volume seat discounts",
    ],
    cta: "Start Free Trial", highlighted: true,
  },
];

const FEATURES = [
  { icon: Archive,   title: "Automated Backups",   desc: "Schedule daily, weekly, or monthly backups of your entire mailbox or selected folders — runs silently in the background." },
  { icon: RotateCcw, title: "One-Click Restore",   desc: "Restore individual emails, entire folders, or your complete mailbox from any backup point with a few clicks." },
  { icon: Trash2,    title: "Smart Cleanup",       desc: "Safely delete old newsletters, duplicates, and promotional emails with a full preview before anything is permanently removed." },
  { icon: BarChart3, title: "Mailbox Analytics",   desc: "Deep insights into email volume trends, largest senders, folder sizes, storage usage, and cleanup savings." },
  { icon: Cloud,     title: "Multi-Cloud Storage", desc: "Store backups on Local, Azure Blob, OneDrive, Amazon S3, Google Drive, or Dropbox — or all of them at once." },
  { icon: Lock,      title: "AES-256 Encryption",  desc: "All backups are compressed and encrypted with military-grade AES-256-GCM before leaving your device." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Nav */}
      <nav className="bg-white border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-base">MailVault Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">Features</a>
          <a href="#pricing"  className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">Pricing</a>
          <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer"
            className="text-sm font-bold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
            Get on AppSource
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-blue-700 to-secondary text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight leading-tight">
            Enterprise Email Backup<br />for Microsoft 365
          </h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto">
            MailVault Pro backs up, encrypts, and restores your Outlook emails — automatically, securely, and directly inside Outlook.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer"
              className="bg-white text-primary font-black px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              Get Free Trial on AppSource
            </a>
            <a href="#features"
              className="bg-white/10 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/20">
              See Features
            </a>
          </div>
          <p className="text-sm text-blue-200">14-day free trial · No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-white border-b border-border py-5 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          {["Microsoft 365 Certified","SOC 2 Type II Ready","GDPR Compliant","AES-256 Encrypted","99.9% Uptime SLA"].map(t => (
            <div key={t} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <span className="font-medium">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">Everything you need to protect your email</h2>
            <p className="text-muted-foreground">Works directly inside Outlook — no separate app to install.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-border rounded-2xl p-5 hover:shadow-md transition-shadow">
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

      {/* Pricing */}
      <section id="pricing" className="py-16 px-6 bg-muted/50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Available exclusively on Microsoft AppSource. Billed through Microsoft.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {PLANS.map(plan => (
              <div key={plan.id} className={`rounded-2xl p-6 border-2 ${plan.highlighted ? "border-primary bg-primary shadow-xl shadow-primary/20 text-white" : "border-border bg-white"}`}>
                {plan.highlighted && (
                  <div className="text-center mb-3">
                    <span className="text-[10px] font-black bg-white/20 text-white px-3 py-1 rounded-full">BEST VALUE</span>
                  </div>
                )}
                <p className="font-black text-sm mb-0.5">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className={`text-xs mb-1 ${plan.highlighted ? "text-blue-100" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <p className={`text-xs mb-4 ${plan.highlighted ? "text-blue-100" : "text-muted-foreground"}`}>{plan.desc}</p>
                <div className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${plan.highlighted ? "text-blue-200" : "text-green-600"}`} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer"
                  className={`block text-center font-black text-sm py-2.5 rounded-xl transition-colors ${
                    plan.highlighted ? "bg-white text-primary hover:bg-blue-50" : "bg-primary text-white hover:bg-primary/90"
                  }`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Subscriptions managed entirely through Microsoft AppSource. No third-party billing.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-primary to-secondary text-white text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <h2 className="text-2xl font-black">Ready to protect your email?</h2>
          <p className="text-blue-100 text-sm">Get MailVault Pro from Microsoft AppSource and start your 14-day free trial today.</p>
          <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer"
            className="inline-block bg-white text-primary font-black px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
            Get it Free on Microsoft AppSource
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-sm">MailVault Pro</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="/eula"    className="hover:text-foreground">EULA</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/support" className="hover:text-foreground">Support</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 MailVault. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
