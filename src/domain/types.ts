export type HiveStatus = "active" | "inactive" | "merged" | "archived";

export interface Hive {
  id: string; // UUID
  name: string; // e.g. "Kupa A"
  status: HiveStatus;
  notes?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type EventType =
  | "inspection"
  | "feeding"
  | "treatment"
  | "harvest"
  | "equipment"
  | "colony_change"
  | "other"
  | "unknown";

export interface HiveEvent {
  id: string; // UUID
  hiveId: string; // reference to Hive
  date: string; // YYYY-MM-DD
  type: EventType;
  title: string;
  notes: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type TaskStatus = "open" | "completed";

export interface Task {
  id: string; // UUID
  title: string;
  notes?: string;
  hiveId?: string; // optional hive reference
  dueDate?: string; // YYYY-MM-DD
  status: TaskStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface Harvest {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  hiveId?: string; // optional hive reference
  honeyWeightGrams?: number; // integer grams, undefined if unknown (preserve distinction from 0)
  jarSizeGrams?: number; // e.g. 500
  jarCount?: number; // integer count, undefined if unknown
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionSource = "manual" | "import" | "future";

export interface Transaction {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  description: string;
  amountOre: number; // signed integer in öre
  counterparty?: string;
  category?: string;
  source: TransactionSource;
  externalReference?: string;
  createdAt: string;
  updatedAt: string;
}

export type EntityType = "hive" | "event" | "task" | "harvest" | "transaction";
export type OperationType = "create" | "update" | "delete";

export interface OutboxOp {
  id: string; // stable operation UUID
  entity: EntityType;
  operation: OperationType;
  recordId: string;
  payload?: any;
  timestamp: string; // ISO 8601
  retryCount: number;
  lastError?: string;
}

export interface SyncConflict {
  id: string;
  entity: EntityType;
  recordId: string;
  localVersion: any;
  remoteVersion: any;
  detectedAt: string;
  status: "unresolved" | "resolved";
}

export interface AppMeta {
  key: string; // e.g. "config"
  schemaVersion: number;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  lastSyncTime?: string;
  importedHistoricalBalanceOre?: number;
  requireManualWriteConfirmation?: boolean; // defaults to true for write safety
}
