import { Transaction } from "../domain/types";
import { normalizeSwishName } from "../domain/customers";
import { SwishRow } from "./swishHistoryParser";

export function createSwishKey(
  date: string | null,
  swishName: string,
  amountOre: number,
): string {
  const normName = normalizeSwishName(swishName);
  const dateStr = date || "nodate";
  return `swish|${dateStr}|${normName}|${amountOre}`;
}

export type SwishRowStatus = "new" | "already_booked" | "possibly_booked";

export interface ClassifiedSwishRow extends SwishRow {
  swishKey: string;
  status: SwishRowStatus;
}

export interface ClassificationResult {
  newRows: ClassifiedSwishRow[];
  alreadyBookedRows: ClassifiedSwishRow[];
  possiblyBookedRows: ClassifiedSwishRow[];
}

/**
 * Deduplicates and classifies Swish rows against existing transactions:
 * 1. Counts occurrences per key (date | normalized Swish name | amountOre).
 *    New rows per key = max(0, count in image - count already booked).
 * 2. Legacy transactions (category === "Honungsförsäljning" without externalReference)
 *    are matched by date + amountOre and flagged as "possibly_booked".
 */
export function classifySwishRows(
  rows: SwishRow[],
  transactions: Transaction[],
): ClassificationResult {
  // 1. Build counts of already booked Swish transactions by exact externalReference
  const bookedCounts = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.externalReference?.startsWith("swish|")) {
      const count = bookedCounts.get(tx.externalReference) || 0;
      bookedCounts.set(tx.externalReference, count + 1);
    }
  }

  // 2. Build counts of legacy honey sales (no externalReference) by date + amountOre
  const legacyCounts = new Map<string, number>();
  for (const tx of transactions) {
    const isHoneySale =
      tx.category === "Honungsförsäljning" || (tx.amountOre && tx.amountOre > 0);
    if (isHoneySale && !tx.externalReference) {
      const legKey = `${tx.date || "nodate"}|${tx.amountOre}`;
      const count = legacyCounts.get(legKey) || 0;
      legacyCounts.set(legKey, count + 1);
    }
  }

  const newRows: ClassifiedSwishRow[] = [];
  const alreadyBookedRows: ClassifiedSwishRow[] = [];
  const possiblyBookedRows: ClassifiedSwishRow[] = [];

  for (const row of rows) {
    const swishKey = createSwishKey(row.date, row.swishName, row.amountOre);
    const existingCount = bookedCounts.get(swishKey) || 0;

    if (existingCount > 0) {
      bookedCounts.set(swishKey, existingCount - 1);
      alreadyBookedRows.push({
        ...row,
        swishKey,
        status: "already_booked",
      });
      continue;
    }

    // Check legacy match
    const legacyKey = `${row.date || "nodate"}|${row.amountOre}`;
    const legacyCount = legacyCounts.get(legacyKey) || 0;

    if (legacyCount > 0) {
      legacyCounts.set(legacyKey, legacyCount - 1);
      possiblyBookedRows.push({
        ...row,
        swishKey,
        status: "possibly_booked",
      });
      continue;
    }

    newRows.push({
      ...row,
      swishKey,
      status: "new",
    });
  }

  return {
    newRows,
    alreadyBookedRows,
    possiblyBookedRows,
  };
}
