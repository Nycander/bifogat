import test from "node:test";
import assert from "node:assert/strict";
import { parseSwishHistoryText, parseSwedishMonth } from "./swishHistoryParser";

test("parseSwedishMonth handles Swedish months, periods, and OCR noise", () => {
  assert.equal(parseSwedishMonth("jan"), 1);
  assert.equal(parseSwedishMonth("feb."), 2);
  assert.equal(parseSwedishMonth("mars"), 3);
  assert.equal(parseSwedishMonth("maj"), 5);
  assert.equal(parseSwedishMonth("okt."), 10);
  assert.equal(parseSwedishMonth("0kt."), 10); // OCR '0' instead of 'O'
  assert.equal(parseSwedishMonth("dec"), 12);
  assert.equal(parseSwedishMonth("unknown"), null);
});

test("parseSwishHistoryText parses the spec sample with 5 rows and identical entries", () => {
  const sample = `
Berg Anna 200 kr
29 okt.
Erik Lind 200 kr
29 okt.
Lindqvist Maximilian Alexa... 100 kr
27 okt.
Erik Lind 100 kr
8 okt.
Erik Lind 100 kr
8 okt.
`;
  // Fixed reference date: 2026-11-01
  const today = new Date(2026, 10, 1);
  const rows = parseSwishHistoryText(sample, today);

  assert.equal(rows.length, 5);

  assert.equal(rows[0].swishName, "Berg Anna");
  assert.equal(rows[0].amountOre, 20000);
  assert.equal(rows[0].date, "2026-10-29");
  assert.equal(rows[0].nameTruncated, false);

  assert.equal(rows[1].swishName, "Erik Lind");
  assert.equal(rows[1].amountOre, 20000);
  assert.equal(rows[1].date, "2026-10-29");

  assert.equal(rows[2].swishName, "Lindqvist Maximilian Alexa");
  assert.equal(rows[2].amountOre, 10000);
  assert.equal(rows[2].date, "2026-10-27");
  assert.equal(rows[2].nameTruncated, true);

  assert.equal(rows[3].swishName, "Erik Lind");
  assert.equal(rows[3].amountOre, 10000);
  assert.equal(rows[3].date, "2026-10-08");

  assert.equal(rows[4].swishName, "Erik Lind");
  assert.equal(rows[4].amountOre, 10000);
  assert.equal(rows[4].date, "2026-10-08");
});

test("parseSwishHistoryText handles thousands separators and decimals", () => {
  const sample = `
Grossist AB 1 200 kr
15 maj
Lilla Gården 95,50 kr
14 maj
`;
  const today = new Date(2026, 5, 1);
  const rows = parseSwishHistoryText(sample, today);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].amountOre, 120000);
  assert.equal(rows[1].amountOre, 9550);
});

test("parseSwishHistoryText handles Idag and Igår", () => {
  const sample = `
Karin S 100 kr
Idag
Mats O 100 kr
Igår
`;
  const today = new Date(2026, 9, 20); // 2026-10-20
  const rows = parseSwishHistoryText(sample, today);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, "2026-10-20");
  assert.equal(rows[1].date, "2026-10-19");
});

test("parseSwishHistoryText handles year boundary going backwards in time", () => {
  // Newest first: Jan 5 -> then Dec 28 (belongs to previous year!)
  const sample = `
Kalle 100 kr
5 jan.
Stina 100 kr
28 dec.
`;
  const today = new Date(2026, 0, 10); // 2026-01-10
  const rows = parseSwishHistoryText(sample, today);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, "2026-01-05");
  assert.equal(rows[1].date, "2025-12-28");
});

test("parseSwishHistoryText drops outgoing payments starting with minus", () => {
  const sample = `
Inkommande Kund 200 kr
10 okt.
-Utgående Betalning 500 kr
9 okt.
`;
  const today = new Date(2026, 9, 15);
  const rows = parseSwishHistoryText(sample, today);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].swishName, "Inkommande Kund");
});

test("parseSwishHistoryText assigns date: null when no date line is present", () => {
  const sample = `
Namnlös Betalning 100 kr
Okänd rad utan datum
`;
  const rows = parseSwishHistoryText(sample);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, null);
});
