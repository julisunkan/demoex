import { useState } from "react";
import {
  Shield, ChevronDown, ChevronRight, ExternalLink,
  Terminal, Building2, Users, CheckCircle2, AlertCircle,
  Globe, Lock, FileText, Zap, Download, Copy, Check,
} from "lucide-react";

type Section =
  | "overview" | "prerequisites" | "centralized" | "sideload"
  | "manifest" | "env" | "webhook" | "powershell" | "faq";

const NAV: { id: Section; label: string; icon: typeof Shield }[] = [
  { id: "overview",      label: "Overview",               icon: Globe },
  { id: "prerequisites", label: "Prerequisites",           icon: CheckCircle2 },
  { id: "centralized",   label: "Centralized Deployment",  icon: Building2 },
  { id: "sideload",      label: "Sideload for Testing",    icon: Zap },
  { id: "manifest",      label: "Manifest Reference",      icon: FileText },
  { id: "env",           label: "Environment Variables",   icon: Lock },
  { id: "webhook",       label: "Marketplace Webhooks",    icon: Globe },
  { id: "powershell",    label: "PowerShell Deployment",   icon: Terminal },
  { id: "faq",           label: "FAQ",                     icon: AlertCircle },
];

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <span className="text-gray-400 text-[10px] uppercase tracking-wide">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">{n}</div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="pb-8 flex-1">
        <p className="font-black text-sm mb-2">{title}</p>
        <div className="text-sm text-muted-foreground space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: "info" | "warning" | "success"; children: React.ReactNode }) {
  const styles = {
    info:    "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  const icons = { info: AlertCircle, warning: AlertCircle, success: CheckCircle2 };
  const Icon = icons[type];
  return (
    <div className={`flex gap-2.5 border rounded-xl p-3.5 text-xs ${styles[type]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3.5 text-left text-sm font-bold hover:text-primary transition-colors">
        {q}
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {open && <div className="pb-4 text-xs text-muted-foreground space-y-2 leading-relaxed">{children}</div>}
    </div>
  );
}

export default function DeploymentGuide() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <a href="/landing" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-sm">MailVault Pro</span>
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-bold text-muted-foreground">IT Admin Deployment Guide</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            Get on AppSource <ExternalLink className="w-3 h-3" />
          </a>
          <a href="/landing"
            className="text-xs font-bold bg-muted px-3 py-1.5 rounded-lg hover:bg-border transition-colors">
            ← Back to Product
          </a>
        </div>
      </nav>

      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-white sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto py-6 px-3 hidden md:block">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider px-3 mb-2">Contents</p>
          <nav className="space-y-0.5">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                  section === id
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 mx-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[10px] font-black text-primary mb-1">Need help?</p>
            <p className="text-[10px] text-muted-foreground mb-2">Our team can assist with enterprise deployment.</p>
            <a href="/support" className="text-[10px] font-bold text-primary hover:underline">Contact Support →</a>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 px-8 py-8 max-w-3xl">

          {/* ── Overview ── */}
          {section === "overview" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">IT Admin Guide</p>
                <h1 className="text-2xl font-black mb-3">MailVault Pro Deployment Guide</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This guide covers everything your IT team needs to deploy MailVault Pro for Outlook
                  across your Microsoft 365 organization — from AppSource licensing to centralized
                  add-in deployment, webhook configuration, and ongoing management.
                </p>
              </div>

              <Callout type="info">
                MailVault Pro is distributed exclusively through <strong>Microsoft AppSource</strong>.
                Licensing is managed by Microsoft — no separate billing portal required.
              </Callout>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Building2, title: "Centralized Deployment", desc: "Push to all users or selected groups via Microsoft 365 Admin Center — no user action needed." },
                  { icon: Users,     title: "Seat-Based Licensing",   desc: "Subscribe to the number of seats you need. Microsoft handles billing and renewals through AppSource." },
                  { icon: Lock,      title: "Zero-Trust Security",    desc: "MSAL OAuth only — no passwords stored. AES-256-GCM encryption at rest. SOC 2 Type II ready." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="border border-border rounded-xl p-4 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-black mb-1">{title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-border rounded-xl divide-y text-sm">
                {[
                  { step: "1", label: "Purchase on AppSource",         time: "5 min"  },
                  { step: "2", label: "Assign seats in Admin Center",  time: "10 min" },
                  { step: "3", label: "Deploy add-in to users/groups", time: "5 min"  },
                  { step: "4", label: "Configure webhook (optional)",   time: "15 min" },
                  { step: "5", label: "Users sign in & start backup",   time: "2 min"  },
                ].map(row => (
                  <div key={row.step} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{row.step}</div>
                      <span className="text-xs">{row.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium">{row.time}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSection("prerequisites")}
                  className="flex items-center gap-2 bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                  Start: Prerequisites <ChevronRight className="w-4 h-4" />
                </button>
                <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 border border-border font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-muted transition-colors">
                  AppSource Listing <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* ── Prerequisites ── */}
          {section === "prerequisites" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Step 1</p>
                <h1 className="text-2xl font-black mb-2">Prerequisites</h1>
                <p className="text-muted-foreground text-sm">Confirm the following before proceeding with deployment.</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Microsoft 365 Global Administrator or Exchange Administrator role", required: true },
                  { label: "Microsoft 365 Business Basic, Standard, Premium, E1, E3, or E5 subscription", required: true },
                  { label: "Outlook 2016 or later (desktop), Outlook on the web, or Outlook mobile (iOS/Android)", required: true },
                  { label: "Azure Active Directory (Entra ID) tenant — provided with any M365 subscription", required: true },
                  { label: "MailVault Pro AppSource subscription — purchased per-seat", required: true },
                  { label: "Azure Blob Storage, AWS S3, or OneDrive for cloud backup storage", required: false },
                  { label: "Server for webhook endpoint (for automated lifecycle events)", required: false },
                ].map(({ label, required }) => (
                  <div key={label} className="flex items-start gap-3 bg-white border border-border rounded-xl px-4 py-3">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${required ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 text-xs">{label}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${required ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}`}>
                      {required ? "Required" : "Optional"}
                    </span>
                  </div>
                ))}
              </div>

              <Callout type="warning">
                <strong>Delegated Admin:</strong> If you are a Microsoft Partner managing a customer's tenant,
                you must have Delegated Admin Privileges (DAP) or GDAP with the Exchange Administrator role before deploying add-ins.
              </Callout>

              <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-black">Supported Outlook clients</p>
                <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {[
                    "Outlook 2016 (MSI) v16.0.4266+",
                    "Outlook 2019 (MSI)",
                    "Microsoft 365 Apps for Enterprise",
                    "Outlook on the web (OWA)",
                    "Outlook for iOS v2.75.0+",
                    "Outlook for Android v4.0.0+",
                    "New Outlook for Windows",
                    "Outlook for Mac v16.0+",
                  ].map(c => (
                    <div key={c} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Centralized Deployment ── */}
          {section === "centralized" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Step 2 &amp; 3</p>
                <h1 className="text-2xl font-black mb-2">Centralized Deployment</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Centralized Deployment lets you push MailVault Pro directly to users' Outlook clients
                  with no user action required. The add-in appears automatically in Outlook's ribbon.
                </p>
              </div>

              <Callout type="success">
                Centralized Deployment is the <strong>recommended method</strong> for organizations with 5+ users.
                It supports automatic updates and group-based assignment.
              </Callout>

              <div className="space-y-1">
                <Step n={1} title="Purchase MailVault Pro on AppSource">
                  <p>Visit <a href="https://appsource.microsoft.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">Microsoft AppSource</a> and search for <strong>MailVault Pro for Outlook</strong>.</p>
                  <p>Select your plan (Monthly or Annual) and the number of seats. You will be billed by Microsoft.</p>
                  <p>After purchase, the subscription will appear in your Microsoft 365 Admin Center under <strong>Billing → Your products</strong>.</p>
                </Step>

                <Step n={2} title="Assign seats to users or groups">
                  <p>In the <a href="https://admin.microsoft.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">Microsoft 365 Admin Center</a>, go to:</p>
                  <CodeBlock lang="path" code="Billing → Your products → MailVault Pro → Assign users" />
                  <p>Assign seats individually, by group, or to the entire organization. Only licensed users can access Pro features.</p>
                </Step>

                <Step n={3} title="Deploy the add-in via Integrated Apps">
                  <p>Navigate to:</p>
                  <CodeBlock lang="path" code="Settings → Integrated apps → Get apps → Search: MailVault Pro" />
                  <p>Select <strong>MailVault Pro for Outlook</strong> from the AppSource results. Choose your deployment scope:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li><strong>Entire organization</strong> — all current and future licensed users</li>
                    <li><strong>Specific users/groups</strong> — recommended for phased rollouts</li>
                    <li><strong>Just me</strong> — for admin testing only</li>
                  </ul>
                </Step>

                <Step n={4} title="Accept permissions and deploy">
                  <p>Review the required Graph API permissions:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1 text-[11px]">
                    <li><code className="bg-muted px-1 rounded">Mail.Read</code> — read emails for backup</li>
                    <li><code className="bg-muted px-1 rounded">Mail.ReadWrite</code> — restore and cleanup emails</li>
                    <li><code className="bg-muted px-1 rounded">MailboxSettings.Read</code> — read mailbox configuration</li>
                  </ul>
                  <p>Click <strong>Accept permissions and deploy</strong>. The add-in will be available to users within <strong>12–24 hours</strong> (Microsoft propagation time).</p>
                </Step>

                <Step n={5} title="Verify deployment">
                  <p>After deployment, verify in Admin Center:</p>
                  <CodeBlock lang="path" code="Settings → Integrated apps → MailVault Pro → Status: Deployed" />
                  <p>Ask a pilot user to open Outlook and look for <strong>MailVault Pro</strong> in the ribbon under <strong>Home → Add-ins</strong>.</p>
                </Step>
              </div>

              <Callout type="info">
                <strong>Propagation time:</strong> Microsoft can take up to 24 hours to push the add-in to all users.
                If users don't see it after 24 hours, ask them to restart Outlook or clear the Office add-in cache.
              </Callout>
            </div>
          )}

          {/* ── Sideload for Testing ── */}
          {section === "sideload" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Testing</p>
                <h1 className="text-2xl font-black mb-2">Sideload for Testing</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Before deploying to your organization, test the add-in by sideloading the manifest
                  into your own Outlook client. No admin privileges needed for personal testing.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-black mb-3">Outlook on the web (fastest)</p>
                  <div className="space-y-1">
                    <Step n={1} title="Open Outlook on the web">
                      <p>Go to <a href="https://outlook.office.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">outlook.office.com</a> and sign in with your Microsoft account.</p>
                    </Step>
                    <Step n={2} title="Add a custom add-in">
                      <p>Click the <strong>Apps</strong> icon in the toolbar → <strong>Add apps</strong> → <strong>More apps</strong> → at the bottom, click <strong>Add a custom add-in</strong> → <strong>Add from URL</strong>.</p>
                    </Step>
                    <Step n={3} title="Enter the manifest URL">
                      <CodeBlock lang="url" code="https://your-deployed-app.replit.app/manifest.xml" />
                      <p>Replace with your actual deployed URL. Click <strong>OK</strong> — the add-in will appear in your toolbar within seconds.</p>
                    </Step>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black mb-3">Outlook Desktop (Windows)</p>
                  <div className="space-y-1">
                    <Step n={1} title="Open the Add-ins dialog">
                      <p>In Outlook Desktop: <strong>File → Manage Add-ins</strong> (this opens Outlook on the web for add-in management).</p>
                    </Step>
                    <Step n={2} title="Add from file">
                      <p>Click <strong>My add-ins</strong> → <strong>Add a custom add-in</strong> → <strong>Add from file…</strong> and select your local <code className="bg-muted px-1 rounded">manifest.xml</code>.</p>
                    </Step>
                  </div>
                </div>
              </div>

              <Callout type="warning">
                Sideloaded add-ins are per-user only and are not suitable for production deployment.
                Use Centralized Deployment for rolling out to your organization.
              </Callout>
            </div>
          )}

          {/* ── Manifest Reference ── */}
          {section === "manifest" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Reference</p>
                <h1 className="text-2xl font-black mb-2">Manifest Reference</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The <code className="bg-muted px-1 rounded text-xs">manifest.xml</code> file registers MailVault Pro with Outlook.
                  When deployed via AppSource, Microsoft hosts and manages the manifest automatically.
                  For sideloading or custom enterprise deployment, use the template below.
                </p>
              </div>

              <div className="flex gap-2">
                <a href="/manifest.xml" download
                  className="flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download manifest.xml
                </a>
              </div>

              <CodeBlock lang="xml" code={`<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">

  <Id>00000000-0000-0000-0000-000000000001</Id>
  <Version>1.0.0</Version>
  <ProviderName>MailVault</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="MailVault Pro for Outlook" />
  <Description DefaultValue="Enterprise email backup, restore and analytics — right inside Outlook." />
  <IconUrl DefaultValue="https://your-app.replit.app/icon-80.png" />
  <HighResolutionIconUrl DefaultValue="https://your-app.replit.app/icon-80.png" />

  <SupportUrl DefaultValue="https://your-app.replit.app/support" />
  <AppDomains>
    <AppDomain>your-app.replit.app</AppDomain>
  </AppDomains>

  <Requirements>
    <Sets><Set Name="Mailbox" MinVersion="1.1" /></Sets>
  </Requirements>

  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://your-app.replit.app/" />
        <RequestedHeight>550</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>

  <Permissions>ReadWriteMailbox</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read" />
  </Rule>
</OfficeApp>`} />

              <Callout type="info">
                Replace <code className="bg-blue-100 px-1 rounded">your-app.replit.app</code> with your actual deployment domain.
                The <code className="bg-blue-100 px-1 rounded">Id</code> GUID must be unique — generate one at <a href="https://www.guidgenerator.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">guidgenerator.com</a>.
              </Callout>
            </div>
          )}

          {/* ── Environment Variables ── */}
          {section === "env" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Configuration</p>
                <h1 className="text-2xl font-black mb-2">Environment Variables</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Configure these environment variables on your server before deploying to production.
                  Variables prefixed with <code className="bg-muted px-1 rounded text-xs">VITE_</code> are
                  exposed to the frontend; all others remain server-side only.
                </p>
              </div>

              {[
                {
                  group: "Azure AD / MSAL (Required for production login)",
                  vars: [
                    { name: "VITE_AZURE_CLIENT_ID",   example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", desc: "Azure AD app registration Client ID" },
                    { name: "VITE_AZURE_TENANT_ID",   example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", desc: "Your Azure AD tenant ID (or 'common' for multi-tenant)" },
                    { name: "VITE_AZURE_REDIRECT_URI", example: "https://your-app.replit.app/",       desc: "Must match redirect URI in Azure app registration" },
                  ],
                },
                {
                  group: "Microsoft Marketplace SaaS Fulfillment (Required for paid subscriptions)",
                  vars: [
                    { name: "AZURE_TENANT_ID",         example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", desc: "AAD tenant ID for server-side Graph API calls" },
                    { name: "AZURE_CLIENT_ID",         example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", desc: "Service principal Client ID" },
                    { name: "AZURE_CLIENT_SECRET",     example: "your-client-secret",                  desc: "Service principal Client Secret (keep secret!)" },
                    { name: "MARKETPLACE_WEBHOOK_SECRET", example: "your-webhook-secret",              desc: "Shared secret to validate webhook signatures" },
                  ],
                },
                {
                  group: "Cloud Storage (Optional — enable per provider)",
                  vars: [
                    { name: "AZURE_STORAGE_CONNECTION_STRING", example: "DefaultEndpointsProtocol=https;…", desc: "Azure Blob Storage connection string" },
                    { name: "AZURE_STORAGE_CONTAINER",         example: "mailvault-backups",               desc: "Default Blob container name" },
                    { name: "AWS_ACCESS_KEY_ID",               example: "AKIAIOSFODNN7EXAMPLE",            desc: "AWS credentials for S3 backup storage" },
                    { name: "AWS_SECRET_ACCESS_KEY",           example: "wJalrXUtnFEMI/K7MDENG/…",        desc: "AWS Secret Key (keep secret!)" },
                    { name: "AWS_REGION",                      example: "us-east-1",                       desc: "AWS region for S3 bucket" },
                    { name: "S3_BUCKET",                       example: "my-mailvault-backups",            desc: "S3 bucket name for backup storage" },
                  ],
                },
                {
                  group: "Admin Portal",
                  vars: [
                    { name: "VITE_ADMIN_PASSWORD", example: "supersecret123", desc: "Client-side admin portal password gate" },
                    { name: "ADMIN_PASSWORD",      example: "supersecret123", desc: "Server-side admin route authentication" },
                  ],
                },
                {
                  group: "Application",
                  vars: [
                    { name: "PORT",     example: "3001", desc: "Express server port (default: 3001)" },
                    { name: "NODE_ENV", example: "production", desc: "Set to 'production' for optimized builds" },
                  ],
                },
              ].map(group => (
                <div key={group.group}>
                  <p className="text-xs font-black mb-2 text-foreground">{group.group}</p>
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-4 py-2 font-bold text-muted-foreground">Variable</th>
                          <th className="text-left px-4 py-2 font-bold text-muted-foreground">Example value</th>
                          <th className="text-left px-4 py-2 font-bold text-muted-foreground hidden sm:table-cell">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.vars.map(v => (
                          <tr key={v.name}>
                            <td className="px-4 py-2.5 font-mono text-primary font-bold whitespace-nowrap">{v.name}</td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground text-[10px]">{v.example}</td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{v.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <Callout type="warning">
                <strong>Security:</strong> Never commit secrets to source control. Use Replit Secrets
                (or your deployment platform's secret manager) to store all credentials.
                Client Secret and AWS keys should only ever live in server-side env vars.
              </Callout>
            </div>
          )}

          {/* ── Webhook ── */}
          {section === "webhook" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Marketplace Integration</p>
                <h1 className="text-2xl font-black mb-2">Marketplace Webhooks</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Microsoft sends lifecycle event webhooks to your server when subscriptions change —
                  new subscriptions, cancellations, plan changes, seat adjustments, and renewals.
                  Your endpoint must respond within 10 seconds with HTTP 200.
                </p>
              </div>

              <div className="bg-white border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-black">Webhook endpoint</p>
                <CodeBlock lang="url" code="POST https://your-app.replit.app/api/marketplace/webhook" />
              </div>

              <div>
                <p className="text-sm font-black mb-3">Registering the webhook in Partner Center</p>
                <div className="space-y-1">
                  <Step n={1} title="Open Partner Center">
                    <p>Go to <a href="https://partner.microsoft.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">partner.microsoft.com</a> → <strong>Marketplace offers → Your offer → Technical configuration</strong>.</p>
                  </Step>
                  <Step n={2} title="Enter the webhook URL">
                    <p>In the <strong>Connection webhook</strong> field, enter your endpoint URL:</p>
                    <CodeBlock lang="url" code="https://your-app.replit.app/api/marketplace/webhook" />
                  </Step>
                  <Step n={3} title="Set the webhook secret">
                    <p>Generate a strong secret and add it to your server as <code className="bg-muted px-1 rounded">MARKETPLACE_WEBHOOK_SECRET</code>.
                    Microsoft will sign each webhook payload — your server validates the signature before processing.</p>
                  </Step>
                </div>
              </div>

              <div>
                <p className="text-sm font-black mb-2">Supported webhook events</p>
                <div className="bg-white border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-muted-foreground">Action</th>
                        <th className="px-4 py-2 text-left font-bold text-muted-foreground">Trigger</th>
                        <th className="px-4 py-2 text-left font-bold text-muted-foreground">Your response</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        { action: "Subscribed",             trigger: "New subscription created",           response: "Grant user access" },
                        { action: "Unsubscribed",           trigger: "Subscription cancelled",             response: "Revoke access, retain data 30 days" },
                        { action: "SuspendedDueToOverdue",  trigger: "Payment overdue",                    response: "Downgrade to read-only" },
                        { action: "Reinstated",             trigger: "Payment cleared",                    response: "Restore full access" },
                        { action: "ChangePlan",             trigger: "User upgraded/downgraded plan",      response: "Update features/limits" },
                        { action: "ChangeQuantity",         trigger: "Seat count changed",                 response: "Update seat limit" },
                        { action: "Renewed",                trigger: "Subscription renewed",               response: "Update renewal date" },
                        { action: "Transferred",            trigger: "Subscription transferred to new tenant", response: "Update owner record" },
                      ].map(row => (
                        <tr key={row.action}>
                          <td className="px-4 py-2.5 font-mono font-bold text-[11px]">{row.action}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{row.trigger}</td>
                          <td className="px-4 py-2.5">{row.response}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <CodeBlock lang="javascript" code={`// server/routes/marketplace.js — webhook handler
router.post("/webhook", (req, res) => {
  // 1. Validate Microsoft's signature
  const sig = req.headers["x-ms-marketplace-signature"];
  if (!validateSignature(sig, req.rawBody, process.env.MARKETPLACE_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { action, subscriptionId, planId, quantity } = req.body;

  switch (action) {
    case "Subscribed":
      // Grant access, create DB record, send welcome email
      break;
    case "Unsubscribed":
      // Revoke access, mark cancelled, schedule data cleanup
      break;
    case "SuspendedDueToOverdue":
      // Downgrade to read-only mode
      break;
    // ... other cases
  }

  // Must respond 200 within 10 seconds
  res.json({ status: "ok", action, subscriptionId });
});`} />
            </div>
          )}

          {/* ── PowerShell ── */}
          {section === "powershell" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">Advanced</p>
                <h1 className="text-2xl font-black mb-2">PowerShell Deployment</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For large organizations or automated CI/CD pipelines, deploy MailVault Pro via
                  the Exchange Online PowerShell module. This is equivalent to Centralized Deployment
                  but scriptable.
                </p>
              </div>

              <Callout type="info">
                Requires the <strong>Exchange Online PowerShell v3</strong> module and Exchange Administrator role.
              </Callout>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-black mb-2">1. Install the Exchange Online module</p>
                  <CodeBlock lang="powershell" code={`Install-Module -Name ExchangeOnlineManagement -Force -AllowClobber
Import-Module ExchangeOnlineManagement`} />
                </div>

                <div>
                  <p className="text-sm font-black mb-2">2. Connect to Exchange Online</p>
                  <CodeBlock lang="powershell" code={`Connect-ExchangeOnline -UserPrincipalName admin@yourorg.com`} />
                </div>

                <div>
                  <p className="text-sm font-black mb-2">3. Deploy MailVault Pro to all users</p>
                  <CodeBlock lang="powershell" code={`New-App -OrganizationApp \\
  -Url "https://your-app.replit.app/manifest.xml" \\
  -DefaultStateForUser Enabled \\
  -ProvidedTo Everyone`} />
                </div>

                <div>
                  <p className="text-sm font-black mb-2">4. Deploy to a specific security group</p>
                  <CodeBlock lang="powershell" code={`# Get the group object ID
$group = Get-DistributionGroup -Identity "MailVault-Pilot-Users"

New-App -OrganizationApp \\
  -Url "https://your-app.replit.app/manifest.xml" \\
  -DefaultStateForUser Enabled \\
  -ProvidedTo SpecificUsers \\
  -UserList $group.Members`} />
                </div>

                <div>
                  <p className="text-sm font-black mb-2">5. Verify deployment</p>
                  <CodeBlock lang="powershell" code={`Get-App -OrganizationApp | Where-Object { $_.DisplayName -like "*MailVault*" }`} />
                </div>

                <div>
                  <p className="text-sm font-black mb-2">6. Remove / undeploy</p>
                  <CodeBlock lang="powershell" code={`$app = Get-App -OrganizationApp | Where-Object { $_.DisplayName -like "*MailVault*" }
Remove-App -Identity $app.AppId -OrganizationApp -Confirm:$false`} />
                </div>
              </div>
            </div>
          )}

          {/* ── FAQ ── */}
          {section === "faq" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-xs text-primary font-bold mb-1">FAQ</p>
                <h1 className="text-2xl font-black mb-2">Frequently Asked Questions</h1>
              </div>

              <div className="bg-white border border-border rounded-xl px-5 divide-y">
                <FaqItem q="How long does centralized deployment take to propagate?">
                  <p>Microsoft typically propagates add-ins within 12–24 hours. If a user doesn't see the add-in after 24 hours, ask them to restart Outlook. For Outlook on the web, it usually appears within 30 minutes.</p>
                </FaqItem>
                <FaqItem q="Can users install the add-in themselves without IT?">
                  <p>Yes — users can search for and install MailVault Pro directly from AppSource within Outlook (Home → Get Add-ins). However, they will only get the Free tier unless an admin has assigned them a Pro license.</p>
                </FaqItem>
                <FaqItem q="What data does MailVault Pro store and where?">
                  <p>Backups are stored in the cloud storage provider you configure (Azure Blob, S3, OneDrive, etc.) — we never store email content on our servers. AES-256-GCM encryption is applied before data leaves the user's session. No email content passes through our API.</p>
                </FaqItem>
                <FaqItem q="Does MailVault Pro work with on-premises Exchange?">
                  <p>No. MailVault Pro requires Microsoft 365 (Exchange Online) and uses Microsoft Graph API. On-premises Exchange does not support Graph API add-ins. Consider migrating to Exchange Online for full compatibility.</p>
                </FaqItem>
                <FaqItem q="How do I remove MailVault Pro from all users at once?">
                  <p>In Microsoft 365 Admin Center: <strong>Settings → Integrated apps → MailVault Pro → Remove</strong>. This removes the add-in from all users immediately. Alternatively, use the PowerShell <code className="bg-muted px-1 rounded">Remove-App</code> command.</p>
                </FaqItem>
                <FaqItem q="Does the add-in work in Outlook mobile?">
                  <p>The add-in panel is available in Outlook for iOS and Android. However, some advanced features (scheduled backup, cleanup) are optimized for desktop and web Outlook. We recommend desktop/OWA for the best experience.</p>
                </FaqItem>
                <FaqItem q="What happens when a subscription expires?">
                  <p>The add-in remains installed but Pro features are locked. Users can still access the Dashboard and their most recent backup summary. To restore full access, renew the subscription through Microsoft AppSource — no reinstallation needed.</p>
                </FaqItem>
                <FaqItem q="Can I trial before purchasing for the whole organization?">
                  <p>Yes — purchase 1 seat and deploy to a pilot group first. After validating, purchase additional seats and expand the deployment scope. All settings and backups are preserved when upgrading seats.</p>
                </FaqItem>
                <FaqItem q="How do I get enterprise pricing or volume discounts?">
                  <p>Contact us at <a href="mailto:enterprise@mailvault.app" className="text-primary font-bold hover:underline">enterprise@mailvault.app</a> for organizations with 100+ seats. We also offer custom SLAs, dedicated support, and custom data retention policies.</p>
                </FaqItem>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-black mb-1">Still have questions?</p>
                  <p className="text-xs text-muted-foreground">Our enterprise support team responds within 4 business hours.</p>
                </div>
                <a href="/support" className="shrink-0 text-xs font-bold bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                  Contact Support →
                </a>
              </div>
            </div>
          )}

          {/* Section nav bottom */}
          <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
            {NAV.findIndex(n => n.id === section) > 0 ? (
              <button
                onClick={() => setSection(NAV[NAV.findIndex(n => n.id === section) - 1].id)}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                ← {NAV[NAV.findIndex(n => n.id === section) - 1].label}
              </button>
            ) : <div />}
            {NAV.findIndex(n => n.id === section) < NAV.length - 1 ? (
              <button
                onClick={() => setSection(NAV[NAV.findIndex(n => n.id === section) + 1].id)}
                className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                {NAV[NAV.findIndex(n => n.id === section) + 1].label} →
              </button>
            ) : <div />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-6 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-sm">MailVault Pro</span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="/landing" className="hover:text-foreground">Product</a>
            <a href="/deploy"  className="hover:text-foreground font-bold text-foreground">Deployment Guide</a>
            <a href="/support" className="hover:text-foreground">Support</a>
            <a href="/eula"    className="hover:text-foreground">EULA</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 MailVault. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
