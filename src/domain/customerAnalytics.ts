import { Transaction } from "./types";

export interface CustomerYearlyStats {
  year: string;
  jars: number;
  spentOre: number;
  orderCount: number;
}

export type CustomerLoyaltyStatus =
  | "regular" // Handlat under minst 2 olika år och aktiv
  | "repeater" // Minst 2 köp, men inom samma år
  | "new" // Första köpet gjordes under senaste aktiva säsongen
  | "lapsed" // Stammis (>= 2 år) som inte handlat under senaste säsongen
  | "single" // Endast 1 köp historiskt (före senaste säsongen)
  | "channel"; // Försäljningskanal (marknad, mässa, Reko-ring, butik, återförsäljare)

export interface CustomerAnalytics {
  name: string;
  firstDate: string;
  latestDate: string;
  totalJars: number;
  totalSpentOre: number;
  orderCount: number;
  activeYears: string[]; // Sorterade unika år t.ex. ["2021", "2022", "2024"]
  activeYearCount: number;
  estimatedAnnualJars: number; // Snitt per aktivt år (avrundat till 1 decimal)
  status: CustomerLoyaltyStatus;
  statusLabel: string;
  isChannel?: boolean;
  yearlyBreakdown: CustomerYearlyStats[];
  transactions: Transaction[];
  averageJarsPerOrder: number;
}

export interface AggregateCustomerReport {
  totalCustomers: number;
  regularCount: number;
  lapsedCount: number;
  newCount: number;
  channelCount: number;
  channelTotalJars: number;
  channelTotalSpentOre: number;
  totalEstimatedAnnualJars: number; // Summan av alla stammisars och aktiva kunders förväntade årsbehov
  regularEstimatedAnnualJars: number; // Enbart trogna stammisars förväntade årsbehov
  totalHoneyRevenueOre: number;
  totalJarsSold: number;
  averageJarsPerCustomer: number;
  allYears: string[]; // Alla år i fallande ordning t.ex. ["2026", "2025", ...]
  latestYear: string;
  customers: CustomerAnalytics[];
}

/**
 * Helper function to detect if a counterparty name represents a sales channel
 * (market, fair, Reko-ring, reseller, store, business) rather than a private consumer.
 */
export function isMarketOrChannelName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const n = name.trim().toLowerCase();

  const keywords = [
    "marknad",
    "julmarknad",
    "höstmarknad",
    "vårmarknad",
    "skördefest",
    "mässa",
    "massa",
    "reko",
    "rekoring",
    "reko-ring",
    "butik",
    "gårdsbutik",
    "skafferiet",
    "bageri",
    "café",
    "cafe",
    "restaurang",
    "delikatess",
    "ica",
    "coop",
    "hemköp",
    "återförsäljare",
    "företag",
    "aktiebolag",
    " ab",
    "ab ",
    "handelsbolag",
    "matsal",
  ];

  return keywords.some((kw) => n.includes(kw));
}

/**
 * Robust extraction of honey jar count from transaction description or amount.
 * 1. Checks regex matches like "3 st burkar", "2 burkar", "5 st", "3x500g"
 * 2. If no pattern matches, falls back to dividing amountOre by defaultPriceOre
 */
export function extractJarCountFromTransaction(
  description: string = "",
  amountOre: number = 0,
  defaultPriceOre: number = 9500, // 95 kr default
): number {
  const desc = description.toLowerCase();

  // Pattern 1: e.g. "3 st burkar", "3 burkar", "1 burk"
  const jarMatch = desc.match(/(\d+)\s*(?:st)?\s*burk(?:ar)?/);
  if (jarMatch && jarMatch[1]) {
    const val = parseInt(jarMatch[1], 10);
    if (val > 0) return val;
  }

  // Pattern 2: e.g. "honungsförsäljning: 4 st" or "4 st à 95 kr"
  const stMatch = desc.match(/(\d+)\s*st\b/);
  if (stMatch && stMatch[1]) {
    const val = parseInt(stMatch[1], 10);
    if (val > 0) return val;
  }

  // Pattern 3: e.g. "2x 500g" or "2 x 500g"
  const multiMatch = desc.match(/(\d+)\s*[x*]\s*\d+\s*g/);
  if (multiMatch && multiMatch[1]) {
    const val = parseInt(multiMatch[1], 10);
    if (val > 0) return val;
  }

  // Pattern 4: If positive honey income and reasonable amount, derive from price
  if (amountOre > 0 && defaultPriceOre > 0) {
    const derived = Math.round(amountOre / defaultPriceOre);
    return Math.max(1, derived);
  }

  return 1;
}

