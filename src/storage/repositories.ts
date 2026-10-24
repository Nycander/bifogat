import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  JarFilling,
  Transaction,
  OutboxOp,
  SyncConflict,
  AppMeta,
  EntityType,
} from "../domain/types";
import { generateUUID } from "../domain/validation";
import {
  getAllFromStore,
  getFromStore,
  putInStore,
  deleteFromStore,
  saveEntityWithOutbox,
  deleteEntityWithOutbox,
  clearStore,
  StoreName,
} from "./db";

// Helper to create an outbox operation
function createOutboxOp(
  entity: EntityType,
  operation: "create" | "update" | "delete",
  recordId: string,
  payload?: any,
): OutboxOp {
  return {
    id: generateUUID(),
    entity,
    operation,
    recordId,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
}

/* ==========================================================================
   HIVES
   ========================================================================== */
export const hiveRepository = {
  async getAll(): Promise<Hive[]> {
    const list = await getAllFromStore<Hive>("hives");
    // Sort active first, then alphabetically by name
    return list.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return a.name.localeCompare(b.name, "sv");
    });
  },

  async getById(id: string): Promise<Hive | null> {
    return getFromStore<Hive>("hives", id);
  },

  async create(data: Omit<Hive, "id" | "createdAt" | "updatedAt">): Promise<Hive> {
    const now = new Date().toISOString();
    const hive: Hive = {
      id: generateUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const op = createOutboxOp("hive", "create", hive.id, hive);
    await saveEntityWithOutbox("hives", hive, op);
    return hive;
  },

  async update(id: string, updates: Partial<Omit<Hive, "id" | "createdAt">>): Promise<Hive> {
    const existing = await getFromStore<Hive>("hives", id);
    if (!existing) throw new Error(`Kupa med id ${id} hittades inte.`);
    const updated: Hive = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const op = createOutboxOp("hive", "update", updated.id, updated);
    await saveEntityWithOutbox("hives", updated, op);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const op = createOutboxOp("hive", "delete", id);
    await deleteEntityWithOutbox("hives", id, op);
  },
};

/* ==========================================================================
   EVENTS
   ========================================================================== */
