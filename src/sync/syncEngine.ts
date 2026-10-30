import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  Transaction,
  OutboxOp,
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
import { putInStore, deleteFromStore } from "../storage/db";
import { sheetsClient, SHEET_TABS } from "./sheetsClient";
import { getAccessToken } from "../auth/googleAuth";

export type SyncState = "idle" | "syncing" | "error" | "offline" | "needs_auth" | "no_sheet";

export interface SyncEngineStatus {
  state: SyncState;
  lastSyncTime: string | null;
  pendingCount: number;
  conflictCount: number;
  lastError: string | null;
  syncMessage?: string | null;
}

type SyncListener = (status: SyncEngineStatus) => void;

function parseTimestamp(ts?: string): number {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}

class SyncEngine {
  private state: SyncState = "idle";
  private lastError: string | null = null;
  private syncMessage: string | null = null;
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
      lastSyncTime: null,
      pendingCount: 0,
      conflictCount: 0,
      lastError: this.lastError,
      syncMessage: this.syncMessage,
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
      syncMessage: this.syncMessage,
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
    this.syncMessage = "Kontrollerar kalkylark...";
    this.notify();

    try {
      // 1. Ensure spreadsheet schema
      this.syncMessage = "Verifierar kalkylarksstruktur...";
      this.notify();
      await sheetsClient.ensureSchema(token, meta.spreadsheetId);

      // 2. Pull remote records and detect conflicts (READ ONLY)
      this.syncMessage = "Hämtar molndata & kontrollerar ändringar...";
      this.notify();
      await this.pullRemoteAndDetectConflicts(token, meta.spreadsheetId);

      // 3. Flush pending outbox operations to Google Sheets ONLY if allowed
      const shouldWrite = options?.allowWrite === true || !meta.requireManualWriteConfirmation;
      if (shouldWrite) {
        this.syncMessage = "Synkroniserar ändringar till Google Sheets...";
        this.notify();
        await this.flushOutbox(token, meta.spreadsheetId);
      }

      // 4. Update sync metadata
      const now = new Date().toISOString();
      await metaRepository.save({ lastSyncTime: now });

      this.state = "idle";
      this.lastError = null;
      this.syncMessage = null;
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
   * Pull remote changes from all Sheets tabs using a SINGLE batchGet and merge into local IndexedDB
   */
  private async pullRemoteAndDetectConflicts(token: string, spreadsheetId: string) {
    const outboxOps = await outboxRepository.getAll();
    const pendingRecordIds = new Set(outboxOps.map((op) => op.recordId));
    const existingConflicts = await conflictRepository.getAll();
    const existingConflictIds = new Set(existingConflicts.map((c) => c.recordId));

    // Pre-clean any stale or invalid conflicts:
    // If a conflict no longer has a pending outbox write or if local timestamp is >= remote, clear it
    for (const c of existingConflicts) {
      const remoteTime = parseTimestamp(c.remoteVersion?.updatedAt);
      const localTime = parseTimestamp(c.localVersion?.updatedAt);
      if (!pendingRecordIds.has(c.recordId) || localTime >= remoteTime) {
        await deleteFromStore("conflicts", c.id);
        existingConflictIds.delete(c.recordId);
      }
    }

    // Batch read all 5 tabs in a single HTTP request (reducing read request quota usage by 80%)
    const allTabsData = await sheetsClient.readBatchTabs(token, spreadsheetId, [
      SHEET_TABS.HIVES,
      SHEET_TABS.EVENTS,
      SHEET_TABS.TASKS,
      SHEET_TABS.HARVESTS,
      SHEET_TABS.TRANSACTIONS,
    ]);

    // A. Hives
    const remoteHives = allTabsData[SHEET_TABS.HIVES] || [];
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
      const remoteTime = parseTimestamp(remoteHive.updatedAt);
      const localTime = local ? parseTimestamp(local.updatedAt) : 0;

      if (pendingRecordIds.has(r.id)) {
        // True conflict ONLY if remote was edited AFTER local's update
        if (local && remoteTime > localTime && !existingConflictIds.has(r.id)) {
          await conflictRepository.addConflict({
            entity: "hive",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteHive,
          });
          existingConflictIds.add(r.id);
        }
        continue;
      }

      if (!local || remoteTime >= localTime) {
        await putInStore("hives", remoteHive);
      }
    }

    // B. Events
    const remoteEvents = allTabsData[SHEET_TABS.EVENTS] || [];
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
      const remoteTime = parseTimestamp(remoteEvent.updatedAt);
      const localTime = local ? parseTimestamp(local.updatedAt) : 0;

      if (pendingRecordIds.has(r.id)) {
        if (local && remoteTime > localTime && !existingConflictIds.has(r.id)) {
          await conflictRepository.addConflict({
            entity: "event",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteEvent,
          });
          existingConflictIds.add(r.id);
        }
        continue;
      }

      if (!local || remoteTime >= localTime) {
        await putInStore("events", remoteEvent);
      }
    }

