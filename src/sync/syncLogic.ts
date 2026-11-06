import type {
  EntityType,
  EventType,
  Harvest,
  Hive,
  HiveEvent,
  JarFilling,
  OutboxOp,
  Task,
  Transaction,
} from "../domain/types";
import { parseSwedishDate } from "../domain/validation";
import { SCHEMAS, SHEET_TABS } from "./sheetsClient";

/**
 * Pure sync logic (no network, no IndexedDB) so it can be unit tested.
 */

export const ENTITY_TABS: Record<EntityType, keyof typeof SCHEMAS> = {
  hive: SHEET_TABS.HIVES,
  event: SHEET_TABS.EVENTS,
  task: SHEET_TABS.TASKS,
  harvest: SHEET_TABS.HARVESTS,
  transaction: SHEET_TABS.TRANSACTIONS,
};

export const ENTITY_STORES = {
  hive: "hives",
  event: "events",
  task: "tasks",
  harvest: "harvests",
  transaction: "transactions",
} as const;

export const ENTITY_ORDER: EntityType[] = ["hive", "event", "task", "harvest", "transaction"];

type AnyEntity = Hive | HiveEvent | Task | Harvest | Transaction;

const EPOCH = "1970-01-01T00:00:00.000Z";

export function parseTimestamp(ts?: string): number {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  return isNaN(t) ? 0 : t;
}

/* ==========================================================================
   Row building (local -> sheet)
   ========================================================================== */

/**
 * Build a sheet row for an entity payload. Column order is derived from the
 * schema headers so schema and writer can never drift apart.
 */
export function buildRow(entity: EntityType, payload: any, fallbackId?: string): any[] {
  const p = payload || {};
  const tab = ENTITY_TABS[entity];
  if (!tab) throw new Error(`Okänd entitet: ${entity}`);
  const now = new Date().toISOString();
  const id = p.id || fallbackId || "";

  return SCHEMAS[tab].map((col) => {
    switch (col) {
      case "id":
        return id;
      case "createdAt":
      case "updatedAt":
        return p[col] || now;
      case "status":
        return p.status || (entity === "task" ? "open" : "active");
      case "type":
        return p.type || "other";
      case "source":
        return p.source || "manual";
      case "amountSEK":
        return (typeof p.amountOre === "number" ? p.amountOre : 0) / 100;
      case "amountOre":
        return typeof p.amountOre === "number" ? p.amountOre : 0;
      case "fillings":
        return Array.isArray(p.fillings) && p.fillings.length > 0 ? JSON.stringify(p.fillings) : "";
      default: {
        const v = p[col];
        return v === undefined || v === null ? "" : v;
      }
    }
  });
}

/* ==========================================================================
   Row parsing (sheet -> local), with sanitising
   ========================================================================== */

const HIVE_STATUSES = ["active", "inactive", "merged", "archived"];
const TASK_STATUSES = ["open", "completed"];
const EVENT_TYPES: EventType[] = [
  "inspection",
  "feeding",
  "treatment",
  "harvest",
  "equipment",
  "colony_change",
  "other",
  "unknown",
];
const TX_SOURCES = ["manual", "import", "future"];

function str(v: string | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t === "" ? undefined : t;
}

function num(v: string | undefined): number | undefined {
  const t = (v ?? "").replace(/\s/g, "").replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function int(v: string | undefined): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n);
}

function timestamp(v: string | undefined, fallback: string): string {
  const t = str(v);
  return t && !isNaN(new Date(t).getTime()) ? t : fallback;
}

function parseFillings(v: string | undefined): JarFilling[] | undefined {
  const t = str(v);
  if (!t) return undefined;
  try {
    const parsed = JSON.parse(t);
    if (!Array.isArray(parsed)) return undefined;
    const valid = parsed.filter(
      (f) => f && typeof f === "object" && typeof f.id === "string" && Number.isFinite(f.jarCount),
    );
    return valid.length > 0 ? (valid as JarFilling[]) : undefined;
  } catch {
    return undefined;
  }
}

export interface ParsedRemote {
  entity: AnyEntity;
  /** Set when the remote row is a tombstone (record deleted on another device). */
  deletedAt?: string;
}

/**
 * Convert a raw sheet row into a validated entity. Returns null when the row
 * is unusable (missing id, unparseable date/amount) so it is skipped rather
 * than imported as corrupted data.
 */
