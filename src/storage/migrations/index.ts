import { getAllFromStore, putInStore, getFromStore } from "../db";
import { HiveEvent, OutboxOp, AppMeta } from "../../domain/types";
import { mergeEventDescription } from "./eventMigration";

export interface MigrationStatus {
  version: number;
  lastRunAt: string | null;
  totalEvents: number;
  migratedCount: number;
  isUpToDate: boolean;
  message?: string;
}

const CURRENT_MIGRATION_VERSION = 1;
const META_KEY = "data_migration_status";

/**
 * Get current status of data migrations from IndexedDB meta store.
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
  try {
    const metaRecord = await getFromStore<AppMeta & { value?: any }>("meta", META_KEY);
    const events = await getAllFromStore<HiveEvent>("events");

    if (!metaRecord || !metaRecord.value) {
      return {
        version: 0,
        lastRunAt: null,
        totalEvents: events.length,
        migratedCount: 0,
        isUpToDate: false,
      };
    }

    const val = metaRecord.value;
    return {
      version: val.version || 0,
      lastRunAt: val.lastRunAt || null,
      totalEvents: events.length,
      migratedCount: val.migratedCount || 0,
      isUpToDate: (val.version || 0) >= CURRENT_MIGRATION_VERSION,
      message: val.message,
    };
  } catch (err: any) {
    return {
      version: 0,
      lastRunAt: null,
      totalEvents: 0,
      migratedCount: 0,
      isUpToDate: false,
      message: err.message,
    };
  }
}

/**
 * Runs all outstanding data migrations.
 * If force is true, reruns migrations across all existing events even if already applied.
 */
export async function runDataMigrations(force = false): Promise<MigrationStatus> {
  const currentStatus = await getMigrationStatus();
  if (!force && currentStatus.isUpToDate) {
    return currentStatus;
  }

  const events = await getAllFromStore<HiveEvent>("events");
  let modifiedCount = 0;

  // 1. Migrate Events: merge separate title and notes into a unified descriptive field
  for (const event of events) {
    const originalTitle = event.title || "";
    const originalNotes = event.notes || "";
    const merged = mergeEventDescription(originalTitle, originalNotes);

    // If title or notes differed or weren't synchronized with merged description
    if (force || event.title !== merged || event.notes !== merged) {
      event.title = merged;
      event.notes = merged;
      event.updatedAt = new Date().toISOString();
      await putInStore("events", event);
      modifiedCount++;
    }
  }

  // 2. Also migrate any queued outbox operations for events
  try {
    const outboxOps = await getAllFromStore<OutboxOp>("outbox");
    for (const op of outboxOps) {
      if (op.entityType === "event" && op.payload) {
        const p = op.payload as Partial<HiveEvent>;
        const merged = mergeEventDescription(p.title, p.notes);
        if (p.title !== merged || p.notes !== merged) {
          p.title = merged;
          p.notes = merged;
          await putInStore("outbox", op);
        }
      }
    }
  } catch {
    // Ignore outbox migration errors if outbox is empty or locked
  }

  const now = new Date().toISOString();
  const newStatus: MigrationStatus = {
    version: CURRENT_MIGRATION_VERSION,
    lastRunAt: now,
    totalEvents: events.length,
    migratedCount: modifiedCount,
    isUpToDate: true,
    message: `Migrering v${CURRENT_MIGRATION_VERSION} klar: ${modifiedCount} av ${events.length} kupbesök synkroniserade.`,
  };

  // Save migration status in meta store
  try {
    await putInStore("meta", {
      key: META_KEY,
      value: newStatus,
      updatedAt: now,
    });
  } catch {
    // Ignore meta store error if meta is read-only
  }

  return newStatus;
}
