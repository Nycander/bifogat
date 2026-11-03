import { Transaction } from "./types";

export interface CostCategoryDetail {
  id: string;
  name: string;
  iconName: string; // Lucide icon identifier
  color: string; // Honey shade (hex)
  darkColor: string;
  honeyShadeName: string;
  description: string;
  totalExpenseOre: number;
  percentage: number; // 0 - 100 (% of total expenses)
  costPerJarOre: number; // Kronor/öre per jar at the selected reference price
  itemCount: number;
  sampleItems: string[];
}

export interface HoneyCostBreakdownResult {
  totalExpenseOre: number;
  totalIncomeOre: number;
  totalSoldJars: number;
  standardJarPriceOre: number;
  categories: CostCategoryDetail[];
  unallocatedExpenseOre: number;
}

export interface CategorizationRule {
  id: string;
  name: string;
  iconName: string;
  color: string;
  darkColor: string;
  honeyShadeName: string;
  description: string;
  keywords: string[];
}

/**
 * Standard Swedish Beekeeping Transaction Categories.
 * Can be selected directly in the UI or typed in Google Sheets / Excel.
 */
export const BEEKEEPING_CATEGORIES = [
  "Honungsförsäljning",
  "Burkar, lock & etiketter",
  "Vinterfoder & socker",
  "Vaxmellanväggar & ramar",
  "Kupor, bottnar & tak",
  "Slungning & redskap",
  "Varroabehandling & hälsa",
  "Drottningar & bisamhällen",
  "Skyddskläder & handskar",
  "Föreningsavgift & försäkring",
  "Bigård & drivmedel",
  "Övrigt",
] as const;

export type BeekeepingCategory = (typeof BEEKEEPING_CATEGORIES)[number];

/**
 * Pedagogical Cost Categories with natural Swedish honey shades:
 * From dark forest/heather honeys at the base, through rich golden summer honey,
 * to light linden, clover, and pale spring rapeseed honey.
 */
