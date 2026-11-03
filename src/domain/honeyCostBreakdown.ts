import { Transaction } from "./types";

export interface CostCategoryDetail {
  id: string;
  name: string;
  iconName: string; // Lucide icon identifier
  color: string;
  darkColor: string;
  description: string;
  totalExpenseOre: number;
  percentage: number; // 0 - 100
  costPerJarOre: number; // öre per jar
  itemCount: number;
  sampleItems: string[];
}

export interface HoneyCostBreakdownResult {
  totalExpenseOre: number;
  totalIncomeOre: number;
  totalSoldJars: number;
  totalHarvestedJarsEstimate: number;
  standardJarPriceOre: number;
  costPerJarOre: number;
  profitPerJarOre: number;
  profitMarginPercent: number;
  categories: CostCategoryDetail[];
  unallocatedExpenseOre: number;
}

export interface CategorizationRule {
  id: string;
  name: string;
  iconName: string;
  color: string;
  darkColor: string;
  description: string;
  keywords: string[];
}

export const HONEY_COST_CATEGORIES: CategorizationRule[] = [
  {
    id: "jars_packaging",
    name: "Burkar, lock & etiketter",
    iconName: "Package",
    color: "#d97706", // warm amber
    darkColor: "#f59e0b",
    description: "Glasburkar, plåtlock, sigillremsor och tryckta honungsetiketter.",
    keywords: [
      "burk",
      "burkar",
      "lock",
      "etikett",
      "etiketter",
      "glas",
      "glasburk",
      "sigill",
      "emballage",
      "förpackning",
      "kartong",
      "tappning",
    ],
  },
  {
    id: "feed_wintering",
    name: "Vinterfoder & socker",
    iconName: "Wheat",
    color: "#ca8a04", // mustard amber
    darkColor: "#eab308",
    description: "Socker, Bifor, foderdeg och foderlådor för invintring och drivfordring.",
    keywords: [
      "foder",
      "bifor",
      "socker",
      "foderdeg",
      "apifonda",
      "apilife",
      "sirap",
      "invintring",
      "foderlåda",
      "utfodring",
      "vinterfoder",
    ],
  },
  {
    id: "wax_frames",
    name: "Vaxmellanväggar & ramar",
    iconName: "Layers",
    color: "#b45309", // dark bronze
    darkColor: "#d97706",
    description: "Vaxkakor, ramvirke (Svea/Farrar/LN), trådning och vaxsmältning.",
    keywords: [
      "vax",
      "mellanvägg",
      "mellanväggar",
      "ram",
      "ramar",
      "ramvirke",
      "tråd",
      "trådning",
      "trådspännare",
      "kakvax",
      "farrar",
      "svea",
      "lågnormal",
      "ln",
    ],
  },
  {
    id: "health_varroa",
    name: "Varroabehandling & hälsa",
    iconName: "ShieldAlert",
    color: "#dc2626", // red
    darkColor: "#f87171",
    description: "Oxalsyra, myrsyra, förångare, skyddsutrustning och bisjukdomskontroller.",
    keywords: [
      "varroa",
      "oxalsyra",
      "myrsyra",
      "tymol",
      "apiguard",
      "behandling",
      "hälsa",
      "förångare",
      "droppning",
      "syra",
      "kvalster",
      "botten",
    ],
  },
  {
    id: "queen_breeding",
    name: "Drottningar & genetik",
    iconName: "Crown",
    color: "#9333ea", // royal purple
    darkColor: "#c084fc",
    description: "Parade drottningar, avläggare, omlarvning, kläckburar och parningskupor.",
    keywords: [
      "drottning",
      "drottningar",
      "avläggare",
      "samhälle",
      "samhällen",
      "svärm",
      "parningskupa",
      "apidea",
      "larvning",
      "cell",
      "buckfast",
      "nordbi",
      "carnica",
      "italienare",
    ],
  },
  {
    id: "hive_hardware",
    name: "Kupor, bottnar & tak",
    iconName: "Boxes",
    color: "#059669", // emerald
    darkColor: "#34d399",
    description: "Sarger, bottnar, tak, spärrgaller, flusterminskare och färg till kuporna.",
    keywords: [
      "kupa",
      "kupor",
      "sarg",
      "låda",
      "lådor",
      "botten",
      "nätbotten",
      "tak",
      "plåttak",
      "spärrgaller",
      "fluster",
      "färg",
      "kupfärg",
      "skattlåda",
    ],
  },
  {
    id: "extraction_tools",
    name: "Slungning & redskap",
    iconName: "Sparkles",
    color: "#2563eb", // blue
    darkColor: "#60a5fa",
    description: "Honungsslunga, avtäckningsgaffel, silar, refraktometer och rökkpust.",
    keywords: [
      "slunga",
      "slungning",
      "avtäckning",
      "gaffel",
      "sil",
      "silar",
      "refraktometer",
      "kärl",
      "tappkran",
      "rökpust",
      "kupkniv",
      "borste",
      "biborste",
      "smältare",
    ],
  },
  {
    id: "clothing_safety",
    name: "Skyddskläder & handskar",
    iconName: "Shield",
    color: "#0891b2", // cyan
    darkColor: "#22d3ee",
    description: "Bihuvudduk, bidräkt, jacka, läderhandskar och tvätt.",
    keywords: [
      "jacka",
      "dräkt",
      "bidräkt",
      "hatt",
      "slöja",
      "handskar",
      "läderhandskar",
      "overall",
      "skydd",
    ],
  },
  {
    id: "association_license",
    name: "Föreningsavgift & försäkring",
    iconName: "ScrollText",
    color: "#4f46e5", // indigo
    darkColor: "#818cf8",
    description: "Medlemskap i Sveriges Biodlares Riksförbund (SBR), distrikt, ansvarsförsäkring.",
    keywords: [
      "förening",
      "föreningsavgift",
      "sbr",
      "medlem",
      "medlemskap",
      "försäkring",
      "biodlarna",
      "distrikt",
      "prenumeration",
      "tidning",
    ],
  },
  {
    id: "transport_yard",
    name: "Bigård, ställning & drivmedel",
    iconName: "Truck",
    color: "#78716c", // warm stone
    darkColor: "#a8a29e",
    description: "Kupställningar, flis, ogräsduk, stängsel, bensin/el till bigårdstransporter.",
    keywords: [
      "ställning",
      "kupställning",
      "ben",
      "pall",
      "bensin",
      "diesel",
      "resa",
      "mil",
      "stängsel",
      "elstängsel",
      "stolpe",
      "markduk",
      "transport",
      "kärra",
    ],
  },
];

