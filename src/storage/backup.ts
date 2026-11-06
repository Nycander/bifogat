import type { EntityType } from "../domain/types";
import { parseSwedishDate } from "../domain/validation";
import { saveEntityWithOutbox } from "./db";
import { createOutboxOp } from "./repositories";
import { ENTITY_STORES } from "../sync/syncLogic";

type Rec = Record<string, any>;

const isObj = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isTs = (v: unknown): v is string => typeof v === "string" && !isNaN(new Date(v).getTime());
const optNum = (v: unknown) => v === undefined || v === null || Number.isFinite(v);

const CHECKS: Record<EntityType, (r: Rec) => boolean> = {
  hive: (r) => nonEmpty(r.name),
  event: (r) => nonEmpty(r.hiveId) && !!parseSwedishDate(r.date),
  task: (r) => nonEmpty(r.title) && (r.status === "open" || r.status === "completed"),
  harvest: (r) =>
    !!parseSwedishDate(r.date) &&
    optNum(r.honeyWeightGrams) &&
    optNum(r.jarCount) &&
    optNum(r.jarSizeGrams),
  transaction: (r) => !!parseSwedishDate(r.date) && Number.isFinite(r.amountOre),
};

const BACKUP_KEYS: Record<EntityType, string> = {
  hive: "hives",
  event: "events",
  task: "tasks",
  harvest: "harvests",
  transaction: "transactions",
};

export interface SanitizedBackup {
  records: Record<EntityType, Rec[]>;
  accepted: number;
  rejected: number;
}

/**
 * Validate an untrusted backup file. Invalid records are dropped and counted;
 * the outbox and meta (spreadsheet id, sync state) are never taken from a backup.
 */
export function sanitizeBackup(data: unknown): SanitizedBackup {
  if (!isObj(data)) throw new Error("Ogiltig säkerhetskopia (ej giltigt JSON-format)");

  const known = Object.values(BACKUP_KEYS);
  if (!known.some((k) => Array.isArray(data[k]))) {
    throw new Error("Ogiltig säkerhetskopia (inga kända tabeller hittades)");
  }

  const records = { hive: [], event: [], task: [], harvest: [], transaction: [] } as Record<
    EntityType,
    Rec[]
  >;
  let accepted = 0;
  let rejected = 0;

  for (const entity of Object.keys(BACKUP_KEYS) as EntityType[]) {
    const list = data[BACKUP_KEYS[entity]];
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    for (const r of list) {
      const ok =
        isObj(r) &&
        nonEmpty(r.id) &&
        !seen.has(r.id) &&
        isTs(r.createdAt) &&
        isTs(r.updatedAt) &&
        CHECKS[entity](r);
      if (ok) {
        seen.add(r.id);
        records[entity].push(r);
        accepted++;
      } else {
        rejected++;
      }
    }
  }

  return { records, accepted, rejected };
}

/**
 * Restore validated records into IndexedDB and queue each one in the outbox so
 * the restored data is pushed to the sheet on the next sync.
 */
export async function restoreBackup(data: unknown): Promise<{ accepted: number; rejected: number }> {
  const { records, accepted, rejected } = sanitizeBackup(data);
  for (const entity of Object.keys(records) as EntityType[]) {
    for (const record of records[entity]) {
      const op = createOutboxOp(entity, "update", record.id, record);
      await saveEntityWithOutbox(ENTITY_STORES[entity], record, op);
    }
  }
  return { accepted, rejected };
}
