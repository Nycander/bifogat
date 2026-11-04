import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractJarCountFromTransaction,
  isHoneySaleTransaction,
  calculateCustomerAnalytics,
  isMarketOrChannelName,
} from "./customerAnalytics";
import { Transaction } from "./types";

test("isMarketOrChannelName identifies markets, fairs, flea markets and associations", () => {
  assert.equal(isMarketOrChannelName("Bällsta Villaägareförening Backluckeloppis"), true);
  assert.equal(isMarketOrChannelName("Reko-ring Lund"), true);
  assert.equal(isMarketOrChannelName("Julmarknad Stortorget"), true);
  assert.equal(isMarketOrChannelName("Gårdsbutiken i Skåne"), true);
  assert.equal(isMarketOrChannelName("Anna Svensson"), false);
});

test("extractJarCountFromTransaction extracts jars from various description styles", () => {
  // Pattern 1: standard with "burkar"
  assert.equal(extractJarCountFromTransaction("Honungsförsäljning: 3 st burkar (500g) till Anna"), 3);
  assert.equal(extractJarCountFromTransaction("2 burkar honung"), 2);
  assert.equal(extractJarCountFromTransaction("1 burk"), 1);

  // Pattern 2: "X st"
  assert.equal(extractJarCountFromTransaction("Honung: 4 st"), 4);

  // Pattern 3: "2 x 500g"
  assert.equal(extractJarCountFromTransaction("2 x 500g"), 2);

  // Pattern 4: Fallback from amountOre (e.g. 285 kr = 3 burkar à 95 kr)
  assert.equal(extractJarCountFromTransaction("Swish inbetalning", 28500, 9500), 3);
  assert.equal(extractJarCountFromTransaction("Swish inbetalning", 19000, 9500), 2);
  assert.equal(extractJarCountFromTransaction("Swish inbetalning", 9500, 9500), 1);
});

test("isHoneySaleTransaction identifies honey sales and ignores expenses or other categories", () => {
  const sale1: Transaction = {
    id: "tx-1",
    date: "2024-08-10",
    description: "Honungsförsäljning",
    amountOre: 19000,
    category: "Honungsförsäljning",
    source: "manual",
    createdAt: "",
    updatedAt: "",
  };
  assert.equal(isHoneySaleTransaction(sale1), true);

  const expense: Transaction = {
    id: "tx-2",
    date: "2024-08-10",
    description: "Inköp av glasburkar",
    amountOre: -50000,
    category: "Burkar & Emballage",
    source: "manual",
    createdAt: "",
    updatedAt: "",
  };
  assert.equal(isHoneySaleTransaction(expense), false);

  const unnamedIncomeWithCustomer: Transaction = {
    id: "tx-3",
    date: "2024-08-10",
    description: "2 burkar sommarhonung",
    amountOre: 19000,
    counterparty: "Johan Berg",
    source: "manual",
    createdAt: "",
    updatedAt: "",
  };
  assert.equal(isHoneySaleTransaction(unnamedIncomeWithCustomer), true);
});

test("calculateCustomerAnalytics accurately aggregates 5 years of honey transactions", () => {
  const transactions: Transaction[] = [
    // Anna Svensson: bought across 4 years (2022, 2023, 2024, 2026) -> Trogen stamkund
    {
      id: "t1",
      date: "2022-08-15",
      description: "Honungsförsäljning: 3 st burkar",
      amountOre: 28500,
      counterparty: "Anna Svensson",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "t2",
      date: "2023-08-20",
      description: "Honungsförsäljning: 4 st burkar",
      amountOre: 38000,
      counterparty: "Anna Svensson",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "t3",
      date: "2024-09-01",
      description: "Honungsförsäljning: 3 st burkar",
      amountOre: 28500,
      counterparty: "Anna Svensson",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "t4",
      date: "2026-07-28",
      description: "Honungsförsäljning: 6 st burkar",
      amountOre: 57000,
      counterparty: "Anna Svensson",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },

    // Björn Lind: bought in 2022 and 2023, but nothing in 2026 -> Vilande stamkund
    {
      id: "t5",
      date: "2022-07-10",
      description: "Honungsförsäljning: 2 st burkar",
      amountOre: 19000,
      counterparty: "Björn Lind",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "t6",
      date: "2023-08-14",
      description: "Honungsförsäljning: 2 st burkar",
      amountOre: 19000,
      counterparty: "Björn Lind",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },

    // Cecilia Ek: bought first time in 2026 -> Ny i år
    {
      id: "t7",
      date: "2026-08-01",
      description: "Honungsförsäljning: 2 st burkar",
      amountOre: 19000,
      counterparty: "Cecilia Ek",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "",
      updatedAt: "",
    },
  ];

  const report = calculateCustomerAnalytics(transactions, { currentYear: "2026" });

  assert.equal(report.totalCustomers, 3);
  assert.equal(report.regularCount, 1); // Anna Svensson
  assert.equal(report.lapsedCount, 1); // Björn Lind
  assert.equal(report.newCount, 1); // Cecilia Ek

  // Find Anna Svensson
  const anna = report.customers.find((c) => c.name === "Anna Svensson");
  assert.ok(anna);
  assert.equal(anna.status, "regular");
  assert.equal(anna.statusLabel, "Trogen stamkund");
  assert.equal(anna.totalJars, 16); // 3 + 4 + 3 + 6 = 16
  assert.equal(anna.activeYearCount, 4); // 2022, 2023, 2024, 2026
  assert.equal(anna.estimatedAnnualJars, 4); // 16 / 4 = 4 burkar/år

  // Yearly breakdown for Anna
  assert.equal(anna.yearlyBreakdown.length, 4);
  assert.equal(anna.yearlyBreakdown[0].year, "2026");
  assert.equal(anna.yearlyBreakdown[0].jars, 6);

  // Find Björn Lind
  const bjorn = report.customers.find((c) => c.name === "Björn Lind");
  assert.ok(bjorn);
  assert.equal(bjorn.status, "lapsed");
  assert.equal(bjorn.statusLabel, "Vilande stamkund");
  assert.equal(bjorn.totalJars, 4); // 2 + 2 = 4
  assert.equal(bjorn.activeYearCount, 2); // 2022, 2023
  assert.equal(bjorn.estimatedAnnualJars, 2); // 4 / 2 = 2 burkar/år

  // Total estimated annual demand from regular stamkunder
  assert.equal(report.regularEstimatedAnnualJars, 4); // Anna's 4
});
