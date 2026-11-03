import test from "node:test";
import assert from "node:assert/strict";
import { Transaction } from "./types";
import {
  calculateHoneyCostBreakdown,
  classifyExpense,
  HONEY_COST_CATEGORIES,
} from "./honeyCostBreakdown";

test("classifyExpense accurately maps keywords to beekeeping cost categories", () => {
  const txJars: Transaction = {
    id: "tx-1",
    date: "2026-06-01",
    description: "Inköp 100 st glasburkar 500g och guldlock",
    amountOre: -125000,
    source: "manual",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };
  assert.equal(classifyExpense(txJars), "jars_packaging");

  const txFeed: Transaction = {
    id: "tx-2",
    date: "2026-08-15",
    description: "2 dunkar Bifor sockerlösning för invintring",
    amountOre: -84000,
    source: "manual",
    createdAt: "2026-08-15T10:00:00Z",
    updatedAt: "2026-08-15T10:00:00Z",
  };
  assert.equal(classifyExpense(txFeed), "feed_wintering");

  const txWax: Transaction = {
    id: "tx-3",
    date: "2026-05-10",
    description: "Paket vaxmellanväggar Svea och ramtråd",
    amountOre: -65000,
    source: "manual",
    createdAt: "2026-05-10T10:00:00Z",
    updatedAt: "2026-05-10T10:00:00Z",
  };
  assert.equal(classifyExpense(txWax), "wax_frames");

  const txHealth: Transaction = {
    id: "tx-4",
    date: "2026-11-20",
    description: "Oxalsyra för vinterdroppning mot varroa",
    amountOre: -22000,
    source: "manual",
    createdAt: "2026-11-20T10:00:00Z",
    updatedAt: "2026-11-20T10:00:00Z",
  };
  assert.equal(classifyExpense(txHealth), "health_varroa");

  const txQueen: Transaction = {
    id: "tx-5",
    date: "2026-07-02",
    description: "Parad Buckfast drottning från avelsstation",
    amountOre: -55000,
    source: "manual",
    createdAt: "2026-07-02T10:00:00Z",
    updatedAt: "2026-07-02T10:00:00Z",
  };
  assert.equal(classifyExpense(txQueen), "queen_breeding");
});

test("calculateHoneyCostBreakdown produces pedagogical model when no expenses recorded", () => {
  const result = calculateHoneyCostBreakdown([], 9500, 100);
  assert.equal(result.totalExpenseOre, 0);
  assert.equal(result.categories.length, HONEY_COST_CATEGORIES.length);
  assert.equal(result.standardJarPriceOre, 9500);

  // Each category should have valid percentages and per-jar amounts
  for (const cat of result.categories) {
    assert.ok(cat.percentage > 0);
    assert.ok(cat.costPerJarOre > 0);
  }
});

test("calculateHoneyCostBreakdown computes cost per jar and proportions from actual transactions", () => {
  const transactions: Transaction[] = [
    {
      id: "tx-1",
      date: "2026-06-01",
      description: "100 st burkar och etiketter",
      amountOre: -140000, // 1400 kr -> jars
      source: "manual",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
    {
      id: "tx-2",
      date: "2026-08-20",
      description: "Bifor vinterfoder",
      amountOre: -100000, // 1000 kr -> feed
      source: "manual",
      createdAt: "2026-08-20T10:00:00Z",
      updatedAt: "2026-08-20T10:00:00Z",
    },
    {
      id: "tx-3",
      date: "2026-09-01",
      description: "Sälj 10 st burkar honung",
      amountOre: 95000, // 950 kr -> 95 kr/jar
      source: "manual",
      createdAt: "2026-09-01T10:00:00Z",
      updatedAt: "2026-09-01T10:00:00Z",
    },
  ];

  const result = calculateHoneyCostBreakdown(transactions, 9500, 100);

  assert.equal(result.totalExpenseOre, 240000); // 2400 kr
  assert.equal(result.totalSoldJars, 10);
  assert.equal(result.standardJarPriceOre, 9500); // 95 kr
  assert.equal(result.costPerJarOre, 2400); // 2400 kr / 100 jars = 24 kr/jar
  assert.equal(result.profitPerJarOre, 7100); // 95 kr - 24 kr = 71 kr

  // Categories present: jars and feed
  const jarCat = result.categories.find((c) => c.id === "jars_packaging");
  const feedCat = result.categories.find((c) => c.id === "feed_wintering");

  assert.ok(jarCat);
  assert.ok(feedCat);
  assert.equal(jarCat?.totalExpenseOre, 140000);
  assert.equal(feedCat?.totalExpenseOre, 100000);
});
