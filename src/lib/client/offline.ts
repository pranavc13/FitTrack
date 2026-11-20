"use client";

import { uuid } from "@/lib/utils";

/**
 * Offline mutation queue in IndexedDB. Writes made without connectivity are stored here and replayed
 * when the browser comes back online (and via Background Sync where supported). Every queued body has
 * a clientId so the server treats replays idempotently.
 */
export interface QueuedRequest {
  id: string;
  method: "POST" | "PUT";
  path: string;
  body: Record<string, unknown>;
  label: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const DB = "fittrack-offline";
const STORE = "queue";
const listeners = new Set<() => void>();

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

const notify = () => listeners.forEach((l) => l());

export function onQueueChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function enqueue(item: Omit<QueuedRequest, "id" | "createdAt" | "attempts">) {
  await tx("readwrite", (s) => s.put({ ...item, id: uuid(), createdAt: Date.now(), attempts: 0 }));
  notify();
  try {
    const reg = await navigator.serviceWorker?.ready;
    await (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } })?.sync?.register("fittrack-sync");
  } catch {
    /* Background Sync not supported: the 'online' listener will flush */
  }
}

export async function listQueue(): Promise<QueuedRequest[]> {
  try {
    return ((await tx("readonly", (s) => s.getAll())) as QueuedRequest[]).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function removeQueued(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  notify();
}

let flushing = false;

/** Replays queued requests in order. Permanent failures (4xx) are kept with an error for the user to review. */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing || !navigator.onLine) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    for (const item of await listQueue()) {
      if (item.lastError && item.attempts >= 3) continue;
      try {
        const res = await fetch("/api/v1" + item.path, { method: item.method, headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(item.body) });
        if (res.ok) {
          await removeQueued(item.id);
          synced++;
        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          const err = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`;
          await tx("readwrite", (s) => s.put({ ...item, attempts: item.attempts + 1, lastError: err }));
          failed++;
        } else break; // server trouble: try later
      } catch {
        break; // offline again
      }
    }
  } finally {
    flushing = false;
    notify();
  }
  return { synced, failed };
}
