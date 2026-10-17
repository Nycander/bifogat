import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSwedishFinancialCsv } from './csvParser.ts';
import { parseHistoricalNotes } from './notesParser.ts';
import { Transaction } from '../domain/types.ts';
import { generateUUID } from '../domain/validation.ts';

test('parseSwedishFinancialCsv handles headers with trailing spaces and semicolon delimiter', () => {
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

test('parseSwedishFinancialCsv detects duplicate transactions against existing ones', () => {
  const existing: Transaction[] = [
    {
      id: generateUUID(),
      date: '2026-05-15',
      description: 'Honungsförsäljning 10 burkar',
      amountOre: 80000,
      source: 'manual',
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
  assert.equal(result.transactionsToImport[0].description, 'Nytt bisamhälle avläggare');
});

test('parseHistoricalNotes extracts tasks, harvests, events, and preserves ambiguous text', () => {
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
  assert.ok(hiveNames.includes('Kupa A'));
  assert.ok(hiveNames.includes('Avläggare 2026'));

  // Check shopping tasks from Köpa
  assert.equal(result.tasks.length, 4); // 3 from Köpa, 1 from Nästa gång
  assert.ok(result.tasks.some((t) => t.title.includes('Apistan')));
  assert.ok(result.tasks.some((t) => t.title.includes('Sätta på skattlåda 2')));

  // Check harvests
  assert.equal(result.harvests.length, 2);
  assert.equal(result.harvests[0].jarCount, 45);
  assert.equal(result.harvests[0].jarSizeGrams, 500);
  assert.equal(result.harvests[1].honeyWeightGrams, 25000); // 25 kg = 25000 g

  // Check events
  assert.equal(result.events.length, 3);
  assert.equal(result.events[0].date, '2026-05-02');
  assert.ok(result.events[0].notes.includes('Första vårkontrollen'));

  // Check unclassified entries (preservation of ambiguous entries)
  assert.equal(result.unclassifiedEntries.length, 1);
  assert.ok(result.unclassifiedEntries[0].rawText.includes('utan datum'));
});
