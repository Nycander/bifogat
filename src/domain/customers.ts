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

/**
 * Calculates Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * Normalizes a Swish name for stable comparison and alias lookups.
 * Lowercases, collapses whitespace, and strips trailing ellipsis.
 */
export function normalizeSwishName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/(\.{2,}|…)$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Derives learned customer aliases from past transactions with externalReference.
 * Format: swish|<date>|<normalizedSwishName>|<amountOre> -> counterparty
 * Returns a map from normalized Swish name to most frequent chosen customer name.
 */
export function deriveSwishAliases(transactions: Transaction[]): Map<string, string> {
  const counts = new Map<string, Map<string, { count: number; latestDate: string }>>();

  for (const tx of transactions) {
    if (!tx.externalReference?.startsWith("swish|") || !tx.counterparty) continue;
    const parts = tx.externalReference.split("|");
    if (parts.length < 4) continue;
    const rawSwishName = parts[2];
    const normalized = normalizeSwishName(rawSwishName);
    const chosenName = tx.counterparty.trim();
    if (!normalized || !chosenName) continue;

    let customerMap = counts.get(normalized);
    if (!customerMap) {
      customerMap = new Map();
      counts.set(normalized, customerMap);
    }

    const current = customerMap.get(chosenName) || { count: 0, latestDate: "" };
    current.count += 1;
    if (tx.date && tx.date > current.latestDate) {
      current.latestDate = tx.date;
    }
    customerMap.set(chosenName, current);
  }

  const aliasMap = new Map<string, string>();
  for (const [swishName, customerMap] of counts.entries()) {
    let bestName = "";
    let bestCount = -1;
    let bestDate = "";

    for (const [name, stats] of customerMap.entries()) {
      if (
        stats.count > bestCount ||
        (stats.count === bestCount && stats.latestDate > bestDate)
      ) {
        bestCount = stats.count;
        bestName = name;
        bestDate = stats.latestDate;
      }
    }

    if (bestName) {
      aliasMap.set(swishName, bestName);
    }
  }

  return aliasMap;
}

/**
 * Fuzzy matches existing customers against a Swish name with ranking:
 * 1. Exact case-insensitive match
 * 2. Token permutation match (Berg Anna == Anna Berg)
 * 3. Truncated prefix match (Lindqvist Maximilian Alexa... -> Maximilian Alexander Lindqvist)
 * 4. First name only or First name + initial
 * 5. Edit distance <= 2 on tokens
 */
export function findFuzzyCustomerMatches(
  customers: string[],
  rawSwishName: string,
  limit: number = 4,
): string[] {
  if (!customers || customers.length === 0 || !rawSwishName) return [];

  const isTruncated = /(\.{3}|…)$/.test(rawSwishName.trim());
  const normalized = normalizeSwishName(rawSwishName);
  const swishTokens = normalized.split(" ").filter(Boolean);
  if (swishTokens.length === 0) return [];

  interface MatchCandidate {
    name: string;
    score: number; // lower score is better match
  }

  const candidates: MatchCandidate[] = [];

  for (const customer of customers) {
    const custClean = customer.trim();
    const custLower = custClean.toLowerCase();
    const custTokens = custLower.split(" ").filter(Boolean);

    // 1. Exact match
    if (custLower === normalized) {
      candidates.push({ name: custClean, score: 1 });
      continue;
    }

    // 2. Token set permutation match (e.g. "Berg Anna" -> "Anna Berg")
    const swishSorted = [...swishTokens].sort().join(" ");
    const custSorted = [...custTokens].sort().join(" ");
    if (swishSorted === custSorted) {
      candidates.push({ name: custClean, score: 2 });
      continue;
    }

    // 3. Truncated prefix match (e.g. Swish name was truncated by app UI)
    if (isTruncated) {
      // Swish starts with customer or customer starts with swish
      if (custLower.startsWith(normalized) || normalized.startsWith(custLower)) {
        candidates.push({ name: custClean, score: 3 });
        continue;
      }
      // Or matches surname + truncated first name
      const matchingPrefixTokens = swishTokens.filter((st) =>
        custTokens.some((ct) => ct.startsWith(st) || st.startsWith(ct)),
      );
      if (matchingPrefixTokens.length >= Math.min(2, swishTokens.length)) {
        candidates.push({ name: custClean, score: 4 });
        continue;
      }
    }

    // 4. First name + last name initial (e.g. "Anna B" -> "Anna Berg")
    if (swishTokens.length === 2 && custTokens.length === 2) {
      const isFirstAndInitial =
        (swishTokens[0] === custTokens[0] && custTokens[1].startsWith(swishTokens[1][0])) ||
        (swishTokens[1] === custTokens[0] && custTokens[1].startsWith(swishTokens[0][0]));
      if (isFirstAndInitial) {
        candidates.push({ name: custClean, score: 5 });
        continue;
      }
    }

    // 5. First name only match when customer has unique single token match
    if (swishTokens[0] === custTokens[0] || swishTokens.includes(custTokens[0])) {
      candidates.push({ name: custClean, score: 6 });
      continue;
    }

    // 6. Token edit distance <= 2
    let tokenMatches = 0;
    for (const st of swishTokens) {
      if (custTokens.some((ct) => levenshteinDistance(st, ct) <= (st.length > 4 ? 2 : 1))) {
        tokenMatches++;
      }
    }
    if (tokenMatches >= Math.ceil(swishTokens.length / 2)) {
      candidates.push({ name: custClean, score: 7 });
      continue;
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  const result: string[] = [];
  for (const c of candidates) {
    if (!result.includes(c.name)) {
      result.push(c.name);
      if (result.length >= limit) break;
    }
  }

  return result;
}

/**
 * Chip ranking for a Swish name:
 * 1. The learned alias from earlier imports
 * 2. Fuzzy matches among existing customers (reordered tokens, prefix, initials, edit distance)
 * 3. Recent or frequent customers from the general pool
 * Returns 3-4 deduplicated quick chips.
 */
export function rankCustomerSuggestionsForSwish(
  rawSwishName: string,
  allCustomers: string[],
  learnedAlias?: string,
  limit: number = 4,
): string[] {
  const result: string[] = [];

  const add = (name?: string) => {
    if (!name) return;
    const trimmed = name.trim();
    if (trimmed && !result.includes(trimmed)) {
      result.push(trimmed);
    }
  };

  // 1. Learned alias
  if (learnedAlias) {
    add(learnedAlias);
  }

  // 2. Fuzzy matches
  const fuzzy = findFuzzyCustomerMatches(allCustomers, rawSwishName, limit);
  for (const name of fuzzy) {
    add(name);
    if (result.length >= limit) return result;
  }

  // 3. General frequent/recent customers
  for (const name of allCustomers) {
    add(name);
    if (result.length >= limit) break;
  }

  return result.slice(0, limit);
}
