import test from "node:test";
import assert from "node:assert/strict";
import { parseSwedishFinancialCsv } from "./csvParser.ts";
import { parseHistoricalNotes } from "./notesParser.ts";
import { Transaction } from "../domain/types.ts";
import { generateUUID } from "../domain/validation.ts";

test("parseSwedishFinancialCsv handles headers with trailing spaces and semicolon delimiter", () => {
  const sampleCsv = `Datum;Beskrivning ;Förändring;Ackumulerat;Motpart;Övrigt
2026-04-10;Socker till invintring;-245,50;1 754,50;Lantmännen;
2026-05-15;Honungsförsäljning 10 burkar;800,00;2 554,50;Grannen Sven;
2026-06-01;Tråd och vaxkakor;-150,00;2 404,50;Biredskapsaffären;
;Totalt saldo;;2 404,50;;`;

  const result = parseSwedishFinancialCsv(sampleCsv);

  assert.equal(result.totalRows, 4); // 3 transactions + 1 summary
  assert.equal(result.validCount, 3);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.malformedCount, 0);

  // Transactions to import
  assert.equal(result.transactionsToImport.length, 3);
  assert.equal(result.transactionsToImport[0].amountOre, -24550);
  assert.equal(result.transactionsToImport[1].amountOre, 80000);
  assert.equal(result.transactionsToImport[2].amountOre, -15000);

  // Reconciled balance: (-24550 + 80000 - 15000) = 40450 öre
  assert.equal(result.calculatedBalanceOre, 40450);
  assert.equal(result.lastImportedBalanceOre, 240450);
});

