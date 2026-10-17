import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  Transaction,
  OutboxOp,
  SyncConflict,
  AppMeta,
} from "../domain/types";

export const DB_NAME = "bifogat_db";
export const DB_VERSION = 1;

export type StoreName =
  | "hives"
  | "events"
  | "tasks"
  | "harvests"
  | "transactions"
  | "outbox"
  | "meta"
  | "conflicts";

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Version 1 upgrade
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("hives")) {
          db.createObjectStore("hives", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("events")) {
          const eventStore = db.createObjectStore("events", { keyPath: "id" });
          eventStore.createIndex("by_hive", "hiveId", { unique: false });
          eventStore.createIndex("by_date", "date", { unique: false });
        }

        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("by_status", "status", { unique: false });
          taskStore.createIndex("by_due", "dueDate", { unique: false });
        }

        if (!db.objectStoreNames.contains("harvests")) {
          const harvestStore = db.createObjectStore("harvests", { keyPath: "id" });
          harvestStore.createIndex("by_date", "date", { unique: false });
        }

        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", { keyPath: "id" });
          txStore.createIndex("by_date", "date", { unique: false });
        }

        if (!db.objectStoreNames.contains("outbox")) {
          const outboxStore = db.createObjectStore("outbox", { keyPath: "id" });
          outboxStore.createIndex("by_timestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains("conflicts")) {
          const conflictStore = db.createObjectStore("conflicts", { keyPath: "id" });
          conflictStore.createIndex("by_status", "status", { unique: false });
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });

  return dbPromise;
}

/**
 * Get all records from a store
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as T[]) || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get single record by ID
 */
export async function getFromStore<T>(storeName: StoreName, key: IDBValidKey): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as T) || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put a record in a store
 */
export async function putInStore<T>(storeName: StoreName, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put multiple records in a store in a single transaction
 */
export async function bulkPutInStore<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a record by ID
 */
export async function deleteFromStore(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an entity and append an outbox operation in a single atomic transaction.
 * If IndexedDB fails, neither the entity nor the outbox operation is committed.
 */
export async function saveEntityWithOutbox<T>(
  storeName: StoreName,
  entity: T,
  outboxOp: OutboxOp,
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName, "outbox"], "readwrite");
    const entityStore = tx.objectStore(storeName);
    const outboxStore = tx.objectStore("outbox");

    entityStore.put(entity);
    outboxStore.put(outboxOp);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete an entity and append a delete outbox operation atomically.
 */
export async function deleteEntityWithOutbox(
  storeName: StoreName,
  key: IDBValidKey,
  outboxOp: OutboxOp,
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName, "outbox"], "readwrite");
    const entityStore = tx.objectStore(storeName);
    const outboxStore = tx.objectStore("outbox");

    entityStore.delete(key);
    outboxStore.put(outboxOp);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear a specific store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Full database backup export
 */
export async function exportAllData(): Promise<{
  version: number;
  exportedAt: string;
  hives: Hive[];
  events: HiveEvent[];
  tasks: Task[];
  harvests: Harvest[];
  transactions: Transaction[];
  outbox: OutboxOp[];
  meta: AppMeta[];
}> {
  const [hives, events, tasks, harvests, transactions, outbox, meta] = await Promise.all([
    getAllFromStore<Hive>("hives"),
    getAllFromStore<HiveEvent>("events"),
    getAllFromStore<Task>("tasks"),
    getAllFromStore<Harvest>("harvests"),
    getAllFromStore<Transaction>("transactions"),
    getAllFromStore<OutboxOp>("outbox"),
    getAllFromStore<AppMeta>("meta"),
  ]);

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    hives,
    events,
    tasks,
    harvests,
    transactions,
    outbox,
    meta,
  };
}

/**
 * Restore from full backup
 */
export async function restoreAllData(data: {
  hives?: Hive[];
  events?: HiveEvent[];
  tasks?: Task[];
  harvests?: Harvest[];
  transactions?: Transaction[];
  meta?: AppMeta[];
}): Promise<void> {
  if (data.hives) await bulkPutInStore("hives", data.hives);
  if (data.events) await bulkPutInStore("events", data.events);
  if (data.tasks) await bulkPutInStore("tasks", data.tasks);
  if (data.harvests) await bulkPutInStore("harvests", data.harvests);
  if (data.transactions) await bulkPutInStore("transactions", data.transactions);
  if (data.meta) await bulkPutInStore("meta", data.meta);
}
