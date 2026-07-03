export interface Plan { id: string; label: string; price: number; days: number | null; }

export interface SiteSettings {
  appearance: { name: string; tagline: string; primaryColor: string };
  payment:    { walletAddress: string; network: string };
  plans:      Plan[];
  features:   { proEnabled: boolean };
  notifications: {
    webhookUrl: string; remindersEnabled: boolean; reminderDays: number;
    email: { enabled: boolean; to: string; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string; from: string };
  };
}

export interface LicenseRecord {
  licenseKey:  string;
  planId:      string;
  expiresAt:   string | null;
  issuedAt:    string;
  activatedAt: string | null;
  revoked:     boolean;
  email:       string | null;
  note:        string | null;
  txHash:      string | null;
}

export interface PaymentRecord {
  id:         string;
  planId:     string;
  planLabel:  string;
  price:      number;
  txHash:     string;
  walletFrom: string | null;
  note:       string | null;
  status:     "pending" | "approved" | "rejected";
  createdAt:  string;
  licenseKey: string | null;
}

const ADMIN_PASSWORD_KEY = "mailvault_admin_password";

export function getAdminPassword(): string {
  try { return sessionStorage.getItem(ADMIN_PASSWORD_KEY) ?? ""; } catch { return ""; }
}

export function setAdminPassword(pass: string): void {
  try { sessionStorage.setItem(ADMIN_PASSWORD_KEY, pass); } catch { /* no-op */ }
}

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": getAdminPassword(),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const fetchSettings = () => adminFetch<SiteSettings>("/api/admin/settings");
export const saveSettings  = (settings: Partial<SiteSettings>) =>
  adminFetch<SiteSettings>("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) });

export const fetchLicenses = () => adminFetch<{ items: LicenseRecord[] }>("/api/admin/licenses");
export const createLicenses = (payload: { planId: string; days?: number | null; count?: number; email?: string; note?: string }) =>
  adminFetch<{ items: LicenseRecord[] }>("/api/admin/licenses", { method: "POST", body: JSON.stringify(payload) });
export const revokeLicense   = (key: string) => adminFetch(`/api/admin/licenses/${encodeURIComponent(key)}/revoke`, { method: "PATCH" });
export const unrevokeLicense = (key: string) => adminFetch(`/api/admin/licenses/${encodeURIComponent(key)}/unrevoke`, { method: "PATCH" });
export const deleteLicense   = (key: string) => adminFetch(`/api/admin/licenses/${encodeURIComponent(key)}`, { method: "DELETE" });

export const fetchPayments = () => adminFetch<{ items: PaymentRecord[] }>("/api/admin/payments");
export const approvePayment = (id: string, days?: number | null) =>
  adminFetch<{ payment: PaymentRecord; license: LicenseRecord }>(`/api/admin/payments/${id}/approve`, { method: "POST", body: JSON.stringify({ days }) });
export const rejectPayment = (id: string) =>
  adminFetch<{ payment: PaymentRecord }>(`/api/admin/payments/${id}/reject`, { method: "POST" });