export function parseRemoteRow(entity: EntityType, r: Record<string, string>): ParsedRemote | null {
  const id = str(r.id);
  if (!id) return null;

  const createdAt = timestamp(r.createdAt, EPOCH);
  const updatedAt = timestamp(r.updatedAt, createdAt);
  const deletedAt = str(r.deletedAt);

  switch (entity) {
    case "hive": {
      const hive: Hive = {
        id,
        name: str(r.name) ?? "Namnlös kupa",
        status: (HIVE_STATUSES.includes(r.status) ? r.status : "active") as Hive["status"],
        notes: str(r.notes),
        createdAt,
        updatedAt,
      };
      return { entity: hive, deletedAt };
    }
    case "event": {
      const date = parseSwedishDate(r.date);
      if (!date) return null;
      const event: HiveEvent = {
        id,
        hiveId: r.hiveId ?? "",
        date,
        type: (EVENT_TYPES.includes(r.type as EventType) ? r.type : "other") as EventType,
        title: r.title ?? "",
        notes: r.notes ?? "",
        createdAt,
        updatedAt,
      };
      return { entity: event, deletedAt };
    }
    case "task": {
      const dueRaw = str(r.dueDate);
      const task: Task = {
        id,
        title: r.title ?? "",
        notes: str(r.notes),
        hiveId: str(r.hiveId),
        dueDate: dueRaw ? (parseSwedishDate(dueRaw) ?? undefined) : undefined,
        status: (TASK_STATUSES.includes(r.status) ? r.status : "open") as Task["status"],
        createdAt,
        updatedAt,
        completedAt: str(r.completedAt),
      };
      return { entity: task, deletedAt };
    }
    case "harvest": {
      const date = parseSwedishDate(r.date);
      if (!date) return null;
      const harvest: Harvest = {
        id,
        date,
        hiveId: str(r.hiveId),
        batchName: str(r.batchName),
        collectedDates: str(r.collectedDates),
        dragPeriod: str(r.dragPeriod),
        waterContentPercent: num(r.waterContentPercent),
        honeyWeightGrams: int(r.honeyWeightGrams),
        jarSizeGrams: int(r.jarSizeGrams),
        jarCount: int(r.jarCount),
        fillings: parseFillings(r.fillings),
        notes: str(r.notes),
        createdAt,
        updatedAt,
      };
      return { entity: harvest, deletedAt };
    }
    case "transaction": {
      const date = parseSwedishDate(r.date);
      const amountOre = int(r.amountOre);
      if (!date || amountOre === undefined) return null;
      const tx: Transaction = {
        id,
        date,
        description: r.description ?? "",
        amountOre,
        counterparty: str(r.counterparty),
        category: str(r.category),
        source: (TX_SOURCES.includes(r.source) ? r.source : "manual") as Transaction["source"],
        externalReference: str(r.externalReference),
        createdAt,
        updatedAt,
      };
      return { entity: tx, deletedAt };
    }
  }
}

/* ==========================================================================
   Merge decision (pull)
   ========================================================================== */

export type MergeAction = "put" | "skip" | "conflict" | "deleteLocal";

export function decideMerge(args: {
  local: { updatedAt: string } | null;
  remote: { updatedAt: string };
  remoteIsTombstone: boolean;
  hasPendingLocalOps: boolean;
}): MergeAction {
  const { local, remote, remoteIsTombstone, hasPendingLocalOps } = args;
  const remoteTime = parseTimestamp(remote.updatedAt);
  const localTime = local ? parseTimestamp(local.updatedAt) : 0;

  if (hasPendingLocalOps) {
    // A conflict only exists when remote was edited after the local version
    // and both sides still carry live data.
    if (local && !remoteIsTombstone && remoteTime > localTime) return "conflict";
    return "skip";
  }

  if (remoteIsTombstone) {
    return local && localTime <= remoteTime ? "deleteLocal" : "skip";
  }

  // Strictly newer only. Equal timestamps mean we already have this version
  // (e.g. right after our own push), and the remote copy may carry fewer fields.
  return !local || remoteTime > localTime ? "put" : "skip";
}

/* ==========================================================================
   Outbox planning (push)
   ========================================================================== */

export interface FlushPlan {
  /** Range updates; opIds are removed from the outbox once the update succeeds. */
  updates: Array<{ range: string; values: any[][]; opIds: string[] }>;
  appends: Record<string, { rows: any[][]; opIds: string[] }>;
  clears: Array<{ range: string; opIds: string[] }>;
  /** Ops that need no network write (e.g. deleting a record that never reached the sheet). */
  noopOpIds: string[];
}

/**
 * Collapse the outbox to one op per record (the latest wins: every payload is a
 * full snapshot) and turn it into batched sheet writes.
 *
 * `colA` maps tab title -> column A values (index 0 = header row).
 */
export function planFlush(ops: OutboxOp[], colA: Record<string, string[]>): FlushPlan {
  const plan: FlushPlan = { updates: [], appends: {}, clears: [], noopOpIds: [] };

  const groups = new Map<string, OutboxOp[]>();
  const sorted = [...ops].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const op of sorted) {
    const key = `${op.entity}:${op.recordId}`;
    const list = groups.get(key);
    if (list) list.push(op);
    else groups.set(key, [op]);
  }

  for (const group of groups.values()) {
    const latest = group[group.length - 1];
    const opIds = group.map((o) => o.id);
    const { entity, operation, recordId } = latest;
    const tab = ENTITY_TABS[entity];
    const rowIndex = (colA[tab] || []).indexOf(recordId);
    const sheetRow = rowIndex + 1;

    if (operation === "delete") {
      if (rowIndex <= 0) {
        plan.noopOpIds.push(...opIds);
      } else if (latest.payload) {
        // Tombstone: keep the row but mark it deleted so other devices learn about it.
        plan.updates.push({
          range: `${tab}!A${sheetRow}:Z${sheetRow}`,
          values: [buildRow(entity, latest.payload, recordId)],
          opIds,
        });
      } else {
        // Legacy delete op without snapshot: blank the row.
        plan.clears.push({ range: `${tab}!A${sheetRow}:Z${sheetRow}`, opIds });
      }
      continue;
    }

    const values = buildRow(entity, latest.payload, recordId);
    if (rowIndex > 0) {
      plan.updates.push({ range: `${tab}!A${sheetRow}:Z${sheetRow}`, values: [values], opIds });
    } else {
      const bucket = (plan.appends[tab] ||= { rows: [], opIds: [] });
      bucket.rows.push(values);
      bucket.opIds.push(...opIds);
    }
  }

  return plan;
}
