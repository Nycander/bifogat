import test from "node:test";
import assert from "node:assert";
import {
  extractUniqueCustomers,
  filterCustomerSuggestions,
  findFuzzyCustomerMatches,
  deriveSwishAliases,
  rankCustomerSuggestionsForSwish,
} from "./customers";
import { Transaction } from "./types";

test("extractUniqueCustomers extracts unique customers ranked by sales count and recency", () => {
  const transactions: Transaction[] = [
    {
      id: "1",
      date: "2026-06-01",
      description: "Försäljning 1 burk",
      amountOre: 9500,
      counterparty: "Anna Andersson",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
    {
      id: "2",
      date: "2026-06-15",
      description: "Försäljning 2 burkar",
      amountOre: 19000,
      counterparty: "Bengt Granne",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-06-15T10:00:00Z",
      updatedAt: "2026-06-15T10:00:00Z",
    },
    {
      id: "3",
      date: "2026-07-01",
      description: "Försäljning 3 burkar",
      amountOre: 28500,
      counterparty: "Anna Andersson",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-07-01T10:00:00Z",
      updatedAt: "2026-07-01T10:00:00Z",
    },
    {
      id: "4",
      date: "2026-06-10",
      description: "Inköp ramar",
      amountOre: -35000,
      counterparty: "Biredskapsfabriken",
      category: "Utrustning",
      source: "manual",
      createdAt: "2026-06-10T10:00:00Z",
      updatedAt: "2026-06-10T10:00:00Z",
    },
  ];

  const customers = extractUniqueCustomers(transactions);

  // Anna Andersson has 2 sales, Bengt Granne has 1 sale, Biredskapsfabriken has 0 sales
  assert.strictEqual(customers[0], "Anna Andersson");
  assert.strictEqual(customers[1], "Bengt Granne");
  assert.strictEqual(customers[2], "Biredskapsfabriken");
});

test("extractUniqueCustomers handles whitespace, casing, and empty counterparties", () => {
  const transactions: Transaction[] = [
    {
      id: "1",
      date: "2026-05-01",
      description: "Sale",
      amountOre: 9500,
      counterparty: "  Cecilia Berg  ",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-05-01T10:00:00Z",
      updatedAt: "2026-05-01T10:00:00Z",
    },
    {
      id: "2",
      date: "2026-06-01",
      description: "Sale",
      amountOre: 9500,
      counterparty: "cecilia berg",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    },
    {
      id: "3",
      date: "2026-06-02",
      description: "Anonymous sale",
      amountOre: 9500,
      counterparty: "",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-06-02T10:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    },
    {
      id: "4",
      date: "2026-06-03",
      description: "Undefined counterparty",
      amountOre: 9500,
      source: "manual",
      createdAt: "2026-06-03T10:00:00Z",
      updatedAt: "2026-06-03T10:00:00Z",
    },
  ];

  const customers = extractUniqueCustomers(transactions);
  assert.strictEqual(customers.length, 1);
  assert.strictEqual(customers[0].toLowerCase(), "cecilia berg");
});

test("filterCustomerSuggestions provides prefix matches first and supports empty query", () => {
  const customerList = [
    "Anna Andersson",
    "Susanne Lind",
    "Ann-Marie",
    "Björn Johansson",
    "Grannen Peter",
  ];

  // Empty query returns top results up to limit
  const defaultSuggestions = filterCustomerSuggestions(customerList, "", 3);
  assert.deepStrictEqual(defaultSuggestions, [
    "Anna Andersson",
    "Susanne Lind",
    "Ann-Marie",
  ]);

  // Query "Ann" should match "Anna Andersson" and "Ann-Marie" first (prefix), then "Susanne Lind" (contains 'ann')
  const matched = filterCustomerSuggestions(customerList, "ann", 5);
  assert.strictEqual(matched[0], "Anna Andersson");
  assert.strictEqual(matched[1], "Ann-Marie");
  assert.strictEqual(matched[2], "Susanne Lind");
});

test("findFuzzyCustomerMatches matches reordered names (Berg Anna -> Anna Berg)", () => {
  const customers = ["Anna Berg", "Erik Lind", "Cecilia Holm"];
  const matches = findFuzzyCustomerMatches(customers, "Berg Anna");
  assert.strictEqual(matches[0], "Anna Berg");
});

test("findFuzzyCustomerMatches matches truncated names with ellipsis", () => {
  const customers = ["Maximilian Alexander Lindqvist", "Anna Berg"];
  const matches = findFuzzyCustomerMatches(customers, "Lindqvist Maximilian Alexa...");
  assert.strictEqual(matches[0], "Maximilian Alexander Lindqvist");
});

test("findFuzzyCustomerMatches matches first name + initial", () => {
  const customers = ["Erik Lind", "Erik Nilsson", "Anna Berg"];
  const matches = findFuzzyCustomerMatches(customers, "Erik L");
  assert.strictEqual(matches[0], "Erik Lind");
});

test("deriveSwishAliases extracts learned alias from transactions", () => {
  const transactions: Transaction[] = [
    {
      id: "tx-1",
      date: "2026-10-01",
      description: "Honung",
      amountOre: 10000,
      counterparty: "Anna Berg",
      externalReference: "swish|2026-10-01|berg anna|10000",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z",
    },
    {
      id: "tx-2",
      date: "2026-10-15",
      description: "Honung",
      amountOre: 20000,
      counterparty: "Anna Berg",
      externalReference: "swish|2026-10-15|berg anna|20000",
      category: "Honungsförsäljning",
      source: "manual",
      createdAt: "2026-10-15T10:00:00Z",
      updatedAt: "2026-10-15T10:00:00Z",
    },
  ];

  const aliases = deriveSwishAliases(transactions);
  assert.strictEqual(aliases.get("berg anna"), "Anna Berg");
});

test("rankCustomerSuggestionsForSwish prioritizes alias first then fuzzy matches", () => {
  const allCustomers = ["Erik Lind", "Bengt Granne", "Anna Berg"];
  const ranked = rankCustomerSuggestionsForSwish(
    "Berg Anna",
    allCustomers,
    "Anna Berg (Favorit)",
    4,
  );
  assert.strictEqual(ranked[0], "Anna Berg (Favorit)");
  assert.ok(ranked.includes("Anna Berg"));
  assert.ok(ranked.length <= 4);
});
