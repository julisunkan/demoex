export interface Plan {
  id:    string;
  label: string;
  price: number;
  days:  number | null;
}

export interface BillingConfig {
  walletAddress: string;
  network:       string;
  plans:         Plan[];
}

export interface SubscriptionInfo {
  subscribed:  boolean;
  licenseKey?: string;
  planId?:     string;
  planLabel?:  string;
  expiresAt?:  string | null;
  reason?:     string;
}

export interface UsdtPayment {
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

const LICENSE_STORAGE_KEY = "mailvault_license_key";

export function getStoredLicenseKey(): string | null {
  try { return localStorage.getItem(LICENSE_STORAGE_KEY); } catch { return null; }
}

export function storeLicenseKey(key: string): void {
  try { localStorage.setItem(LICENSE_STORAGE_KEY, key); } catch { /* no-op */ }
}

export function clearLicenseKey(): void {
  try { localStorage.removeItem(LICENSE_STORAGE_KEY); } catch { /* no-op */ }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchBillingConfig(): Promise<BillingConfig> {
  const res = await fetch("/api/billing/config");
  return handle<BillingConfig>(res);
}

export async function verifyLicense(licenseKey: string): Promise<SubscriptionInfo> {
  try {
    const res = await fetch("/api/billing/license/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    });
    if (!res.ok) return { subscribed: false };
    return res.json();
  } catch {
    return { subscribed: false };
  }
}

export async function redeemLicense(licenseKey: string): Promise<SubscriptionInfo> {
  const res = await fetch("/api/billing/license/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey }),
  });
  return handle<SubscriptionInfo>(res);
}

export async function submitUsdtPayment(payload: {
  planId: string; txHash: string; walletFrom?: string; note?: string;
}): Promise<UsdtPayment> {
  const res = await fetch("/api/billing/usdt/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<UsdtPayment>(res);
}

export async function checkUsdtPaymentStatus(id: string): Promise<UsdtPayment> {
  const res = await fetch(`/api/billing/usdt/${id}`);
  return handle<UsdtPayment>(res);
}

export function formatExpiry(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "Lifetime";
  return new Date(expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function maskLicenseKey(key: string | undefined): string {
  if (!key) return "—";
  return key.length <= 8 ? key : `${key.slice(0, 8)}${"•".repeat(8)}${key.slice(-4)}`;
}
