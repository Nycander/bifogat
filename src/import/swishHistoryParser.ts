export interface SwishRow {
  id: string; // ephemeral client ID for inbox state
  rawName: string;
  swishName: string;
  amountOre: number;
  date: string | null; // YYYY-MM-DD or null
  nameTruncated: boolean;
  rawText: string;
}

/**
 * Normalizes month strings, tolerating OCR noise like "0kt" for "okt",
 * and periods like "okt.".
 */
export function parseSwedishMonth(mStr: string): number | null {
  if (!mStr) return null;
  const clean = mStr
    .toLowerCase()
    .replace(/[.,:;]$/, "")
    .replace(/0/g, "o")
    .trim();

  if (clean.startsWith("jan")) return 1;
  if (clean.startsWith("feb")) return 2;
  if (clean.startsWith("mar")) return 3;
  if (clean.startsWith("apr")) return 4;
  if (clean.startsWith("maj")) return 5;
  if (clean.startsWith("jun")) return 6;
  if (clean.startsWith("jul")) return 7;
  if (clean.startsWith("aug")) return 8;
  if (clean.startsWith("sep")) return 9;
  if (clean.startsWith("okt")) return 10;
  if (clean.startsWith("nov")) return 11;
  if (clean.startsWith("dec")) return 12;

  return null;
}

export function formatZeroPaddedDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * State machine parsing Swish transaction history text from OCR.
 *
 * Rules:
 * 1. Line matching amount (... kr) starts a row; preceding text on the line is the name.
 * 2. Following date line attaches to the most recent row.
 * 3. Supports Swedish month names, Idag, Igår, and tolerates OCR noise.
 * 4. Resolves missing years based on chronological descending order relative to 'today'.
 * 5. Drop lines starting with minus sign (outgoing payments).
 */
export function parseSwishHistoryText(text: string, today: Date = new Date()): SwishRow[] {
  if (!text || typeof text !== "string") return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedRawRows: Array<{
    swishName: string;
    amountOre: number;
    month: number | null;
    day: number | null;
    nameTruncated: boolean;
    rawText: string;
  }> = [];

  // Match amount like "200 kr", "1 200 kr", "95,00 kr", "150.50 kr"
  // Name is before the amount
  const AMOUNT_REGEX = /^(.+?)\s+([+-]?\d[\d\s\u00a0]*([.,]\d{1,2})?)\s*kr\b/i;

  let currentRow: (typeof parsedRawRows)[0] | null = null;

  for (const line of lines) {
    // Drop outgoing payments
    if (line.startsWith("-")) {
      currentRow = null;
      continue;
    }

    const amountMatch = line.match(AMOUNT_REGEX);
    if (amountMatch) {
      const rawName = amountMatch[1].trim();
      const rawAmount = amountMatch[2];

      // Ignore negative amounts
      if (rawAmount.includes("-")) {
        currentRow = null;
        continue;
      }

      // Convert amount string to ore
      const cleanNum = rawAmount.replace(/[\s\u00a0]/g, "").replace(",", ".");
      const amountVal = parseFloat(cleanNum);
      if (isNaN(amountVal) || amountVal <= 0) {
        continue;
      }
      const amountOre = Math.round(amountVal * 100);

      const nameTruncated = /(\.{3}|…)$/.test(rawName);
      const cleanName = rawName.replace(/(\.{3}|…)$/, "").trim();

      const newRow = {
        swishName: cleanName || rawName,
        amountOre,
        month: null,
        day: null,
        nameTruncated,
        rawText: line,
      };

      parsedRawRows.push(newRow);
      currentRow = newRow;
      continue;
    }

    // If we have an active row without a date, test if this line is a date line
    if (currentRow && currentRow.month === null) {
      const lower = line.toLowerCase();

      // Check Idag / Igår
      if (lower.startsWith("idag")) {
        currentRow.month = today.getMonth() + 1;
        currentRow.day = today.getDate();
        currentRow.rawText += `\n${line}`;
        continue;
      }
      if (lower.startsWith("igår") || lower.startsWith("igar")) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        currentRow.month = yesterday.getMonth() + 1;
        currentRow.day = yesterday.getDate();
        currentRow.rawText += `\n${line}`;
        continue;
      }

      // Check "29 okt." or "8 okt" or "15 mars"
      const dateMatch = line.match(/^(\d{1,2})\s+([a-zA-Z0-9åäöéÅÄÖÉ]+)/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const m = parseSwedishMonth(dateMatch[2]);
        if (m !== null && day >= 1 && day <= 31) {
          currentRow.month = m;
          currentRow.day = day;
          currentRow.rawText += `\n${line}`;
          continue;
        }
      }

      // Check ISO format YYYY-MM-DD or MM-DD
      const isoMatch = line.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        currentRow.month = parseInt(isoMatch[2], 10);
        currentRow.day = parseInt(isoMatch[3], 10);
        currentRow.rawText += `\n${line}`;
        continue;
      }
    }
  }

  // Derive years for each row
  // List is newest first.
  let currentYear = today.getFullYear();
  let prevMonth: number | null = null;
  let prevDay: number | null = null;

  const result: SwishRow[] = [];

  for (let i = 0; i < parsedRawRows.length; i++) {
    const raw = parsedRawRows[i];

    let dateString: string | null = null;

    if (raw.month !== null && raw.day !== null) {
      // For the first row with a valid date:
      if (prevMonth === null) {
        // If (currentYear, month, day) is in the future relative to today, it belongs to last year
        const rowDateThisYear = new Date(currentYear, raw.month - 1, raw.day);
        const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (rowDateThisYear > todayReset) {
          currentYear -= 1;
        }
      } else {
        // Subsequent rows: if month/day is strictly greater than previous, a year boundary has passed backwards
        if (
          raw.month > prevMonth ||
          (raw.month === prevMonth && raw.day > (prevDay || 0))
        ) {
          currentYear -= 1;
        }
      }

      prevMonth = raw.month;
      prevDay = raw.day;
      dateString = formatZeroPaddedDate(currentYear, raw.month, raw.day);
    }

    result.push({
      id: `swish-row-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rawName: raw.swishName,
      swishName: raw.swishName,
      amountOre: raw.amountOre,
      date: dateString,
      nameTruncated: raw.nameTruncated,
      rawText: raw.rawText,
    });
  }

  return result;
}