/**
 * Identifies if a transaction represents a honey sale.
 */
export function isHoneySaleTransaction(tx: Transaction): boolean {
  if (tx.amountOre <= 0) return false;
  if (tx.category === "Honungsförsäljning") return true;

  const desc = (tx.description || "").toLowerCase();
  if (desc.includes("honung") || desc.includes("burk") || desc.includes("slung")) {
    return true;
  }

  // If no category is assigned, but positive amount with counterparty, treat as sale
  if (!tx.category && tx.counterparty) return true;

  return false;
}

export interface CustomerAnalyticsOptions {
  currentYear?: string;
  defaultPriceOre?: number;
  channelOverrides?: Record<string, "consumer" | "channel">;
}

/**
 * Calculates comprehensive customer analytics across all transaction history.
 * Designed for multi-year beekeeping data (e.g. 5+ years).
 */
export function calculateCustomerAnalytics(
  transactions: Transaction[],
  options: CustomerAnalyticsOptions = {},
): AggregateCustomerReport {
  const defaultPriceOre = options.defaultPriceOre || 9500;

  // Filter only honey sale transactions with valid counterparty
  const honeySales = transactions.filter((tx) => isHoneySaleTransaction(tx) && tx.counterparty?.trim());

  // Collect all unique years in data
  const yearsSet = new Set<string>();
  for (const tx of transactions) {
    const yr = (tx.date || "").substring(0, 4);
    if (/^\d{4}$/.test(yr)) {
      yearsSet.add(yr);
    }
  }

  const allYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  const latestYear = options.currentYear || allYears[0] || new Date().getFullYear().toString();

  // Group by normalized customer name (case-insensitive)
  interface CustomerDraft {
    displayName: string;
    transactions: Transaction[];
  }
  const customerMap = new Map<string, CustomerDraft>();

  for (const tx of honeySales) {
    const rawName = tx.counterparty!.trim();
    const key = rawName.toLowerCase();
    const existing = customerMap.get(key);
    if (!existing) {
      customerMap.set(key, { displayName: rawName, transactions: [tx] });
    } else {
      existing.transactions.push(tx);
      // Keep newest casing
      if (tx.date && (!existing.transactions[0].date || tx.date > existing.transactions[0].date)) {
        existing.displayName = rawName;
      }
    }
  }

  const customers: CustomerAnalytics[] = [];
  let totalHoneyRevenueOre = 0;
  let totalJarsSold = 0;
  let totalEstimatedAnnualJars = 0;
  let regularEstimatedAnnualJars = 0;
  let regularCount = 0;
  let lapsedCount = 0;
  let newCount = 0;
  let channelCount = 0;
  let channelTotalJars = 0;
  let channelTotalSpentOre = 0;

  for (const draft of customerMap.values()) {
    const txs = [...draft.transactions].sort((a, b) => b.date.localeCompare(a.date));
    const firstDate = txs[txs.length - 1].date;
    const latestDate = txs[0].date;

    let custJars = 0;
    let custSpentOre = 0;
    const yearlyMap = new Map<string, CustomerYearlyStats>();

    for (const tx of txs) {
      const yr = (tx.date || "").substring(0, 4) || "Okänt";
      const jars = extractJarCountFromTransaction(tx.description, tx.amountOre, defaultPriceOre);
      const spent = tx.amountOre || 0;

      custJars += jars;
      custSpentOre += spent;

      const yStat = yearlyMap.get(yr) || { year: yr, jars: 0, spentOre: 0, orderCount: 0 };
      yStat.jars += jars;
      yStat.spentOre += spent;
      yStat.orderCount += 1;
      yearlyMap.set(yr, yStat);
    }

    const yearlyBreakdown = Array.from(yearlyMap.values()).sort((a, b) => b.year.localeCompare(a.year));
    const activeYears = yearlyBreakdown.map((y) => y.year).sort((a, b) => a.localeCompare(b));
    const activeYearCount = activeYears.length;

    // Calculation: Average jars per active year
    const rawAnnual = activeYearCount > 0 ? custJars / activeYearCount : custJars;
    const estimatedAnnualJars = Math.round(rawAnnual * 10) / 10;

    // Determine if this counterparty is a sales channel (market, fair, reseller) vs private consumer
    const key = draft.displayName.toLowerCase().trim();
    const override = options.channelOverrides?.[key];
    const isChannel = override ? override === "channel" : isMarketOrChannelName(draft.displayName);

    // Determine loyalty status
    const boughtInLatestYear = activeYears.includes(latestYear);
    const firstYear = (firstDate || "").substring(0, 4);

    let status: CustomerLoyaltyStatus = "single";
    let statusLabel = "Engångskund";

    if (isChannel) {
      status = "channel";
      statusLabel = "Försäljningskanal";
      channelCount++;
      channelTotalJars += custJars;
      channelTotalSpentOre += custSpentOre;
    } else if (activeYearCount >= 2) {
      if (boughtInLatestYear) {
        status = "regular";
        statusLabel = "Trogen stamkund";
        regularCount++;
        regularEstimatedAnnualJars += estimatedAnnualJars;
      } else {
        status = "lapsed";
        statusLabel = "Vilande stamkund";
        lapsedCount++;
      }
    } else if (txs.length >= 2) {
      status = "repeater";
      statusLabel = "Återkommande";
    } else if (firstYear === latestYear) {
      status = "new";
      statusLabel = "Ny i år";
      newCount++;
    } else {
      status = "single";
      statusLabel = "Tidigare köpare";
    }

    if (!isChannel) {
      totalEstimatedAnnualJars += estimatedAnnualJars;
    }
    totalHoneyRevenueOre += custSpentOre;
    totalJarsSold += custJars;

    const avgJarsPerOrder = txs.length > 0 ? Math.round((custJars / txs.length) * 10) / 10 : custJars;

    customers.push({
      name: draft.displayName,
      firstDate,
      latestDate,
      totalJars: custJars,
      totalSpentOre: custSpentOre,
      orderCount: txs.length,
      activeYears,
      activeYearCount,
      estimatedAnnualJars,
      status,
      statusLabel,
      isChannel,
      yearlyBreakdown,
      transactions: txs,
      averageJarsPerOrder: avgJarsPerOrder,
    });
  }

  // Default sorting: highest estimated annual demand first, then total spent
  customers.sort((a, b) => {
    if (b.estimatedAnnualJars !== a.estimatedAnnualJars) {
      return b.estimatedAnnualJars - a.estimatedAnnualJars;
    }
    return b.totalSpentOre - a.totalSpentOre;
  });

  const totalCustomers = customers.length;
  const avgJarsPerCust = totalCustomers > 0 ? Math.round((totalJarsSold / totalCustomers) * 10) / 10 : 0;

  return {
    totalCustomers,
    regularCount,
    lapsedCount,
    newCount,
    channelCount,
    channelTotalJars,
    channelTotalSpentOre,
    totalEstimatedAnnualJars: Math.round(totalEstimatedAnnualJars),
    regularEstimatedAnnualJars: Math.round(regularEstimatedAnnualJars),
    totalHoneyRevenueOre,
    totalJarsSold,
    averageJarsPerCustomer: avgJarsPerCust,
    allYears,
    latestYear,
    customers,
  };
}