    // C. Tasks
    const remoteTasks = allTabsData[SHEET_TABS.TASKS] || [];
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
      const remoteTime = parseTimestamp(remoteTask.updatedAt);
      const localTime = local ? parseTimestamp(local.updatedAt) : 0;

      if (pendingRecordIds.has(r.id)) {
        if (local && remoteTime > localTime && !existingConflictIds.has(r.id)) {
          await conflictRepository.addConflict({
            entity: "task",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteTask,
          });
          existingConflictIds.add(r.id);
        }
        continue;
      }

      if (!local || remoteTime >= localTime) {
        await putInStore("tasks", remoteTask);
      }
    }

    // D. Harvests
    const remoteHarvests = allTabsData[SHEET_TABS.HARVESTS] || [];
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
      const remoteTime = parseTimestamp(remoteHarvest.updatedAt);
      const localTime = local ? parseTimestamp(local.updatedAt) : 0;

      if (pendingRecordIds.has(r.id)) {
        if (local && remoteTime > localTime && !existingConflictIds.has(r.id)) {
          await conflictRepository.addConflict({
            entity: "harvest",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteHarvest,
          });
          existingConflictIds.add(r.id);
        }
        continue;
      }

      if (!local || remoteTime >= localTime) {
        await putInStore("harvests", remoteHarvest);
      }
    }

    // E. Transactions
    const remoteTx = allTabsData[SHEET_TABS.TRANSACTIONS] || [];
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
      const remoteTime = parseTimestamp(remoteItem.updatedAt);
      const localTime = local ? parseTimestamp(local.updatedAt) : 0;

      if (pendingRecordIds.has(r.id)) {
        if (local && remoteTime > localTime && !existingConflictIds.has(r.id)) {
          await conflictRepository.addConflict({
            entity: "transaction",
            recordId: r.id,
            localVersion: local,
            remoteVersion: remoteItem,
          });
          existingConflictIds.add(r.id);
        }
        continue;
      }

      if (!local || remoteTime >= localTime) {
        await putInStore("transactions", remoteItem);
      }
    }
  }

  /**
   * Flush local outbox mutations to Google Sheets using high-performance BULK batch writes
   */
  private async flushOutbox(token: string, spreadsheetId: string) {
    const ops = await outboxRepository.getAll();
    const total = ops.length;
    if (total === 0) return;

    this.syncMessage = `Förbereder massynkronisering (${total} ändringar)...`;
    this.notify();

    // 1. Pre-fetch column A for all tabs in a single batch read
    const colACache = await sheetsClient.readBatchColumnA(token, spreadsheetId, [
      SHEET_TABS.HIVES,
      SHEET_TABS.EVENTS,
      SHEET_TABS.TASKS,
      SHEET_TABS.HARVESTS,
      SHEET_TABS.TRANSACTIONS,
    ]);

    // Group outbox mutations into appends, batch updates, and batch clears
    const appendsByTab: Record<string, { ops: OutboxOp[]; rows: any[][] }> = {};
    const updatesBatch: Array<{ range: string; values: any[][] }> = [];
    const clearsBatch: string[] = [];
    const successfulOpIds: string[] = [];

    for (let i = 0; i < total; i++) {
      const op = ops[i];
      if (!op) continue;
      const { entity, operation, recordId } = op;
      const { tabTitle, rowValues } = this.getTabAndRowValues(entity, op.payload, recordId);

      const knownRows = colACache[tabTitle] || [];
      let rowIndex = knownRows.indexOf(recordId);

      if (operation === "delete") {
        if (rowIndex > 0) {
          const sheetRowIndex = rowIndex + 1;
          clearsBatch.push(`${tabTitle}!A${sheetRowIndex}:Z${sheetRowIndex}`);
          knownRows[rowIndex] = "";
        }
        successfulOpIds.push(op.id);
      } else {
        // create or update
        if (rowIndex > 0) {
          // Existing row: batch update that row range
          const sheetRowIndex = rowIndex + 1;
          updatesBatch.push({
            range: `${tabTitle}!A${sheetRowIndex}:Z${sheetRowIndex}`,
            values: [rowValues],
          });
          successfulOpIds.push(op.id);
        } else {
          // New row: queue for batch append
          if (!appendsByTab[tabTitle]) {
            appendsByTab[tabTitle] = { ops: [], rows: [] };
          }
          appendsByTab[tabTitle].ops.push(op);
          appendsByTab[tabTitle].rows.push(rowValues);
          knownRows.push(recordId);
        }
      }
    }

    try {
      // 2. Execute bulk updates in chunks of 50 via values:batchUpdate
      if (updatesBatch.length > 0) {
        this.syncMessage = `Uppdaterar ${updatesBatch.length} befintliga rader i molnet...`;
        this.notify();
        const chunkSize = 50;
        for (let i = 0; i < updatesBatch.length; i += chunkSize) {
          const chunk = updatesBatch.slice(i, i + chunkSize);
          await sheetsClient.batchUpdateValues(token, spreadsheetId, chunk);
          if (i + chunkSize < updatesBatch.length) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }

      // 3. Execute bulk appends per tab in single HTTP requests via values:append
      for (const [tabTitle, group] of Object.entries(appendsByTab)) {
        if (group.rows.length > 0) {
          this.syncMessage = `Skriver ${group.rows.length} nya rader till fliken ${tabTitle}...`;
          this.notify();
          await sheetsClient.appendRowsBatch(token, spreadsheetId, tabTitle, group.rows);
          for (const op of group.ops) {
            successfulOpIds.push(op.id);
          }
        }
      }

      // 4. Execute bulk clears in single HTTP request via values:batchClear
      if (clearsBatch.length > 0) {
        this.syncMessage = `Rensar ${clearsBatch.length} borttagna rader i Sheets...`;
        this.notify();
        await sheetsClient.batchClearValues(token, spreadsheetId, clearsBatch);
      }

      // 5. Remove all successfully committed outbox entries
      for (const opId of successfulOpIds) {
        await outboxRepository.remove(opId);
      }
    } catch (err: any) {
      console.error("Bulk sync error:", err);
      // Clean up whatever succeeded so far
      for (const opId of successfulOpIds) {
        await outboxRepository.remove(opId).catch(() => {});
      }
      throw err;
    }
  }

  private getTabAndRowValues(entity: EntityType, payload: any, fallbackId?: string): { tabTitle: string; rowValues: any[] } {
    let tabTitle: string;
    let rowValues: any[] = [];
    const p = payload || {};
    const recordId = p.id || fallbackId || "";

    switch (entity) {
      case "hive": {
        tabTitle = SHEET_TABS.HIVES;
        rowValues = [recordId, p.name || "", p.status || "active", p.notes || "", p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()];
        break;
      }
      case "event": {
        tabTitle = SHEET_TABS.EVENTS;
        rowValues = [recordId, p.hiveId || "", p.date || "", p.type || "other", p.title || "", p.notes || "", p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()];
        break;
      }
      case "task": {
        tabTitle = SHEET_TABS.TASKS;
        rowValues = [
          recordId,
          p.title || "",
          p.notes || "",
          p.hiveId || "",
          p.dueDate || "",
          p.status || "open",
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString(),
          p.completedAt || "",
        ];
        break;
      }
      case "harvest": {
        tabTitle = SHEET_TABS.HARVESTS;
        rowValues = [
          recordId,
          p.date || "",
          p.hiveId || "",
          p.honeyWeightGrams !== undefined ? p.honeyWeightGrams : "",
          p.jarSizeGrams !== undefined ? p.jarSizeGrams : "",
          p.jarCount !== undefined ? p.jarCount : "",
          p.notes || "",
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString(),
        ];
        break;
      }
      case "transaction": {
        tabTitle = SHEET_TABS.TRANSACTIONS;
        const amountOre = typeof p.amountOre === "number" ? p.amountOre : 0;
        const sekStr = (amountOre / 100).toFixed(2).replace(".", ",");
        rowValues = [
          recordId,
          p.date || "",
          p.description || "",
          sekStr,
          amountOre,
          p.counterparty || "",
          p.category || "",
          p.source || "manual",
          p.externalReference || "",
          p.createdAt || new Date().toISOString(),
          p.updatedAt || new Date().toISOString(),
        ];
        break;
      }
      default:
        throw new Error(`Okänd entitet: ${entity}`);
    }

    return { tabTitle, rowValues };
  }
}

export const syncEngine = new SyncEngine();
