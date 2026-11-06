import test from "node:test";
import assert from "node:assert/strict";
import type { Harvest, OutboxOp } from "../domain/types.ts";
import { SCHEMAS, SHEET_TABS, headersNeedWrite } from "./sheetsClient.ts";
import { buildRow, decideMerge, ENTITY_TABS, parseRemoteRow, planFlush } from "./syncLogic.ts";

const rowToRecord = (tab: keyof typeof SCHEMAS, row: any[]): Record<string, string> =>
  Object.fromEntries(SCHEMAS[tab].map((h, i) => [h, String(row[i] ?? "")]));

const harvest: Harvest = {
  id: "h-1",
  batchName: "Vårskörd 2026",
  date: "2026-06-10",
  collectedDates: "2026-06-08 – 2026-06-10",
  dragPeriod: "2026-05-01 – 2026-06-15",
  hiveId: "hive-1",
  waterContentPercent: 17.5,
  honeyWeightGrams: 12000,
  jarSizeGrams: 500,
  jarCount: 24,
  fillings: [{ id: "f-1", date: "2026-06-12", jarCount: 24, jarSizeGrams: 500, createdAt: "x" }],
  notes: "Fin skörd",
  createdAt: "2026-06-10T10:00:00.000Z",
  updatedAt: "2026-06-12T10:00:00.000Z",
};

test("harvest survives a push/pull round trip with every field", () => {
  const row = buildRow("harvest", harvest);
  assert.equal(row.length, SCHEMAS[SHEET_TABS.HARVESTS].length);
  const parsed = parseRemoteRow("harvest", rowToRecord(SHEET_TABS.HARVESTS, row));
  assert.deepEqual(parsed?.entity, harvest);
  assert.equal(parsed?.deletedAt, undefined);
});

test("every entity row has exactly one cell per schema column", () => {
  for (const entity of ["hive", "event", "task", "harvest", "transaction"] as const) {
    assert.equal(buildRow(entity, { id: "x" }).length, SCHEMAS[ENTITY_TABS[entity]].length);
  }
});

test("user text is written verbatim (formulas are not interpreted; RAW input)", () => {
  const row = buildRow("event", { id: "e", notes: '=HYPERLINK("http://evil","x")', title: "-1+2" });
  assert.ok(row.includes('=HYPERLINK("http://evil","x")'));
  assert.ok(row.includes("-1+2"));
});

test("transaction amountSEK is numeric and amountOre integer", () => {
  const row = buildRow("transaction", { id: "t", amountOre: -12550 });
  const rec = SCHEMAS[SHEET_TABS.TRANSACTIONS];
  assert.strictEqual(row[rec.indexOf("amountSEK")], -125.5);
  assert.strictEqual(row[rec.indexOf("amountOre")], -12550);
});

test("parseRemoteRow sanitises bad remote data instead of importing it", () => {
  assert.equal(parseRemoteRow("hive", { id: "" }), null);
  assert.equal(parseRemoteRow("transaction", { id: "t", date: "2026-01-01", amountOre: "abc" }), null);
  assert.equal(parseRemoteRow("transaction", { id: "t", date: "not a date", amountOre: "100" }), null);
  const hive = parseRemoteRow("hive", { id: "h", name: "A", status: "bogus" });
  assert.equal((hive!.entity as any).status, "active");
  const h = parseRemoteRow("harvest", { id: "h", date: "2026-01-01", honeyWeightGrams: "x" });
  assert.equal((h!.entity as any).honeyWeightGrams, undefined);
  const ev = parseRemoteRow("event", { id: "e", date: "2026-01-01", type: "nope" });
  assert.equal((ev!.entity as any).type, "other");
});

test("parseRemoteRow marks tombstones", () => {
  const parsed = parseRemoteRow("hive", { id: "h", name: "A", deletedAt: "2026-02-01T00:00:00Z" });
  assert.equal(parsed?.deletedAt, "2026-02-01T00:00:00Z");
});

test("decideMerge: equal timestamps never overwrite local data", () => {
  const t = "2026-06-12T10:00:00.000Z";
  assert.equal(
    decideMerge({ local: { updatedAt: t }, remote: { updatedAt: t }, remoteIsTombstone: false, hasPendingLocalOps: false }),
    "skip",
  );
});

test("decideMerge: newer remote wins, missing local is created", () => {
  const old = "2026-01-01T00:00:00Z";
  const nw = "2026-02-01T00:00:00Z";
  assert.equal(
    decideMerge({ local: { updatedAt: old }, remote: { updatedAt: nw }, remoteIsTombstone: false, hasPendingLocalOps: false }),
    "put",
  );
  assert.equal(
    decideMerge({ local: null, remote: { updatedAt: old }, remoteIsTombstone: false, hasPendingLocalOps: false }),
    "put",
  );
});