/**
 * Categorize a transaction based on description, category field, and counterparty.
 */
export function classifyExpense(tx: Transaction): string {
  const text = `${tx.description || ""} ${tx.category || ""} ${tx.counterparty || ""}`.toLowerCase();

  for (const cat of HONEY_COST_CATEGORIES) {
    for (const kw of cat.keywords) {
      // Word boundary or substring matching
      if (text.includes(kw)) {
        return cat.id;
      }
    }
  }

  // Fallbacks based on category field if present
  const catField = (tx.category || "").toLowerCase();
  if (catField.includes("foder")) return "feed_wintering";
  if (catField.includes("utrustning") || catField.includes("material")) return "hive_hardware";
  if (catField.includes("hälsa") || catField.includes("behandling")) return "health_varroa";
  if (catField.includes("drottning") || catField.includes("samhälle")) return "queen_breeding";
  if (catField.includes("förening")) return "association_license";

  return "other";
}

/**
 * Compute the full pedagogical cost breakdown of a honey jar.
 *
 * @param transactions All recorded transactions
 * @param fallbackPriceOre Default jar price in öre if no sales exist (default 95 kr = 9500 öre)
 * @param estimatedJarsProduced Optional override for total jars (defaults to sold count or 100)
 */
export function calculateHoneyCostBreakdown(
  transactions: Transaction[],
  fallbackPriceOre = 9500,
  estimatedJarsProduced?: number,
): HoneyCostBreakdownResult {
  let totalExpenseOre = 0;
  let totalIncomeOre = 0;
  let detectedSaleCount = 0;
  let detectedSaleTotalOre = 0;

  // Category accumulators
  const expenseByCategory: Record<
    string,
    { totalOre: number; count: number; samples: string[] }
  > = {};

  for (const cat of HONEY_COST_CATEGORIES) {
    expenseByCategory[cat.id] = { totalOre: 0, count: 0, samples: [] };
  }
  expenseByCategory["other"] = { totalOre: 0, count: 0, samples: [] };

  for (const tx of transactions) {
    const amount = tx.amountOre || 0;
    if (amount < 0) {
      // Expense
      const absAmount = Math.abs(amount);
      totalExpenseOre += absAmount;
      const catId = classifyExpense(tx);
      const acc = expenseByCategory[catId] || expenseByCategory["other"];
      acc.totalOre += absAmount;
      acc.count += 1;
      if (acc.samples.length < 3 && tx.description) {
        acc.samples.push(tx.description);
      }
    } else if (amount > 0) {
      // Income
      totalIncomeOre += amount;

      // Detect honey jar sales from description pattern (e.g. "5 st burkar" or "Honungsförsäljning")
      const desc = tx.description || "";
      const match = desc.match(/(\d+)\s*(?:st|burkar?)/i);
      if (match && match[1]) {
        const jars = parseInt(match[1], 10);
        if (!isNaN(jars) && jars > 0 && jars < 1000) {
          detectedSaleCount += jars;
          detectedSaleTotalOre += amount;
        }
      } else if (tx.category === "Honungsförsäljning") {
        // Approximate jars assuming ~95 kr per jar if not parsed
        const estimatedJars = Math.max(1, Math.round(amount / 9500));
        detectedSaleCount += estimatedJars;
        detectedSaleTotalOre += amount;
      }
    }
  }

  // Determine baseline jar price
  const averageSalePriceOre =
    detectedSaleCount > 0 ? Math.round(detectedSaleTotalOre / detectedSaleCount) : fallbackPriceOre;

  // Use a realistic or chosen denominator for jars produced
  // If user harvested/sold jars, use that; otherwise default to a standard hobby apiary season (e.g. 100 burkar)
  const effectiveJars =
    estimatedJarsProduced && estimatedJarsProduced > 0
      ? estimatedJarsProduced
      : Math.max(detectedSaleCount > 0 ? detectedSaleCount : 100, 30);

  // If there are zero recorded expenses, provide standard realistic Swedish hobby apiary demo proportions
  // so the jar visualization is immediately rich and educational rather than an empty jar!
  let categories: CostCategoryDetail[] = [];
  let unallocatedExpenseOre = 0;

  if (totalExpenseOre === 0) {
    // Pedagogical demo model based on Sveriges Biodlares Riksförbund cost calculations for hobby beekeeping
    // Assuming a standard 95 kr / 500g honey jar:
    // ~12 kr Burkar/etiketter (13%)
    // ~11 kr Vinterfoder (12%)
    // ~14 kr Ramar & vax (15%)
    // ~8 kr Varroabekämpning (8%)
    // ~9 kr Drottningar/genetik (9%)
    // ~13 kr Kupor & trävaror (14%)
    // ~10 kr Slungning & redskap (11%)
    // ~5 kr Skyddskläder (5%)
    // ~5 kr Föreningsavgift & försäkring (5%)
    // ~8 kr Drivmedel & bigård (8%)
    // Sum = ~95 kr (100%)
    const demoShares: Record<string, { pct: number; perJar: number }> = {
      jars_packaging: { pct: 14, perJar: 1300 },
      feed_wintering: { pct: 12, perJar: 1100 },
      wax_frames: { pct: 15, perJar: 1400 },
      health_varroa: { pct: 8, perJar: 800 },
      queen_breeding: { pct: 10, perJar: 900 },
      hive_hardware: { pct: 14, perJar: 1300 },
      extraction_tools: { pct: 11, perJar: 1000 },
      clothing_safety: { pct: 5, perJar: 500 },
      association_license: { pct: 6, perJar: 600 },
      transport_yard: { pct: 5, perJar: 600 },
    };

    categories = HONEY_COST_CATEGORIES.map((cat) => {
      const demo = demoShares[cat.id] || { pct: 5, perJar: 500 };
      return {
        id: cat.id,
        name: cat.name,
        iconName: cat.iconName,
        color: cat.color,
        darkColor: cat.darkColor,
        description: cat.description,
        totalExpenseOre: demo.perJar * effectiveJars,
        percentage: demo.pct,
        costPerJarOre: demo.perJar,
        itemCount: 0,
        sampleItems: ["Uppskattat branschsnitt för svensk hobbybiodling"],
      };
    });
  } else {
    // Real expenses recorded in the app
    const activeRules = [...HONEY_COST_CATEGORIES];

    categories = activeRules
      .map((cat) => {
        const data = expenseByCategory[cat.id] || { totalOre: 0, count: 0, samples: [] };
        const pct = totalExpenseOre > 0 ? (data.totalOre / totalExpenseOre) * 100 : 0;
        const perJarOre = Math.round(data.totalOre / effectiveJars);

        return {
          id: cat.id,
          name: cat.name,
          iconName: cat.iconName,
          color: cat.color,
          darkColor: cat.darkColor,
          description: cat.description,
          totalExpenseOre: data.totalOre,
          percentage: Math.round(pct * 10) / 10,
          costPerJarOre: perJarOre,
          itemCount: data.count,
          sampleItems: data.samples,
        };
      })
      .filter((c) => c.totalExpenseOre > 0);

    const otherData = expenseByCategory["other"];
    if (otherData && otherData.totalOre > 0) {
      const pct = (otherData.totalOre / totalExpenseOre) * 100;
      unallocatedExpenseOre = otherData.totalOre;
      categories.push({
        id: "other",
        name: "Övriga biodlingskostnader",
        iconName: "HelpCircle",
        color: "#6b7280",
        darkColor: "#9ca3af",
        description: "Blandade utlägg och kvitton som ännu inte matchats till specifik kategori.",
        totalExpenseOre: otherData.totalOre,
        percentage: Math.round(pct * 10) / 10,
        costPerJarOre: Math.round(otherData.totalOre / effectiveJars),
        itemCount: otherData.count,
        sampleItems: otherData.samples,
      });
    }

    // Sort categories with highest cost first
    categories.sort((a, b) => b.totalExpenseOre - a.totalExpenseOre);
  }

  // Cost per jar & profit margin
  const costPerJarOre =
    totalExpenseOre > 0
      ? Math.round(totalExpenseOre / effectiveJars)
      : categories.reduce((sum, c) => sum + c.costPerJarOre, 0);

  const profitPerJarOre = Math.max(0, averageSalePriceOre - costPerJarOre);
  const profitMarginPercent =
    averageSalePriceOre > 0
      ? Math.round(((averageSalePriceOre - costPerJarOre) / averageSalePriceOre) * 100)
      : 0;

  return {
    totalExpenseOre,
    totalIncomeOre,
    totalSoldJars: detectedSaleCount,
    totalHarvestedJarsEstimate: effectiveJars,
    standardJarPriceOre: averageSalePriceOre,
    costPerJarOre,
    profitPerJarOre,
    profitMarginPercent,
    categories,
    unallocatedExpenseOre,
  };
}