test("parseSwedishFinancialCsv detects duplicate transactions against existing ones", () => {
  const existing: Transaction[] = [
    {
      id: generateUUID(),
      date: "2026-05-15",
      description: "Honungsförsäljning 10 burkar",
      amountOre: 80000,
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const sampleCsv = `Datum;Beskrivning ;Förändring;Ackumulerat;Motpart
2026-05-15;Honungsförsäljning 10 burkar;800,00;800,00;Grannen Sven
2026-05-20;Nytt bisamhälle avläggare;-1 200,00;-400,00;Biodlarföreningen`;

  const result = parseSwedishFinancialCsv(sampleCsv, existing);

  assert.equal(result.validCount, 1);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.transactionsToImport.length, 1);
  assert.equal(result.transactionsToImport[0].description, "Nytt bisamhälle avläggare");
});

test("parseHistoricalNotes extracts tasks, harvests, events, and preserves ambiguous text", () => {
  const sampleNotes = `# Köpa
- Apistan eller Myrsyra
- 100 st 500 g glasburkar
- Täckvaxgaffel

# Nästa gång
- Sätta på skattlåda 2 på Kupa A

# Skörd
- 2026-07-20: Kupa A: 45 st 500 g burkar (60%)
- 2026-08-15: Kupa B: 25 kg honung

# Kupa A
- 2026-05-02: Första vårkontrollen. Drottning sedd, 4 ramar yngel.
- 2026-05-20: Satte på spärrgaller och första skattlådan.
Detta är en notering utan datum som bör hamna i oklassificerade.

# Avläggare 2026
- 2026-06-10: Gjorde 3-ramars avläggare med visecell.`;

  const result = parseHistoricalNotes(sampleNotes);

  // Check detected hives
  const hiveNames = result.detectedHives.map((h) => h.name);
  assert.ok(hiveNames.includes("Kupa A"));
  assert.ok(hiveNames.includes("Avläggare 2026"));

  // Check shopping tasks from Köpa
  assert.equal(result.tasks.length, 4); // 3 from Köpa, 1 from Nästa gång
  assert.ok(result.tasks.some((t) => t.title.includes("Apistan")));
  assert.ok(result.tasks.some((t) => t.title.includes("Sätta på skattlåda 2")));

  // Check harvests
  assert.equal(result.harvests.length, 2);
  assert.equal(result.harvests[0].jarCount, 45);
  assert.equal(result.harvests[0].jarSizeGrams, 500);
  assert.equal(result.harvests[1].honeyWeightGrams, 25000); // 25 kg = 25000 g

  // Check events
  assert.equal(result.events.length, 3);
  assert.equal(result.events[0].date, "2026-05-02");
  assert.ok(result.events[0].notes.includes("Första vårkontrollen"));

  // Check unclassified entries (preservation of ambiguous entries)
  assert.equal(result.unclassifiedEntries.length, 1);
  assert.ok(result.unclassifiedEntries[0].rawText.includes("utan datum"));
});

test("parseHistoricalNotes correctly identifies multiple hives (3 hives)", () => {
  const notesWithThreeHives = `
# Kupa 1
- 2026-05-01: Inspekterad, allt bra.

# Kupa 2
- 2026-05-02: Svag utveckling.

# Kupa 3
- 2026-05-03: Starkt samhälle.
`;

  const result = parseHistoricalNotes(notesWithThreeHives);
  assert.equal(result.detectedHives.length, 3);
  const hiveNames = result.detectedHives.map((h) => h.name);
  assert.ok(hiveNames.includes("Kupa 1"));
  assert.ok(hiveNames.includes("Kupa 2"));
  assert.ok(hiveNames.includes("Kupa 3"));
});

test("parseHistoricalNotes correctly identifies exact hives (Kupa A, B, C, Avläggare 2026) and ignores generic sections", () => {
  const notes = `
# Köpa
- Socker

# Skörd
- 2026-08-01: 20 kg

# Kupa A
- 2026-05-01: Ok

# Kupa B
- 2026-05-02: Ok

# Kupa C
- 2026-05-03: Ok

# Avläggare 2026
- 2026-06-01: Ny
`;

  const result = parseHistoricalNotes(notes);
  assert.equal(result.detectedHives.length, 4);
  const hiveNames = result.detectedHives.map((h) => h.name);
  assert.ok(hiveNames.includes("Kupa A"));
  assert.ok(hiveNames.includes("Kupa B"));
  assert.ok(hiveNames.includes("Kupa C"));
  assert.ok(hiveNames.includes("Avläggare 2026"));
  assert.equal(hiveNames.includes("Köpa"), false);
  assert.equal(hiveNames.includes("Skörd"), false);
});

test("parseHistoricalNotes correctly identifies exactly 4 hives without false positives from avläggare descriptions", () => {
  const realisticNotes = `
# Inköp
- 10 st ramar
- Drivfoder

# Kupa A
- 2026-05-15: Kupa A: Drottning sedd, 4 ramar täckt yngel
- 2026-05-28: Avläggare gjord på 3 ramar från Kupa A

# Kupa B
- 2026-05-16: Starkt samhälle, satt på skattlåda

# Kupa C
- 2026-05-18: Drottningcell borttagen, lugnt lynne

# Avläggare 2026
- 2026-06-05: Avläggare 2026: Ny drottning parad och lägger ägg
- 2026-06-15: Avläggare tillsatt foder
`;

  const result = parseHistoricalNotes(realisticNotes);
  const hiveNames = result.detectedHives.map((h) => h.name).sort();
  assert.equal(result.detectedHives.length, 4, `Expected exactly 4 hives, got ${result.detectedHives.length}: ${hiveNames.join(", ")}`);
  assert.deepEqual(hiveNames, ["Avläggare 2026", "Kupa A", "Kupa B", "Kupa C"]);
});

test("parseHistoricalNotes identifies hives from plain text without markdown hashes", () => {
  const plainTextNotes = `
Kupa A
2026-05-15: Drottning sedd, 4 ramar täckt yngel

Kupa B
2026-05-16: Starkt samhälle

Kupa C
2026-05-18: Lugnt lynne

Avläggare 2026
2026-06-05: Ny drottning
`;

  const result = parseHistoricalNotes(plainTextNotes);
  const hiveNames = result.detectedHives.map((h) => h.name).sort();
  assert.equal(result.detectedHives.length, 4);
  assert.deepEqual(hiveNames, ["Avläggare 2026", "Kupa A", "Kupa B", "Kupa C"]);
});

test("parseHistoricalNotes identifies hives with inline dash and space prefixes", () => {
  const inlineNotes = `
2026-05-15 Kupa A - 4 ramar yngel
2026-05-16 Kupa B, satt på skattlåda
2026-05-18 Kupa C: lugnt
2026-06-05 Avläggare 2026: matad
`;

  const result = parseHistoricalNotes(inlineNotes);
  const hiveNames = result.detectedHives.map((h) => h.name).sort();
  assert.equal(result.detectedHives.length, 4);
  assert.deepEqual(hiveNames, ["Avläggare 2026", "Kupa A", "Kupa B", "Kupa C"]);
});


