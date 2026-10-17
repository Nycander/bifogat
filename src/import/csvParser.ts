import { Transaction } from "../domain/types";
import { parseSwedishCurrencyToOre, parseSwedishDate, generateUUID } from "../domain/validation";

export interface CsvRowPreview {
  rawLineIndex: number;
  date: string | null;
  rawDate: string;
  description: string;
  rawChange: string;
  amountOre: number | null;
  rawBalance: string;
  balanceOre: number | null;
  counterparty: string;
  status: "valid" | "skipped_balance_summary" | "malformed" | "duplicate";
  statusReason?: string;
}

export interface CsvImportResult {
  totalRows: number;
  validCount: number;
  skippedCount: number;
  malformedCount: number;
  duplicateCount: number;
  calculatedBalanceOre: number;
  lastImportedBalanceOre: number | null;
  balanceMatches: boolean;
  rows: CsvRowPreview[];
  transactionsToImport: Transaction[];
}

/**
 * Split CSV line handling quotes and semicolons/commas
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse Swedish financial CSV export
 */
export function parseSwedishFinancialCsv(
  csvContent: string,
  existingTransactions: Transaction[] = [],
): CsvImportResult {
  const rawLines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      skippedCount: 0,
      malformedCount: 0,
      duplicateCount: 0,
      calculatedBalanceOre: 0,
      lastImportedBalanceOre: null,
      balanceMatches: true,
      rows: [],
      transactionsToImport: [],
    };
  }

  // Detect delimiter: semicolon or comma
  const firstLine = rawLines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  // Read header
  const headerParts = splitCsvLine(firstLine, delimiter).map((h) => h.toLowerCase());

  // Match columns with tolerance for trailing whitespace (e.g. "Beskrivning ")
  const dateColIdx = headerParts.findIndex((h) => h.includes("datum") || h.includes("date"));
  const descColIdx = headerParts.findIndex((h) => h.includes("beskrivning") || h.includes("desc"));
  const changeColIdx = headerParts.findIndex(
    (h) => h.includes("förändring") || h.includes("belopp") || h.includes("amount"),
  );
  const balanceColIdx = headerParts.findIndex(
    (h) => h.includes("ackumulerat") || h.includes("saldo") || h.includes("balance"),
  );
  const counterpartyColIdx = headerParts.findIndex(
    (h) => h.includes("motpart") || h.includes("mottagare") || h.includes("avsändare"),
  );

  const previews: CsvRowPreview[] = [];
  const transactionsToImport: Transaction[] = [];

  let runningCalcOre = 0;
  let lastAckOre: number | null = null;

  for (let i = 1; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const cols = splitCsvLine(rawLine, delimiter);

    const rawDate = dateColIdx >= 0 && cols[dateColIdx] !== undefined ? cols[dateColIdx] : "";
    const rawDesc = descColIdx >= 0 && cols[descColIdx] !== undefined ? cols[descColIdx] : "";
    const rawChange =
      changeColIdx >= 0 && cols[changeColIdx] !== undefined ? cols[changeColIdx] : "";
    const rawBalance =
      balanceColIdx >= 0 && cols[balanceColIdx] !== undefined ? cols[balanceColIdx] : "";
    const rawCounterparty =
      counterpartyColIdx >= 0 && cols[counterpartyColIdx] !== undefined
        ? cols[counterpartyColIdx]
        : "";

    // Check if this row is an empty line or purely balance summary row (no date or no change)
    if (!rawDate && !rawChange && rawBalance) {
      const bOre = parseSwedishCurrencyToOre(rawBalance);
      if (bOre !== null) lastAckOre = bOre;
      previews.push({
        rawLineIndex: i + 1,
        date: null,
        rawDate,
        description: rawDesc || "Salderingsrad",
        rawChange,
        amountOre: null,
        rawBalance,
        balanceOre: bOre,
        counterparty: rawCounterparty,
        status: "skipped_balance_summary",
        statusReason: "Summerings-/saldorad utan enskild transaktionsförändring",
      });
      continue;
    }

    if (!rawDate && !rawDesc && !rawChange) {
      continue; // completely empty
    }

    const parsedDate = parseSwedishDate(rawDate);
    const parsedOre = parseSwedishCurrencyToOre(rawChange);
    const parsedBalOre = parseSwedishCurrencyToOre(rawBalance);
    if (parsedBalOre !== null) lastAckOre = parsedBalOre;

    if (!parsedDate || parsedOre === null || !rawDesc.trim()) {
      previews.push({
        rawLineIndex: i + 1,
        date: parsedDate,
        rawDate,
        description: rawDesc,
        rawChange,
        amountOre: parsedOre,
        rawBalance,
        balanceOre: parsedBalOre,
        counterparty: rawCounterparty,
        status: "malformed",
        statusReason: !parsedDate
          ? "Ogiltigt datumformat"
          : parsedOre === null
            ? "Ogiltigt belopp/förändring"
            : "Beskrivning saknas",
      });
      continue;
    }

    // Check duplicate against existing transactions in DB
    const isDuplicate = existingTransactions.some(
      (et) =>
        et.date === parsedDate &&
        et.description.trim() === rawDesc.trim() &&
        et.amountOre === parsedOre,
    );

    if (isDuplicate) {
      previews.push({
        rawLineIndex: i + 1,
        date: parsedDate,
        rawDate,
        description: rawDesc,
        rawChange,
        amountOre: parsedOre,
        rawBalance,
        balanceOre: parsedBalOre,
        counterparty: rawCounterparty,
        status: "duplicate",
        statusReason: "Motsvarande transaktion finns redan registrerad",
      });
      continue;
    }

    // Valid transaction row
    runningCalcOre += parsedOre;
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: generateUUID(),
      date: parsedDate,
      description: rawDesc,
      amountOre: parsedOre,
      counterparty: rawCounterparty || undefined,
      source: "import",
      createdAt: now,
      updatedAt: now,
    };

    transactionsToImport.push(tx);

    previews.push({
      rawLineIndex: i + 1,
      date: parsedDate,
      rawDate,
      description: rawDesc,
      rawChange,
      amountOre: parsedOre,
      rawBalance,
      balanceOre: parsedBalOre,
      counterparty: rawCounterparty,
      status: "valid",
    });
  }

  const validCount = previews.filter((r) => r.status === "valid").length;
  const skippedCount = previews.filter((r) => r.status === "skipped_balance_summary").length;
  const malformedCount = previews.filter((r) => r.status === "malformed").length;
  const duplicateCount = previews.filter((r) => r.status === "duplicate").length;

  const balanceMatches = lastAckOre !== null ? runningCalcOre === lastAckOre : true;

  return {
    totalRows: previews.length,
    validCount,
    skippedCount,
    malformedCount,
    duplicateCount,
    calculatedBalanceOre: runningCalcOre,
    lastImportedBalanceOre: lastAckOre,
    balanceMatches,
    rows: previews,
    transactionsToImport,
  };
}
