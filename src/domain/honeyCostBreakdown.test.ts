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

  const txFreight: Transaction = {
    id: "tx-6",
    date: "2026-04-12",
    description: "Frakt PostNord webborder bihuvuddukar och verktyg",
    amountOre: -14900,
    source: "manual",
    createdAt: "2026-04-12T10:00:00Z",
    updatedAt: "2026-04-12T10:00:00Z",
  };
  assert.equal(classifyExpense(txFreight), "transport_yard");

  const txEducation: Transaction = {
    id: "tx-7",
    date: "2026-03-05",
    description: "Biodlarkurs fördjupning och kurslitteratur bok",
    amountOre: -120000,
    source: "manual",
    createdAt: "2026-03-05T10:00:00Z",
    updatedAt: "2026-03-05T10:00:00Z",
  };
  assert.equal(classifyExpense(txEducation), "education_books");
});

test("calculateHoneyCostBreakdown produces pedagogical model when no expenses recorded", () => {
  const result = calculateHoneyCostBreakdown([], 9500);
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
      amountOre: -140000, // 1400 kr -> jars (58.3%)
      source: "manual",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
    {
      id: "tx-2",
      date: "2026-08-20",
      description: "Bifor vinterfoder",
      amountOre: -100000, // 1000 kr -> feed (41.7%)
      source: "manual",
      createdAt: "2026-08-20T10:00:00Z",
      updatedAt: "2026-08-20T10:00:00Z",
    },
    {
      id: "tx-3",
      date: "2026-09-01",
      description: "Sälj 10 st burkar honung",
      amountOre: 95000,
      source: "manual",
      createdAt: "2026-09-01T10:00:00Z",
      updatedAt: "2026-09-01T10:00:00Z",
    },
  ];

  const result = calculateHoneyCostBreakdown(transactions, 9500);

  assert.equal(result.totalExpenseOre, 240000); // 2400 kr
  assert.equal(result.totalSoldJars, 10);
  assert.equal(result.standardJarPriceOre, 9500); // 95 kr

  // Categories present: jars and feed
  const jarCat = result.categories.find((c) => c.id === "jars_packaging");
  const feedCat = result.categories.find((c) => c.id === "feed_wintering");

  assert.ok(jarCat);
  assert.ok(feedCat);
  assert.equal(jarCat?.totalExpenseOre, 140000);
  assert.equal(feedCat?.totalExpenseOre, 100000);

  // Proportions: jars has 14/24 of 95 kr = ~55 kr, feed has 10/24 of 95 kr = ~40 kr
  assert.ok(jarCat!.costPerJarOre > feedCat!.costPerJarOre);
  assert.equal(jarCat!.percentage > feedCat!.percentage, true);

  // Verify categories are sorted descending by cost size
  for (let i = 0; i < result.categories.length - 1; i++) {
    assert.ok(
      result.categories[i].totalExpenseOre >= result.categories[i + 1].totalExpenseOre,
      `Category at ${i} should be >= category at ${i + 1}`,
    );
  }
});

test("calculateHoneyCostBreakdown demo mode sorts categories strictly descending by cost size", () => {
  const result = calculateHoneyCostBreakdown([], 9500);
  for (let i = 0; i < result.categories.length - 1; i++) {
    assert.ok(
      result.categories[i].percentage >= result.categories[i + 1].percentage,
      `Category ${result.categories[i].name} should be >= ${result.categories[i + 1].name}`,
    );
  }
});

test("classifyExpense respects explicit category set in Google Sheets / Excel even without descriptive text", () => {
  const tx: Transaction = {
    id: "tx-custom",
    date: "2026-07-10",
    description: "Kvitto #4892 från leverantör",
    amountOre: -45000,
    category: "Burkar, lock & etiketter",
    source: "import",
    createdAt: "2026-07-10T10:00:00Z",
    updatedAt: "2026-07-10T10:00:00Z",
  };

  assert.equal(classifyExpense(tx), "jars_packaging");
});

