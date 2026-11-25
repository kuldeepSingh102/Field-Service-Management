import type { PendingUpdate, WorkOrder } from "@/lib/types";

const DB_NAME = "gridline-offline";
const DB_VERSION = 1;
const UPDATE_STORE = "updates";
const MEDIA_STORE = "media";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(UPDATE_STORE)) db.createObjectStore(UPDATE_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function readUpdates(scope = "demo"): Promise<PendingUpdate[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(UPDATE_STORE).objectStore(UPDATE_STORE).getAll();
    request.onsuccess = () => resolve((request.result as PendingUpdate[]).filter((item) => (item.scope ?? "demo") === scope).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.id.localeCompare(b.id)));
    request.onerror = () => reject(request.error);
  });
}

export async function queueUpdate(update: PendingUpdate, scope = "demo"): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(UPDATE_STORE, "readwrite");
    tx.objectStore(UPDATE_STORE).put({ ...update, scope });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearUpdate(id: string): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(UPDATE_STORE, "readwrite");
    tx.objectStore(UPDATE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveLocalOrders(orders: WorkOrder[], scope = "demo"): Promise<void> {
  localStorage.setItem(`gridline:${scope}:orders`, JSON.stringify(orders));
}

export function getLocalOrders(scope = "demo"): WorkOrder[] | null {
  try {
    const value = localStorage.getItem(`gridline:${scope}:orders`);
    return value ? JSON.parse(value) as WorkOrder[] : null;
  } catch {
    return null;
  }
}

export async function storeMedia(workOrderId: string, file: File, scope = "demo"): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    tx.objectStore(MEDIA_STORE).put({ id: crypto.randomUUID(), scope, workOrderId, name: file.name, type: file.type, blob: file, storedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listMedia(scope = "demo"): Promise<Array<{ id: string; scope?: string; workOrderId: string; name: string; type: string; blob: Blob }>> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(MEDIA_STORE).objectStore(MEDIA_STORE).getAll();
    request.onsuccess = () => resolve((request.result as Array<{ id: string; scope?: string; workOrderId: string; name: string; type: string; blob: Blob }>).filter((item) => (item.scope ?? "demo") === scope));
    request.onerror = () => reject(request.error);
  });
}

export async function clearMedia(id: string): Promise<void> {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    tx.objectStore(MEDIA_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function clearGridlineOfflineData(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("gridline:")) localStorage.removeItem(key);
  }
  if ("indexedDB" in window) indexedDB.deleteDatabase(DB_NAME);
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_FIELD_SHELL" });
}