test("decideMerge: pending local ops produce a conflict only when remote is newer", () => {
  const old = "2026-01-01T00:00:00Z";
  const nw = "2026-02-01T00:00:00Z";
  assert.equal(
    decideMerge({ local: { updatedAt: old }, remote: { updatedAt: nw }, remoteIsTombstone: false, hasPendingLocalOps: true }),
    "conflict",
  );
  assert.equal(
    decideMerge({ local: { updatedAt: nw }, remote: { updatedAt: old }, remoteIsTombstone: false, hasPendingLocalOps: true }),
    "skip",
  );
});

test("decideMerge: remote tombstone deletes unchanged local, keeps newer local edits", () => {
  const old = "2026-01-01T00:00:00Z";
  const nw = "2026-02-01T00:00:00Z";
  const base = { remoteIsTombstone: true, hasPendingLocalOps: false };
  assert.equal(decideMerge({ ...base, local: { updatedAt: old }, remote: { updatedAt: nw } }), "deleteLocal");
  assert.equal(decideMerge({ ...base, local: { updatedAt: nw }, remote: { updatedAt: old } }), "skip");
  assert.equal(decideMerge({ ...base, local: null, remote: { updatedAt: nw } }), "skip");
});

const op = (id: string, operation: OutboxOp["operation"], recordId: string, ts: string, payload?: any): OutboxOp => ({
  id,
  entity: "hive",
  operation,
  recordId,
  payload,
  timestamp: ts,
  retryCount: 0,
});

test("planFlush collapses create+update of a new record into a single append", () => {
  const plan = planFlush(
    [
      op("1", "create", "h", "2026-01-01T00:00:01Z", { id: "h", name: "A" }),
      op("2", "update", "h", "2026-01-01T00:00:02Z", { id: "h", name: "B" }),
    ],
    { Hives: ["id"] },
  );
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.appends.Hives.rows.length, 1);
  assert.equal(plan.appends.Hives.rows[0][1], "B");
  assert.deepEqual(plan.appends.Hives.opIds.sort(), ["1", "2"]);
});

test("planFlush updates an existing row in place", () => {
  const plan = planFlush([op("1", "update", "h", "2026-01-01T00:00:01Z", { id: "h", name: "B" })], {
    Hives: ["id", "x", "h"],
  });
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].range, "Hives!A3:Z3");
  assert.equal(Object.keys(plan.appends).length, 0);
});

test("planFlush writes a tombstone for deleted synced records", () => {
  const plan = planFlush(
    [op("1", "delete", "h", "2026-01-01T00:00:01Z", { id: "h", name: "A", deletedAt: "2026-01-01T00:00:01Z" })],
    { Hives: ["id", "h"] },
  );
  assert.equal(plan.updates.length, 1);
  const deletedAtCol = SCHEMAS[SHEET_TABS.HIVES].indexOf("deletedAt");
  assert.equal(plan.updates[0].values[0][deletedAtCol], "2026-01-01T00:00:01Z");
});

test("planFlush drops deletes of records that never reached the sheet", () => {
  const plan = planFlush(
    [
      op("1", "create", "h", "2026-01-01T00:00:01Z", { id: "h", name: "A" }),
      op("2", "delete", "h", "2026-01-01T00:00:02Z", { id: "h", deletedAt: "x" }),
    ],
    { Hives: ["id"] },
  );
  assert.deepEqual(plan.noopOpIds.sort(), ["1", "2"]);
  assert.equal(plan.updates.length + plan.clears.length + Object.keys(plan.appends).length, 0);
});

test("planFlush blanks the row for legacy deletes without snapshot", () => {
  const plan = planFlush([op("1", "delete", "h", "2026-01-01T00:00:01Z")], { Hives: ["id", "h"] });
  assert.equal(plan.clears[0].range, "Hives!A2:Z2");
});

test("headersNeedWrite upgrades old headers but leaves custom ones alone", () => {
  const schema = SCHEMAS[SHEET_TABS.HIVES];
  assert.equal(headersNeedWrite([], schema), true);
  assert.equal(headersNeedWrite(schema.slice(0, 6) as string[], schema), true);
  assert.equal(headersNeedWrite([...schema], schema), false);
  assert.equal(headersNeedWrite(["id", "custom"], schema), false);
});
