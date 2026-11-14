"use client";

/**
 * Browser-only report storage (IndexedDB). Nothing is ever stored server-side.
 * Falls back to an in-memory map when IndexedDB is unavailable (private mode, tests).
 */

import type { SavedReport } from "../types";

const DB_NAME = "chatroast";
const STORE = "reports";
const VERSION = 1;

const memory = new Map<string, SavedReport>();

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    try {
      const t = db.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function newReportId(): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return rnd.replace(/-/g, "").slice(0, 12);
}

export async function saveReport(r: SavedReport): Promise<void> {
  memory.set(r.id, r);
  try {
    await tx("readwrite", (s) => s.put(r));
  } catch {}
}

export async function getReport(id: string): Promise<SavedReport | null> {
  try {
    const r = await tx<SavedReport>("readonly", (s) => s.get(id));
    if (r) return r;
  } catch {}
  return memory.get(id) ?? null;
}

/** Newest first. */
export async function listReports(): Promise<SavedReport[]> {
  let all: SavedReport[] = [];
  try {
    all = (await tx<SavedReport[]>("readonly", (s) => s.getAll())) ?? [];
  } catch {}
  if (!all.length) all = [...memory.values()];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteReport(id: string): Promise<void> {
  memory.delete(id);
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {}
}

export async function deleteAllReports(): Promise<void> {
  memory.clear();
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {}
}
