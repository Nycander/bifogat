import { Transaction } from "./types";

export interface CustomerSummary {
  name: string;
  transactionCount: number;
  saleCount: number;
  latestDate: string;
  totalSpentOre: number;
}

/**
 * Extracts unique customers/counterparties from transactions, prioritized by:
 * 1. Prior sales transactions (amountOre > 0)
 * 2. Total frequency of purchases
 * 3. Most recent transaction date
 */
export function extractUniqueCustomers(transactions: Transaction[]): string[] {
  if (!transactions || transactions.length === 0) return [];

  const map = new Map<string, CustomerSummary>();

  for (const tx of transactions) {
    const raw = tx.counterparty;
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lowerKey = trimmed.toLowerCase();
    const existing = map.get(lowerKey);

    const isSale = (tx.amountOre && tx.amountOre > 0) || tx.category === "Honungsförsäljning";
    const spentOre = (tx.amountOre && tx.amountOre > 0) ? tx.amountOre : 0;
    const txDate = tx.date || "";

    if (!existing) {
      map.set(lowerKey, {
        name: trimmed,
        transactionCount: 1,
        saleCount: isSale ? 1 : 0,
        latestDate: txDate,
        totalSpentOre: spentOre,
      });
    } else {
      existing.transactionCount += 1;
      if (isSale) existing.saleCount += 1;
      existing.totalSpentOre += spentOre;
      if (txDate > existing.latestDate) {
        existing.latestDate = txDate;
        // Prefer the casing of the most recent transaction
        existing.name = trimmed;
      }
    }
  }

  // Sort by saleCount desc, then latestDate desc, then total transactionCount desc
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.saleCount !== a.saleCount) {
      return b.saleCount - a.saleCount;
    }
    if (b.latestDate !== a.latestDate) {
      return b.latestDate.localeCompare(a.latestDate);
    }
    return b.transactionCount - a.transactionCount;
  });

  return sorted.map((s) => s.name);
}

/**
 * Filters customer list based on search query with smart matching:
 * - Prefix matches first ("Ann" matches "Anna Svensson" before "Susanne")
 * - Case-insensitive substring matching
 * - If query is empty, returns the top most frequent / recent customers up to limit
 */
export function filterCustomerSuggestions(
  customers: string[],
  query: string,
  limit: number = 6,
): string[] {
  if (!customers || customers.length === 0) return [];
  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    return customers.slice(0, limit);
  }

  const prefixMatches: string[] = [];
  const otherMatches: string[] = [];

  for (const name of customers) {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith(trimmedQuery)) {
      prefixMatches.push(name);
    } else if (lowerName.includes(trimmedQuery)) {
      otherMatches.push(name);
    }
  }

  return [...prefixMatches, ...otherMatches].slice(0, limit);
}
