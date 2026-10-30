import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSwedishCurrencyToOre,
  formatOreToSEK,
  parseSwedishDate,
  calculateBalance,
  generateUUID,
  isValidUUID,
  validateHive,
} from "./validation.ts";
import { Transaction } from "./types.ts";

test("parseSwedishCurrencyToOre parses standard Swedish amounts with decimal commas", () => {
  assert.equal(parseSwedishCurrencyToOre("1 250,50 kr"), 125050);
  assert.equal(parseSwedishCurrencyToOre("1250,50"), 125050);
  assert.equal(parseSwedishCurrencyToOre("50,00"), 5000);
  assert.equal(parseSwedishCurrencyToOre("50,5"), 5050);
  assert.equal(parseSwedishCurrencyToOre("0,25"), 25);
  assert.equal(parseSwedishCurrencyToOre("0"), 0);
  assert.equal(parseSwedishCurrencyToOre("0,00"), 0);
});

test("parseSwedishCurrencyToOre handles negative amounts and unicode minus signs", () => {
  // Standard ASCII minus
  assert.equal(parseSwedishCurrencyToOre("-450,00"), -45000);
  assert.equal(parseSwedishCurrencyToOre("- 450,00 kr"), -45000);
  // Unicode minus \u2212
  assert.equal(parseSwedishCurrencyToOre("−150,00"), -15000);
  assert.equal(parseSwedishCurrencyToOre("− 1 345,75 kr"), -134575);
  // En-dash \u2013
  assert.equal(parseSwedishCurrencyToOre("–85,50"), -8550);
});

test("parseSwedishCurrencyToOre handles numbers and invalid strings gracefully", () => {
  assert.equal(parseSwedishCurrencyToOre(123.45), 12345);
  assert.equal(parseSwedishCurrencyToOre(-50), -5000);
  assert.equal(parseSwedishCurrencyToOre(""), null);
  assert.equal(parseSwedishCurrencyToOre("   "), null);
  assert.equal(parseSwedishCurrencyToOre("inte ett tal"), null);
  assert.equal(parseSwedishCurrencyToOre("1,2,3"), null);
});

test("formatOreToSEK formats öre to Swedish currency convention with thousands spaces", () => {
  assert.equal(formatOreToSEK(125050), "1 250,50 kr");
  assert.equal(formatOreToSEK(-45000), "-450,00 kr");
  assert.equal(formatOreToSEK(0), "0,00 kr");
  assert.equal(formatOreToSEK(75), "0,75 kr");
});

test("parseSwedishDate parses ISO and European date formats and rejects invalid dates", () => {
  assert.equal(parseSwedishDate("2026-05-18"), "2026-05-18");
  assert.equal(parseSwedishDate("2026/05/18"), "2026-05-18");
  assert.equal(parseSwedishDate("18/05/2026"), "2026-05-18");
  assert.equal(parseSwedishDate("18-05-2026"), "2026-05-18");
  assert.equal(parseSwedishDate("invalid"), null);
  assert.equal(parseSwedishDate("2026-13-45"), null);
});

test("calculateBalance correctly calculates transaction sums in öre", () => {
  const transactions: Transaction[] = [
    {
      id: generateUUID(),
      date: "2026-05-01",
      description: "Honungsförsäljning 5 burkar",
      amountOre: 40000, // +400 kr
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateUUID(),
      date: "2026-05-02",
      description: "Inköp sockerlösning",
      amountOre: -15000, // -150 kr
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: generateUUID(),
      date: "2026-05-03",
      description: "Glasburkar med lock",
      amountOre: -8550, // -85.50 kr
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  assert.equal(calculateBalance(transactions), 16450); // 164.50 kr
});

test("validation helper checks UUIDs and required fields", () => {
  const validId = generateUUID();
  assert.equal(isValidUUID(validId), true);
  assert.equal(isValidUUID("abc-123"), false);

  const hiveValidation = validateHive({
    id: validId,
    name: "Kupa A",
    status: "active",
  });
  assert.equal(hiveValidation.valid, true);

  const invalidHive = validateHive({
    id: "bad",
    name: "",
    status: "active",
  });
  assert.equal(invalidHive.valid, false);
  assert.ok(invalidHive.errors.length >= 2);
});
