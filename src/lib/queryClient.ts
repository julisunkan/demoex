import { QueryClient } from "@tanstack/react-query";
import { getOutlookHeaders, refreshOutlookToken } from "./outlookContext";

/**
 * Base URL for all API requests.
 * In development (Vite proxy), this is empty so relative URLs are used.
 * In production on a separate domain (e.g. Render static site + API service),
 * set VITE_API_URL to the backend origin, e.g. https://my-api.onrender.com
 */
const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

/** Resolve an API path to a full URL, prepending API_BASE when set. */
function resolveUrl(path: string): string {
  if (API_BASE && path.startsWith("/")) {
    return `${API_BASE.replace(/\/+$/, "")}${path}`;
  }
  return path;
}

/**
 * Build request headers, injecting Outlook auth when a token is available.
 */
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...getOutlookHeaders(),
    ...(extra ?? {}),
  };
}

/**
 * Fetch wrapper that retries once after refreshing the Outlook token on 401.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const fullUrl = resolveUrl(url);
  let res = await fetch(fullUrl, { ...init, headers: buildHeaders() });

  if (res.status === 401) {
    // Token may have expired — refresh and try once more
    await refreshOutlookToken();
    res = await fetch(fullUrl, { ...init, headers: buildHeaders() });
  }

  return res;
}

/**
 * Default query function — treats the first queryKey element as the URL.
 * On non-OK responses it throws so React Query's error state is populated.
 */
async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }) {
  const url = queryKey[0] as string;
  const res = await fetchWithRetry(url, {});

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn:   defaultQueryFn,
      staleTime: 30_000,
      retry:     1,
    },
  },
});

/**
 * Make an authenticated API request to the backend.
 * Automatically injects Outlook headers; retries once on 401.
 */
export async function apiRequest(
  method: string,
  url: string,
  body?: unknown
): Promise<Response> {
  const init: RequestInit = {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetchWithRetry(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res;
}
