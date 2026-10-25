import test from "node:test";
import assert from "node:assert";
import { extractUniqueCustomers, filterCustomerSuggestions } from "./customers";
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
