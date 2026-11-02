import test from "node:test";
import assert from "node:assert/strict";
import { classifySwishRows, createSwishKey } from "./swishDuplicates";
import { SwishRow } from "./swishHistoryParser";
import { Transaction } from "../domain/types";

test("createSwishKey normalizes name and creates deterministic key", () => {
  const k1 = createSwishKey("2026-10-08", "  Erik Lind...  ", 10000);
  const k2 = createSwishKey("2026-10-08", "erik lind", 10000);
  assert.equal(k1, "swish|2026-10-08|erik lind|10000");
  assert.equal(k1, k2);
});

test("classifySwishRows keeps two identical rows on the same day as separate new rows", () => {
  const rows: SwishRow[] = [
    {
      id: "r1",
      rawName: "Erik Lind",
      swishName: "Erik Lind",
      amountOre: 10000,
      date: "2026-10-08",
      nameTruncated: false,
      rawText: "Erik Lind 100 kr",
    },
    {
      id: "r2",
      rawName: "Erik Lind",
      swishName: "Erik Lind",
      amountOre: 10000,
      date: "2026-10-08",
      nameTruncated: false,
      rawText: "Erik Lind 100 kr",
    },
  ];

  const transactions: Transaction[] = [];
  const { newRows, alreadyBookedRows } = classifySwishRows(rows, transactions);

  assert.equal(newRows.length, 2);
  assert.equal(alreadyBookedRows.length, 0);
});

test("classifySwishRows marks rows as already_booked when exact externalReference matches count", () => {
  const rows: SwishRow[] = [
    {
      id: "r1",
      rawName: "Erik Lind",
      swishName: "Erik Lind",
      amountOre: 10000,
      date: "2026-10-08",
      nameTruncated: false,
      rawText: "Erik Lind 100 kr",
    },
    {
      id: "r2",
      rawName: "Erik Lind",
      swishName: "Erik Lind",
      amountOre: 10000,
      date: "2026-10-08",
      nameTruncated: false,
      rawText: "Erik Lind 100 kr",
    },
  ];

  // 1 of them was already booked
  const transactions: Transaction[] = [
    {
      id: "tx-1",
      date: "2026-10-08",
      description: "Honung",
      amountOre: 10000,
      externalReference: "swish|2026-10-08|erik lind|10000",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-10-08T10:00:00Z",
      updatedAt: "2026-10-08T10:00:00Z",
    },
  ];

  const { newRows, alreadyBookedRows } = classifySwishRows(rows, transactions);

  assert.equal(newRows.length, 1);
  assert.equal(alreadyBookedRows.length, 1);
  assert.equal(alreadyBookedRows[0].id, "r1");
  assert.equal(newRows[0].id, "r2");
});

test("classifySwishRows flags legacy honey sale (no externalReference) as possibly_booked", () => {
  const rows: SwishRow[] = [
    {
      id: "r1",
      rawName: "Karin Blom",
      swishName: "Karin Blom",
      amountOre: 19000,
      date: "2026-09-12",
      nameTruncated: false,
      rawText: "Karin Blom 190 kr",
    },
  ];

  const legacyTx: Transaction[] = [
    {
      id: "tx-old",
      date: "2026-09-12",
      description: "Honungsförsäljning: 2 st till Karin",
      amountOre: 19000,
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-09-12T10:00:00Z",
      updatedAt: "2026-09-12T10:00:00Z",
    },
  ];

  const { newRows, alreadyBookedRows, possiblyBookedRows } = classifySwishRows(rows, legacyTx);

  assert.equal(newRows.length, 0);
  assert.equal(alreadyBookedRows.length, 0);
  assert.equal(possiblyBookedRows.length, 1);
  assert.equal(possiblyBookedRows[0].status, "possibly_booked");
});