export const eventRepository = {
  async getAll(): Promise<HiveEvent[]> {
    const list = await getAllFromStore<HiveEvent>("events");
    // Chronological: newest first
    return list.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  async getByHiveId(hiveId: string): Promise<HiveEvent[]> {
    const all = await this.getAll();
    return all.filter((e) => e.hiveId === hiveId);
  },

  async getById(id: string): Promise<HiveEvent | null> {
    return getFromStore<HiveEvent>("events", id);
  },

  async create(data: Omit<HiveEvent, "id" | "createdAt" | "updatedAt">): Promise<HiveEvent> {
    const now = new Date().toISOString();
    const event: HiveEvent = {
      id: generateUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const op = createOutboxOp("event", "create", event.id, event);
    await saveEntityWithOutbox("events", event, op);
    return event;
  },

  async update(
    id: string,
    updates: Partial<Omit<HiveEvent, "id" | "createdAt">>,
  ): Promise<HiveEvent> {
    const existing = await getFromStore<HiveEvent>("events", id);
    if (!existing) throw new Error(`Händelse med id ${id} hittades inte.`);
    const updated: HiveEvent = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const op = createOutboxOp("event", "update", updated.id, updated);
    await saveEntityWithOutbox("events", updated, op);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const op = createOutboxOp("event", "delete", id);
    await deleteEntityWithOutbox("events", id, op);
  },
};

/* ==========================================================================
   TASKS
   ========================================================================== */
export const taskRepository = {
  async getAll(): Promise<Task[]> {
    const list = await getAllFromStore<Task>("tasks");
    return list.sort((a, b) => {
      // Open tasks first
      if (a.status === "open" && b.status === "completed") return -1;
      if (a.status === "completed" && b.status === "open") return 1;
      // Due date sorting for open tasks
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  async getOpen(): Promise<Task[]> {
    const all = await this.getAll();
    return all.filter((t) => t.status === "open");
  },

  async getById(id: string): Promise<Task | null> {
    return getFromStore<Task>("tasks", id);
  },

  async create(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: generateUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const op = createOutboxOp("task", "create", task.id, task);
    await saveEntityWithOutbox("tasks", task, op);
    return task;
  },

  async update(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Promise<Task> {
    const existing = await getFromStore<Task>("tasks", id);
    if (!existing) throw new Error(`Uppgift med id ${id} hittades inte.`);
    const updated: Task = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const op = createOutboxOp("task", "update", updated.id, updated);
    await saveEntityWithOutbox("tasks", updated, op);
    return updated;
  },

  async toggleComplete(id: string): Promise<Task> {
    const existing = await getFromStore<Task>("tasks", id);
    if (!existing) throw new Error(`Uppgift med id ${id} hittades inte.`);
    const now = new Date().toISOString();
    const isCompleted = existing.status === "open";
    const updated: Task = {
      ...existing,
      status: isCompleted ? "completed" : "open",
      completedAt: isCompleted ? now : undefined,
      updatedAt: now,
    };
    const op = createOutboxOp("task", "update", updated.id, updated);
    await saveEntityWithOutbox("tasks", updated, op);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const op = createOutboxOp("task", "delete", id);
    await deleteEntityWithOutbox("tasks", id, op);
  },
};

/* ==========================================================================
   HARVESTS
   ========================================================================== */
export const harvestRepository = {
  async getAll(): Promise<Harvest[]> {
    const list = await getAllFromStore<Harvest>("harvests");
    // Sort newest date first
    return list.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getById(id: string): Promise<Harvest | null> {
    return getFromStore<Harvest>("harvests", id);
  },

  async create(data: Omit<Harvest, "id" | "createdAt" | "updatedAt">): Promise<Harvest> {
    const now = new Date().toISOString();
    const harvest: Harvest = {
      id: generateUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const op = createOutboxOp("harvest", "create", harvest.id, harvest);
    await saveEntityWithOutbox("harvests", harvest, op);
    return harvest;
  },

  async update(id: string, updates: Partial<Omit<Harvest, "id" | "createdAt">>): Promise<Harvest> {
    const existing = await getFromStore<Harvest>("harvests", id);
    if (!existing) throw new Error(`Skörd med id ${id} hittades inte.`);
    const updated: Harvest = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const op = createOutboxOp("harvest", "update", updated.id, updated);
    await saveEntityWithOutbox("harvests", updated, op);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const op = createOutboxOp("harvest", "delete", id);
    await deleteEntityWithOutbox("harvests", id, op);
  },

  async addFilling(
    harvestId: string,
    fillingData: Omit<JarFilling, "id" | "createdAt">,
  ): Promise<Harvest> {
    const harvest = await getFromStore<Harvest>("harvests", harvestId);
    if (!harvest) throw new Error(`Skörd med id ${harvestId} hittades inte.`);

    const newFilling: JarFilling = {
      id: generateUUID(),
      date: fillingData.date,
      jarCount: fillingData.jarCount,
      jarSizeGrams: fillingData.jarSizeGrams,
      notes: fillingData.notes,
      createdAt: new Date().toISOString(),
    };

    const currentFillings = harvest.fillings || [];
    const updatedFillings = [...currentFillings, newFilling];
    const totalJars = updatedFillings.reduce((sum, f) => sum + (f.jarCount || 0), 0);

    const updated: Harvest = {
      ...harvest,
      fillings: updatedFillings,
      jarCount: totalJars,
      updatedAt: new Date().toISOString(),
    };

    const op = createOutboxOp("harvest", "update", updated.id, updated);
    await saveEntityWithOutbox("harvests", updated, op);
    return updated;
  },

  async deleteFilling(harvestId: string, fillingId: string): Promise<Harvest> {
    const harvest = await getFromStore<Harvest>("harvests", harvestId);
    if (!harvest) throw new Error(`Skörd med id ${harvestId} hittades inte.`);

    const currentFillings = harvest.fillings || [];
    const updatedFillings = currentFillings.filter((f) => f.id !== fillingId);
    const totalJars = updatedFillings.reduce((sum, f) => sum + (f.jarCount || 0), 0);

    const updated: Harvest = {
      ...harvest,
      fillings: updatedFillings,
      jarCount: totalJars,
      updatedAt: new Date().toISOString(),
    };

    const op = createOutboxOp("harvest", "update", updated.id, updated);
    await saveEntityWithOutbox("harvests", updated, op);
    return updated;
  },

  async getAnnualSummary(): Promise<
    Record<string, { totalGrams: number; totalJars: number; entries: number }>
  > {
    const all = await this.getAll();
    const summary: Record<string, { totalGrams: number; totalJars: number; entries: number }> = {};
    for (const h of all) {
      const year = h.date.substring(0, 4) || "Okänt år";
      if (!summary[year]) {
        summary[year] = { totalGrams: 0, totalJars: 0, entries: 0 };
      }
      summary[year].entries += 1;
      if (h.honeyWeightGrams !== undefined) {
        summary[year].totalGrams += h.honeyWeightGrams;
      }
      if (h.fillings && h.fillings.length > 0) {
        const jarSum = h.fillings.reduce((sum, f) => sum + (f.jarCount || 0), 0);
        summary[year].totalJars += jarSum;
      } else if (h.jarCount !== undefined) {
        summary[year].totalJars += h.jarCount;
      }
    }
    return summary;
  },
};

/* ==========================================================================
   TRANSACTIONS
   ========================================================================== */
export const transactionRepository = {
  async getAll(): Promise<Transaction[]> {
    const list = await getAllFromStore<Transaction>("transactions");
    // Sort date descending (newest first)
    return list.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  async getById(id: string): Promise<Transaction | null> {
    return getFromStore<Transaction>("transactions", id);
  },

  async create(data: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Promise<Transaction> {
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: generateUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const op = createOutboxOp("transaction", "create", tx.id, tx);
    await saveEntityWithOutbox("transactions", tx, op);
    return tx;
  },

  async update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<Transaction> {
    const existing = await getFromStore<Transaction>("transactions", id);
    if (!existing) throw new Error(`Transaktion med id ${id} hittades inte.`);
    const updated: Transaction = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const op = createOutboxOp("transaction", "update", updated.id, updated);
    await saveEntityWithOutbox("transactions", updated, op);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const op = createOutboxOp("transaction", "delete", id);
    await deleteEntityWithOutbox("transactions", id, op);
  },

  async getBalance(): Promise<number> {
    const all = await this.getAll();
    return all.reduce((sum, t) => sum + (t.amountOre || 0), 0);
  },

  async getAnnualSummary(): Promise<
    Record<string, { incomeOre: number; expenseOre: number; netOre: number; count: number }>
  > {
    const all = await this.getAll();
    const summary: Record<
      string,
      { incomeOre: number; expenseOre: number; netOre: number; count: number }
    > = {};
    for (const t of all) {
      const year = t.date.substring(0, 4) || "Okänt år";
      if (!summary[year]) {
        summary[year] = { incomeOre: 0, expenseOre: 0, netOre: 0, count: 0 };
      }
      summary[year].count += 1;
      const amount = t.amountOre || 0;
      if (amount > 0) {
        summary[year].incomeOre += amount;
      } else {
        summary[year].expenseOre += Math.abs(amount);
      }
      summary[year].netOre += amount;
    }
    return summary;
  },
};

/* ==========================================================================
   OUTBOX
   ========================================================================== */
export const outboxRepository = {
  async getAll(): Promise<OutboxOp[]> {
    const list = await getAllFromStore<OutboxOp>("outbox");
    return list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  async getCount(): Promise<number> {
    const list = await this.getAll();
    return list.length;
  },

  async remove(id: string): Promise<void> {
    await deleteFromStore("outbox", id);
  },

  async updateOp(op: OutboxOp): Promise<void> {
    await putInStore("outbox", op);
  },

  async clear(): Promise<void> {
    await clearStore("outbox");
  },
};

/* ==========================================================================
   CONFLICTS
   ========================================================================== */
export const conflictRepository = {
  async getAll(): Promise<SyncConflict[]> {
    const list = await getAllFromStore<SyncConflict>("conflicts");
    return list.filter((c) => c.status === "unresolved");
  },

  async getById(id: string): Promise<SyncConflict | null> {
    return getFromStore<SyncConflict>("conflicts", id);
  },

  async addConflict(
    conflict: Omit<SyncConflict, "id" | "detectedAt" | "status">,
  ): Promise<SyncConflict> {
    const item: SyncConflict = {
      id: generateUUID(),
      ...conflict,
      detectedAt: new Date().toISOString(),
      status: "unresolved",
    };
    await putInStore("conflicts", item);
    return item;
  },

  async resolveConflict(id: string, keepLocal: boolean): Promise<void> {
    const conflict = await getFromStore<SyncConflict>("conflicts", id);
    if (!conflict) return;

    const storeMap: Record<EntityType, StoreName> = {
      hive: "hives",
      event: "events",
      task: "tasks",
      harvest: "harvests",
      transaction: "transactions",
    };
    const store = storeMap[conflict.entity];

    // Clear any existing outbox entries for this recordId
    const existingOps = await outboxRepository.getAll();
    for (const op of existingOps) {
      if (op.recordId === conflict.recordId) {
        await deleteFromStore("outbox", op.id);
      }
    }

    if (keepLocal) {
      // Keep local version: bump updatedAt so it is definitively newer than remote
      const resolvedLocal = {
        ...conflict.localVersion,
        updatedAt: new Date().toISOString(),
      };
      await putInStore(store, resolvedLocal);
      const op = createOutboxOp(
        conflict.entity,
        "update",
        conflict.recordId,
        resolvedLocal,
      );
      await putInStore("outbox", op);
    } else {
      // Overwrite local with remote version
      await putInStore(store, conflict.remoteVersion);
    }

    // Delete resolved conflict completely so it does not persist or re-trigger
    await deleteFromStore("conflicts", conflict.id);
  },

  async resolveAll(keepLocal: boolean): Promise<void> {
    const conflicts = await this.getAll();
    for (const c of conflicts) {
      await this.resolveConflict(c.id, keepLocal);
    }
  },
};

/* ==========================================================================
   META
   ========================================================================== */
export const metaRepository = {
  async get(): Promise<AppMeta> {
    const meta = await getFromStore<AppMeta>("meta", "config");
    if (meta) {
      if (meta.requireManualWriteConfirmation === undefined) {
        meta.requireManualWriteConfirmation = true;
      }
      return meta;
    }
    const defaultMeta: AppMeta = {
      key: "config",
      schemaVersion: 1,
      requireManualWriteConfirmation: true,
    };
    await putInStore("meta", defaultMeta);
    return defaultMeta;
  },

  async save(updates: Partial<Omit<AppMeta, "key">>): Promise<AppMeta> {
    const current = await this.get();
    const updated: AppMeta = {
      ...current,
      ...updates,
    };
    await putInStore("meta", updated);
    return updated;
  },
};
