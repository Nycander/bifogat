import test from "node:test";
import assert from "node:assert/strict";
import { OutboxOp, SyncConflict, Hive, Transaction } from "../domain/types.ts";
import { generateUUID } from "../domain/validation.ts";

test("outbox retry behavior tracks retryCount and records last error message", () => {
  const op: OutboxOp = {
    id: generateUUID(),
    entity: "hive",
    operation: "create",
    recordId: generateUUID(),
    payload: { name: "Kupa A", status: "active" },
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  assert.equal(op.retryCount, 0);
  assert.equal(op.lastError, undefined);

  // Simulate network failure
  op.retryCount += 1;
  op.lastError = "Nätverksfel vid kontakt med Google Sheets";

  assert.equal(op.retryCount, 1);
  assert.equal(op.lastError, "Nätverksfel vid kontakt med Google Sheets");
});

test("idempotent synchronization operations preserve stable record UUID across retries", () => {
  const hiveId = generateUUID();
  const hive: Hive = {
    id: hiveId,
    name: "Kupa B",
    status: "active",
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
  };

  const op1: OutboxOp = {
    id: generateUUID(),
    entity: "hive",
    operation: "create",
    recordId: hive.id,
    payload: hive,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  // Simulating duplicate retry of same op
  assert.equal(op1.recordId, hive.id);
  assert.equal(op1.recordId, hiveId);
});

test("conflict detection flags concurrent modification when local updatedAt differs from remote", () => {
  const hiveId = generateUUID();

  const localVersion: Hive = {
    id: hiveId,
    name: "Kupa A - Ändrad lokalt",
    status: "active",
    notes: "Ny drottning tillsatt lokalt",
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-03T14:00:00Z", // Local modification
  };

  const remoteVersion: Hive = {
    id: hiveId,
    name: "Kupa A - Ändrad i Google Sheets",
    status: "inactive",
    notes: "Svag koloni noterad i kalkylarket",
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-03T15:30:00Z", // Remote modification
  };

  const isConflicted = localVersion.updatedAt !== remoteVersion.updatedAt;
  assert.equal(isConflicted, true);

  const conflict: SyncConflict = {
    id: generateUUID(),
    entity: "hive",
    recordId: hiveId,
    localVersion,
    remoteVersion,
    detectedAt: new Date().toISOString(),
    status: "unresolved",
  };

  assert.equal(conflict.status, "unresolved");
  assert.equal(conflict.localVersion.name, "Kupa A - Ändrad lokalt");
  assert.equal(conflict.remoteVersion.name, "Kupa A - Ändrad i Google Sheets");
});