export const HONEY_COST_CATEGORIES: CategorizationRule[] = [
  {
    id: "jars_packaging",
    name: "Burkar, lock & etiketter",
    iconName: "Package",
    color: "#b45309", // Warm amber honey
    darkColor: "#d97706",
    honeyShadeName: "Bärnstenshonung",
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
    color: "#d97706", // Golden summer honey
    darkColor: "#f59e0b",
    honeyShadeName: "Sensommarhonung",
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
    color: "#92400e", // Rich chestnut/buckwheat honey
    darkColor: "#b45309",
    honeyShadeName: "Bokhvetehonung",
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
    color: "#78350f", // Deep heather / forest honey
    darkColor: "#92400e",
    honeyShadeName: "Ljunghonung",
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
    name: "Drottningar & bisamhällen",
    iconName: "Crown",
    color: "#f59e0b", // Bright warm blossom honey
    darkColor: "#fbbf24",
    honeyShadeName: "Blomsterhonung",
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
    color: "#854d0e", // Deep oak honey
    darkColor: "#a16207",
    honeyShadeName: "Skogshonung",
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
    color: "#eab308", // Golden yellow clover honey
    darkColor: "#facc15",
    honeyShadeName: "Klöverhonung",
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
    color: "#ca8a04", // Warm goldenrod honey
    darkColor: "#eab308",
    honeyShadeName: "Gullrishonung",
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
    color: "#a16207", // Deep wild meadow honey
    darkColor: "#ca8a04",
    honeyShadeName: "Ängshonung",
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
    name: "Bigård & drivmedel",
    iconName: "Truck",
    color: "#713f12", // Dark molasses honey
    darkColor: "#854d0e",
    honeyShadeName: "Bladhonung",
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
 * Categorize a transaction.
 *
 * Evaluation priority:
 * 1. Explicit `category` match (whether set in app or in Google Sheets / Excel).
 * 2. Keyword scan across description & counterparty.
 * 3. Smart fallbacks.
 */
export function classifyExpense(tx: Transaction): string {
  const catField = (tx.category || "").trim().toLowerCase();

  // 1. Direct or partial match on category field
  if (catField) {
    const matchedRule = HONEY_COST_CATEGORIES.find(
      (c) => c.id.toLowerCase() === catField || c.name.toLowerCase() === catField
    );
    if (matchedRule) return matchedRule.id;

    if (catField.includes("burk") || catField.includes("etikett") || catField.includes("förpackning") || catField.includes("emballage")) {
      return "jars_packaging";
    }
    if (catField.includes("foder") || catField.includes("socker") || catField.includes("invintring")) {
      return "feed_wintering";
    }
    if (catField.includes("vax") || catField.includes("ram")) {
      return "wax_frames";
    }
    if (catField.includes("hälsa") || catField.includes("behandling") || catField.includes("varroa") || catField.includes("syra")) {
      return "health_varroa";
    }
    if (catField.includes("drottning") || catField.includes("samhälle") || catField.includes("avläggare")) {
      return "queen_breeding";
    }
    if (catField.includes("kupa") || catField.includes("kupor") || catField.includes("botten") || catField.includes("tak") || catField.includes("sarg")) {
      return "hive_hardware";
    }
    if (catField.includes("slung") || catField.includes("redskap") || catField.includes("sil") || catField.includes("pust")) {
      return "extraction_tools";
    }
    if (catField.includes("kläder") || catField.includes("skydd") || catField.includes("handske")) {
      return "clothing_safety";
    }
    if (catField.includes("förening") || catField.includes("sbr") || catField.includes("försäkring")) {
      return "association_license";
    }
    if (catField.includes("bigård") || catField.includes("drivmedel") || catField.includes("transport")) {
      return "transport_yard";
    }
    if (catField === "övrigt" || catField === "other") {
      return "other";
    }
  }

  // 2. Keyword matching across description & counterparty
  const text = `${tx.description || ""} ${tx.counterparty || ""}`.toLowerCase();

  for (const cat of HONEY_COST_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (text.includes(kw)) {
        return cat.id;
      }
    }
  }

  return "other";
}

/**
 * Pure 100% cost-share breakdown.
 *
 * The honey jar represents 100% of all costs/investments (no artificial net profit).
 * Every krona in the jar price is mapped directly to the actual categories' share of total expenses:
 *   costPerJarOre = Math.round((categoryExpense / totalExpense) * jarPriceOre)
 *
 * @param transactions All recorded transactions (including equipment, hives, feed, jars etc.)
 * @param jarPriceOre The customer retail price per jar (e.g. 95 kr = 9500 öre)
 */
export function calculateHoneyCostBreakdown(
  transactions: Transaction[],
  jarPriceOre = 9500,
): HoneyCostBreakdownResult {
  let totalExpenseOre = 0;
  let totalIncomeOre = 0;
  let detectedSaleCount = 0;

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

      const desc = tx.description || "";
      const match = desc.match(/(\d+)\s*(?:st|burkar?)/i);
      if (match && match[1]) {
        const jars = parseInt(match[1], 10);
        if (!isNaN(jars) && jars > 0 && jars < 1000) {
          detectedSaleCount += jars;
        }
      } else if (tx.category === "Honungsförsäljning") {
        const estimatedJars = Math.max(1, Math.round(amount / 9500));
        detectedSaleCount += estimatedJars;
      }
    }
  }

  let categories: CostCategoryDetail[] = [];
  let unallocatedExpenseOre = 0;

  if (totalExpenseOre === 0) {
    // Pedagogical demo proportions based on Sveriges Biodlares Riksförbund cost structure
    // Sum = 100%
    const demoPercentages: Record<string, number> = {
      wax_frames: 18,
      hive_hardware: 16,
      jars_packaging: 15,
      feed_wintering: 13,
      extraction_tools: 11,
      queen_breeding: 9,
      health_varroa: 7,
      association_license: 4,
      clothing_safety: 4,
      transport_yard: 3,
    };

    categories = HONEY_COST_CATEGORIES.map((cat) => {
      const pct = demoPercentages[cat.id] || 5;
      const perJarOre = Math.round((pct / 100) * jarPriceOre);
      return {
        id: cat.id,
        name: cat.name,
        iconName: cat.iconName,
        color: cat.color,
        darkColor: cat.darkColor,
        honeyShadeName: cat.honeyShadeName,
        description: cat.description,
        totalExpenseOre: 0,
        percentage: pct,
        costPerJarOre: perJarOre,
        itemCount: 0,
        sampleItems: ["Uppskattat branschsnitt för svensk hobbybiodling"],
      };
    });

    // Sort descending by size
    categories.sort((a, b) => b.percentage - a.percentage);
  } else {
    // Pure cost breakdown from real transactions:
    // Every category's slice of the jar is exactly proportional to its share of your total expenses
    const activeRules = [...HONEY_COST_CATEGORIES];

    categories = activeRules
      .map((cat) => {
        const data = expenseByCategory[cat.id] || { totalOre: 0, count: 0, samples: [] };
        const pct = (data.totalOre / totalExpenseOre) * 100;
        const perJarOre = Math.round((data.totalOre / totalExpenseOre) * jarPriceOre);

        return {
          id: cat.id,
          name: cat.name,
          iconName: cat.iconName,
          color: cat.color,
          darkColor: cat.darkColor,
          honeyShadeName: cat.honeyShadeName,
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
      const perJarOre = Math.round((otherData.totalOre / totalExpenseOre) * jarPriceOre);
      unallocatedExpenseOre = otherData.totalOre;
      categories.push({
        id: "other",
        name: "Övriga biodlingskostnader",
        iconName: "HelpCircle",
        color: "#5c330a", // Deep amber shade
        darkColor: "#78350f",
        honeyShadeName: "Blandad honung",
        description: "Blandade utlägg och kvitton som ännu inte matchats till specifik kategori.",
        totalExpenseOre: otherData.totalOre,
        percentage: Math.round(pct * 10) / 10,
        costPerJarOre: perJarOre,
        itemCount: otherData.count,
        sampleItems: otherData.samples,
      });
    }

    // Sort categories strictly descending by cost size
    categories.sort((a, b) => b.totalExpenseOre - a.totalExpenseOre);
  }

  return {
    totalExpenseOre,
    totalIncomeOre,
    totalSoldJars: detectedSaleCount,
    standardJarPriceOre: jarPriceOre,
    categories,
    unallocatedExpenseOre,
  };
}
