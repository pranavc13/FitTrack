"use client";

import useSWR, { mutate as globalMutate, type SWRConfiguration } from "swr";
import { enqueue } from "./offline";
import { uuid } from "@/lib/utils";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

const BASE = "/api/v1";

async function request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: "same-origin",
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body == null ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      ...init,
    });
  } catch {
    throw new ApiClientError(0, "You're offline or the server can't be reached.");
  }
  // Admin endpoints have their own sign-in, so their 401s stay on the admin page.
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login") && !path.startsWith("/admin")) {
    location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
  }
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new ApiClientError(res.status, (data as { error?: string })?.error ?? `Request failed (${res.status})`, (data as { details?: unknown })?.details);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  upload: <T>(path: string, form: FormData) => request<T>("POST", path, form),
};

/** SWR hook over the API. Keys are API paths (null to skip). */
export function useApi<T>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, (p: string) => api.get<T>(p), { revalidateOnFocus: true, dedupingInterval: 2000, keepPreviousData: true, ...config });
}

/** Revalidates every cached key that starts with one of the prefixes. */
export function invalidate(...prefixes: string[]) {
  return globalMutate((key) => typeof key === "string" && prefixes.some((p) => key.startsWith(p)), undefined, { revalidate: true });
}

export type SyncState = "saved" | "queued";

/**
 * Mutations that should work offline (food, water, weight, activity). Each carries a clientId so the
 * server dedupes replays. When the network fails the request is queued and synced later.
 */
export async function offlineCapable<T>(method: "POST" | "PUT", path: string, payload: Record<string, unknown>, label: string): Promise<{ state: SyncState; data?: T }> {
  const body = { clientId: payload.clientId ?? uuid(), ...payload };
  try {
    const data = await request<T>(method, path, body);
    return { state: "saved", data };
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 0) {
      await enqueue({ method, path, body, label });
      return { state: "queued" };
    }
    throw e;
  }
}
