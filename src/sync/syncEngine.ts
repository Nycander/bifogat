import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  Transaction,
  OutboxOp,
  SyncConflict,
  EntityType,
} from "../domain/types";
import {
  outboxRepository,
  conflictRepository,
  metaRepository,
  hiveRepository,
  eventRepository,
  taskRepository,
  harvestRepository,
  transactionRepository,
} from "../storage/repositories";
import { getAllFromStore, putInStore, deleteFromStore, bulkPutInStore } from "../storage/db";
import { sheetsClient, SHEET_TABS, SCHEMAS } from "./sheetsClient";
import { getAccessToken } from "../auth/googleAuth";

export type SyncState = "idle" | "syncing" | "error" | "offline" | "needs_auth" | "no_sheet";

export interface SyncEngineStatus {
  state: SyncState;
  lastSyncTime: string | null;
  pendingCount: number;
  conflictCount: number;
  lastError: string | null;
}

type SyncListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private state: SyncState = "idle";
  private lastError: string | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isRunning = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.triggerSync();
      });
      window.addEventListener("offline", () => {
        this.state = "offline";
        this.notify();
      });
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatusSync());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatusSync();
    for (const l of this.listeners) {
      try {
        l(status);
      } catch (err) {
        console.error("Error in sync listener:", err);
      }
    }
  }

  getStatusSync(): SyncEngineStatus {
    return {
      state: this.state,
      lastSyncTime: null, // will be populated asynchronously in getStatus()
      pendingCount: 0,
      conflictCount: 0,
      lastError: this.lastError,
    };
  }

  async getStatus(): Promise<SyncEngineStatus> {
    const meta = await metaRepository.get();
    const pendingCount = await outboxRepository.getCount();
    const conflicts = await conflictRepository.getAll();

    let state = this.state;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      state = "offline";
    } else if (!meta.spreadsheetId) {
      state = "no_sheet";
    }

    return {
      state,
      lastSyncTime: meta.lastSyncTime || null,
      pendingCount,
      conflictCount: conflicts.length,
      lastError: this.lastError,
    };
  }

  async triggerSync(options?: {
    allowWrite?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: "Synkronisering pågår redan" };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.state = "offline";
      this.notify();
      return { success: false, error: "Enheten är offline" };
    }

    const token = await getAccessToken();
    if (!token) {
      this.state = "needs_auth";
      this.notify();
      return { success: false, error: "Behörighet saknas. Logga in med Google." };
    }

    const meta = await metaRepository.get();
    if (!meta.spreadsheetId) {
      this.state = "no_sheet";
      this.notify();
      return { success: false, error: "Inget kalkylark är valt i inställningarna" };
    }

    this.isRunning = true;
    this.state = "syncing";
    this.lastError = null;
    this.notify();

    try {
      // 1. Ensure spreadsheet schema
      await sheetsClient.ensureSchema(token, meta.spreadsheetId);

      // 2. Pull remote records and detect conflicts (READ ONLY)
      await this.pullRemoteAndDetectConflicts(token, meta.spreadsheetId);

      // 3. Flush pending outbox operations to Google Sheets ONLY if allowed
      const shouldWrite = options?.allowWrite === true || !meta.requireManualWriteConfirmation;
      if (shouldWrite) {
        await this.flushOutbox(token, meta.spreadsheetId);
      }

      // 4. Update sync metadata
      const now = new Date().toISOString();
      await metaRepository.save({ lastSyncTime: now });

      this.state = "idle";
      this.lastError = null;
      this.notify();
      return { success: true };
    } catch (err: any) {
      console.error("Sync failed:", err);
      const isAuthError =
        err.message?.includes("401") ||
        err.message?.includes("UNAUTHENTICATED") ||
        err.message?.includes("Invalid Credentials");

      if (isAuthError) {
        this.state = "needs_auth";
        this.lastError =
          "Google-behörigheten har gått ut. Klicka på 'Förnya behörighet' i Inställningar för att återansluta kalkylarket.";
      } else {
        this.state = "error";
        this.lastError = err.message || "Ett okänt fel uppstod vid synkronisering";
      }
      this.notify();
      return { success: false, error: this.lastError || undefined };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Explicitly push all pending outbox operations to Google Sheets
   */
  async pushPendingOutbox(): Promise<{ success: boolean; error?: string; pushedCount: number }> {
    return this.triggerSync({ allowWrite: true }).then((res) => ({
      ...res,
      pushedCount: 0,
    }));
  }

  /**
   * Pull remote changes from all Sheets tabs and merge into local IndexedDB
   */
  private async pullRemoteAndDetectConflicts(token: string, spreadsheetId: string) {
    const outboxOps = await outboxRepository.getAll();
    const pendingRecordIds = new Set(outboxOps.map((op) => op.recordId));

    // A. Hives
    const remoteHives = await sheetsClient.readTab(token, spreadsheetId, SHEET_TABS.HIVES);
    for (const r of remoteHives) {
      if (!r.id) continue;
      const remoteHive: Hive = {
        id: r.id,
        name: r.name || "Namnlös kupa",
        status: (r.status as any) || "active",
        notes: r.notes || undefined,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      };

      const local = await hiveRepository.getById(r.id);
      if (pendingRecordIds.has(r.id) && local) {
        // If both modified and updatedAt differs
        if (local.updatedAt !== remoteHive.updatedAt) {
          await conflictRepository.addConflict({
            entity: "hive",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteHive,
          });
        }
      } else {
        // Safe to merge
        await putInStore("hives", remoteHive);
      }
    }

    // B. Events
    const remoteEvents = await sheetsClient.readTab(token, spreadsheetId, SHEET_TABS.EVENTS);
    for (const r of remoteEvents) {
      if (!r.id) continue;
      const remoteEvent: HiveEvent = {
        id: r.id,
        hiveId: r.hiveId,
        date: r.date || new Date().toISOString().substring(0, 10),
        type: (r.type as any) || "other",
        title: r.title || "",
        notes: r.notes || "",
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      };

      const local = await eventRepository.getById(r.id);
      if (pendingRecordIds.has(r.id) && local) {
        if (local.updatedAt !== remoteEvent.updatedAt) {
          await conflictRepository.addConflict({
            entity: "event",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteEvent,
          });
        }
      } else {
        await putInStore("events", remoteEvent);
      }
    }

    // C. Tasks
    const remoteTasks = await sheetsClient.readTab(token, spreadsheetId, SHEET_TABS.TASKS);
    for (const r of remoteTasks) {
      if (!r.id) continue;
      const remoteTask: Task = {
        id: r.id,
        title: r.title || "",
        notes: r.notes || undefined,
        hiveId: r.hiveId || undefined,
        dueDate: r.dueDate || undefined,
        status: (r.status as any) || "open",
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
        completedAt: r.completedAt || undefined,
      };

      const local = await taskRepository.getById(r.id);
      if (pendingRecordIds.has(r.id) && local) {
        if (local.updatedAt !== remoteTask.updatedAt) {
          await conflictRepository.addConflict({
            entity: "task",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteTask,
          });
        }
      } else {
        await putInStore("tasks", remoteTask);
      }
    }

    // D. Harvests
    const remoteHarvests = await sheetsClient.readTab(token, spreadsheetId, SHEET_TABS.HARVESTS);
    for (const r of remoteHarvests) {
      if (!r.id) continue;
      const remoteHarvest: Harvest = {
        id: r.id,
        date: r.date || new Date().toISOString().substring(0, 10),
        hiveId: r.hiveId || undefined,
        honeyWeightGrams: r.honeyWeightGrams ? parseInt(r.honeyWeightGrams, 10) : undefined,
        jarSizeGrams: r.jarSizeGrams ? parseInt(r.jarSizeGrams, 10) : undefined,
        jarCount: r.jarCount ? parseInt(r.jarCount, 10) : undefined,
        notes: r.notes || undefined,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      };

      const local = await harvestRepository.getById(r.id);
      if (pendingRecordIds.has(r.id) && local) {
        if (local.updatedAt !== remoteHarvest.updatedAt) {
          await conflictRepository.addConflict({
            entity: "harvest",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteHarvest,
          });
        }
      } else {
        await putInStore("harvests", remoteHarvest);
      }
    }

    // E. Transactions
    const remoteTx = await sheetsClient.readTab(token, spreadsheetId, SHEET_TABS.TRANSACTIONS);
    for (const r of remoteTx) {
      if (!r.id) continue;
      const remoteItem: Transaction = {
        id: r.id,
        date: r.date || new Date().toISOString().substring(0, 10),
        description: r.description || "",
        amountOre: r.amountOre ? parseInt(r.amountOre, 10) : 0,
        counterparty: r.counterparty || undefined,
        category: r.category || undefined,
        source: (r.source as any) || "manual",
        externalReference: r.externalReference || undefined,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
      };

      const local = await transactionRepository.getById(r.id);
      if (pendingRecordIds.has(r.id) && local) {
        if (local.updatedAt !== remoteItem.updatedAt) {
          await conflictRepository.addConflict({
            entity: "transaction",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteItem,
          });
        }
      } else {
        await putInStore("transactions", remoteItem);
      }
    }
  }

  /**
   * Flush local outbox mutations to Google Sheets
   */
  private async flushOutbox(token: string, spreadsheetId: string) {
    const ops = await outboxRepository.getAll();

    for (const op of ops) {
      try {
        await this.executeOutboxOp(token, spreadsheetId, op);
        // Successful write: remove from outbox
        await outboxRepository.remove(op.id);
      } catch (err: any) {
        // Record failure and stop further outbox items to preserve order
        op.retryCount += 1;
        op.lastError = err.message || "Fel vid skrivning till Google Sheets";
        await outboxRepository.updateOp(op);
        throw err;
      }
    }
  }

  private async executeOutboxOp(token: string, spreadsheetId: string, op: OutboxOp) {
    const { entity, operation, recordId, payload } = op;

    let tabTitle: string;
    let rowValues: any[] = [];

    switch (entity) {
      case "hive": {
        tabTitle = SHEET_TABS.HIVES;
        const h: Hive = payload;
        rowValues = [h.id, h.name, h.status, h.notes || "", h.createdAt, h.updatedAt];
        break;
      }
      case "event": {
        tabTitle = SHEET_TABS.EVENTS;
        const e: HiveEvent = payload;
        rowValues = [e.id, e.hiveId, e.date, e.type, e.title, e.notes, e.createdAt, e.updatedAt];
        break;
      }
      case "task": {
        tabTitle = SHEET_TABS.TASKS;
        const t: Task = payload;
        rowValues = [
          t.id,
          t.title,
          t.notes || "",
          t.hiveId || "",
          t.dueDate || "",
          t.status,
          t.createdAt,
          t.updatedAt,
          t.completedAt || "",
        ];
        break;
      }
      case "harvest": {
        tabTitle = SHEET_TABS.HARVESTS;
        const h: Harvest = payload;
        rowValues = [
          h.id,
          h.date,
          h.hiveId || "",
          h.honeyWeightGrams !== undefined ? h.honeyWeightGrams : "",
          h.jarSizeGrams !== undefined ? h.jarSizeGrams : "",
          h.jarCount !== undefined ? h.jarCount : "",
          h.notes || "",
          h.createdAt,
          h.updatedAt,
        ];
        break;
      }
      case "transaction": {
        tabTitle = SHEET_TABS.TRANSACTIONS;
        const tx: Transaction = payload;
        const sekStr = (tx.amountOre / 100).toFixed(2).replace(".", ",");
        rowValues = [
          tx.id,
          tx.date,
          tx.description,
          sekStr,
          tx.amountOre,
          tx.counterparty || "",
          tx.category || "",
          tx.source,
          tx.externalReference || "",
          tx.createdAt,
          tx.updatedAt,
        ];
        break;
      }
      default:
        throw new Error(`Okänd entitet: ${entity}`);
    }

    if (operation === "delete") {
      await sheetsClient.deleteRowById(token, spreadsheetId, tabTitle, recordId);
    } else {
      // create or update are both idempotent through updateRowById (which updates if present or appends if new)
      await sheetsClient.updateRowById(token, spreadsheetId, tabTitle, recordId, rowValues);
    }
  }
}

export const syncEngine = new SyncEngine();
