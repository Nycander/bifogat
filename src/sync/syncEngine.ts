import {
  outboxRepository,
  conflictRepository,
  metaRepository,
} from "../storage/repositories";
import { bulkPutInStore, deleteFromStore, getAllFromStore } from "../storage/db";
import { sheetsClient } from "./sheetsClient";
import {
  ENTITY_ORDER,
  ENTITY_STORES,
  ENTITY_TABS,
  decideMerge,
  parseRemoteRow,
  parseTimestamp,
  planFlush,
} from "./syncLogic";
import { getAccessToken, clearAccessToken } from "../auth/googleAuth";

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
      this.lastError =
        "Google-behörigheten har gått ut eller saknas. Vänligen förnya behörigheten i Inställningar.";
      this.notify();
      return {
        success: false,
        error:
          "Google-behörigheten har gått ut eller saknas. Vänligen förnya behörigheten i Inställningar.",
      };
    }

    const meta = await metaRepository.get();
    if (!meta.spreadsheetId) {
      this.state = "no_sheet";
      this.lastError = "Inget kalkylark är valt i inställningarna";
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
        err.message?.includes("Invalid Credentials") ||
        err.message?.includes("invalid authentication credentials") ||
        err.message?.includes("OAuth 2 access token");

      if (isAuthError) {
        clearAccessToken();
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

    // Batch read all tabs in a single HTTP request
    const allTabsData = await sheetsClient.readBatchTabs(
      token,
      spreadsheetId,
      ENTITY_ORDER.map((e) => ENTITY_TABS[e]),
    );

    let skippedRows = 0;

    for (const entity of ENTITY_ORDER) {
      const storeName = ENTITY_STORES[entity];
      const remoteRows = allTabsData[ENTITY_TABS[entity]] || [];
      const localById = new Map(
        (await getAllFromStore<{ id: string; updatedAt: string }>(storeName)).map((l) => [l.id, l]),
      );

      const toPut: unknown[] = [];
      const toDelete: string[] = [];

      for (const row of remoteRows) {
        if (!row.id) continue;
        const parsed = parseRemoteRow(entity, row);
        if (!parsed) {
          skippedRows++;
          continue;
        }
        const remote = parsed.entity;
        const local = localById.get(remote.id) ?? null;
        const action = decideMerge({
          local,
          remote,
          remoteIsTombstone: !!parsed.deletedAt,
          hasPendingLocalOps: pendingRecordIds.has(remote.id),
        });

        if (action === "put") {
          toPut.push(remote);
        } else if (action === "deleteLocal") {
          toDelete.push(remote.id);
        } else if (action === "conflict" && local && !existingConflictIds.has(remote.id)) {
          await conflictRepository.addConflict({
            entity,
            recordId: remote.id,
            localVersion: local as any,
            remoteVersion: remote,
          });
          existingConflictIds.add(remote.id);
        }
      }

      await bulkPutInStore(storeName, toPut);
      for (const id of toDelete) {
        await deleteFromStore(storeName, id);
      }
    }

    if (skippedRows > 0) {
      console.warn(`Hoppade över ${skippedRows} ogiltiga rader i kalkylarket.`);
    }
  }

  /**
   * Flush local outbox mutations to Google Sheets using BULK batch writes.
   * Ops are removed from the outbox only after the write that covers them succeeded.
   */
  private async flushOutbox(token: string, spreadsheetId: string) {
    const ops = await outboxRepository.getAll();
    if (ops.length === 0) return;

    this.syncMessage = `Förbereder massynkronisering (${ops.length} ändringar)...`;
    this.notify();

    // Pre-fetch column A for all tabs in a single batch read (fresh on every flush,
    // so a retry after a lost response finds already-appended rows and updates them).
    const colA = await sheetsClient.readBatchColumnA(
      token,
      spreadsheetId,
      ENTITY_ORDER.map((e) => ENTITY_TABS[e]),
    );

    const plan = planFlush(ops, colA);

    for (const id of plan.noopOpIds) {
      await outboxRepository.remove(id);
    }

    // 1. Updates (including tombstones) in chunks of 50 via values:batchUpdate
    if (plan.updates.length > 0) {
      this.syncMessage = `Uppdaterar ${plan.updates.length} befintliga rader i molnet...`;
      this.notify();
      const chunkSize = 50;
      for (let i = 0; i < plan.updates.length; i += chunkSize) {
        const chunk = plan.updates.slice(i, i + chunkSize);
        await sheetsClient.batchUpdateValues(
          token,
          spreadsheetId,
          chunk.map(({ range, values }) => ({ range, values })),
        );
        for (const id of chunk.flatMap((u) => u.opIds)) await outboxRepository.remove(id);
        if (i + chunkSize < plan.updates.length) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    // 2. Appends per tab in single requests via values:append
    for (const [tabTitle, group] of Object.entries(plan.appends)) {
      this.syncMessage = `Skriver ${group.rows.length} nya rader till fliken ${tabTitle}...`;
      this.notify();
      await sheetsClient.appendRowsBatch(token, spreadsheetId, tabTitle, group.rows);
      for (const id of group.opIds) await outboxRepository.remove(id);
    }

    // 3. Clears (legacy deletes without snapshot) in a single request
    if (plan.clears.length > 0) {
      this.syncMessage = `Rensar ${plan.clears.length} borttagna rader i Sheets...`;
      this.notify();
      await sheetsClient.batchClearValues(
        token,
        spreadsheetId,
        plan.clears.map((c) => c.range),
      );
      for (const id of plan.clears.flatMap((c) => c.opIds)) await outboxRepository.remove(id);
    }
  }
}

export const syncEngine = new SyncEngine();
