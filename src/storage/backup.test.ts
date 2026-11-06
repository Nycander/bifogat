import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeBackup } from "./backup.ts";

const ts = "2026-01-01T00:00:00.000Z";

test("sanitizeBackup rejects non-backup input", () => {
  assert.throws(() => sanitizeBackup(null));
  assert.throws(() => sanitizeBackup([]));
  assert.throws(() => sanitizeBackup({ foo: 1 }));
});

test("sanitizeBackup keeps valid records and drops malformed ones", () => {
  const result = sanitizeBackup({
    hives: [
      { id: "h1", name: "A", status: "active", createdAt: ts, updatedAt: ts },
      { id: "h2", name: "", createdAt: ts, updatedAt: ts },
      { id: "h1", name: "dup", createdAt: ts, updatedAt: ts },
      "garbage",
    ],
    transactions: [
      { id: "t1", date: "2026-01-02", amountOre: 100, description: "x", createdAt: ts, updatedAt: ts },
      { id: "t2", date: "2026-01-02", amountOre: "abc", createdAt: ts, updatedAt: ts },
    ],
    outbox: [{ id: "evil" }],
    meta: [{ key: "config", spreadsheetId: "attacker-sheet", schemaVersion: 1 }],
  });
  assert.equal(result.accepted, 2);
  assert.equal(result.rejected, 4);
  assert.equal(result.records.hive.length, 1);
  assert.equal(result.records.transaction.length, 1);
  assert.deepEqual(Object.keys(result.records).sort(), ["event", "harvest", "hive", "task", "transaction"]);
});
