import { Hive, HiveEvent, Task, Harvest } from "../domain/types";
import { parseSwedishDate } from "../domain/validation";

export interface ParsedNotesResult {
  detectedHives: Array<{ name: string; isNew: boolean }>;
  tasks: Array<Omit<Task, "id" | "createdAt" | "updatedAt"> & { rawSource: string }>;
  events: Array<
    Omit<HiveEvent, "id" | "createdAt" | "updatedAt"> & { rawSource: string; hiveName: string }
  >;
  harvests: Array<
    Omit<Harvest, "id" | "createdAt" | "updatedAt"> & { rawSource: string; hiveName?: string }
  >;
  unclassifiedEntries: Array<{ section: string; rawText: string; reason: string }>;
}

const NON_HIVE_KEYWORDS = [
  "köpa",
  "inköp",
  "skörd",
  "honung",
  "slungning",
  "nästa gång",
  "att göra",
  "allmänt",
  "loggbok",
  "noteringar",
  "övrigt",
  "material",
  "utrustning",
  "vax",
  "ramar",
  "foder",
  "behandling",
  "varroa",
  "ekonomi",
  "kostnader",
  "status",
  "att köpa",
  "sammanfattning",
];

const FORBIDDEN_AVLAGGARE_FOLLOWERS = new Set([
  "gjord",
  "skapad",
  "från",
  "med",
  "tillsatt",
  "såld",
  "död",
  "kollad",
  "flyttad",
  "på",
  "utan",
  "till",
  "och",
  "i",
  "bildad",
  "startad",
]);

/**
 * Standardizes hive name casing, e.g. "kupa a" -> "Kupa A", "avläggare 2026" -> "Avläggare 2026"
 */
export function normalizeHiveName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return cleaned
    .split(" ")
    .map((word) => {
      if (word.length === 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Validates whether a text string represents a legitimate hive name.
 */
export function isHiveName(name: string, existingHives: Hive[] = []): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  // Reject generic or non-hive section keywords
  if (
    NON_HIVE_KEYWORDS.some(
      (kw) => lower === kw || lower.startsWith(kw + " ") || lower.startsWith(kw + ":"),
    )
  ) {
    return false;
  }

  // Check if matches an already registered user hive
  if (existingHives.some((h) => h.name.toLowerCase().trim() === lower)) {
    return true;
  }

  // Matches "Kupa A", "Kupa 1", "Kupa Röd", "Samhälle 1", "Samhälle A", etc.
  if (/^kupa[ \t]+[a-zåäö0-9-]+$/i.test(trimmed) || /^samhälle[ \t]+[0-9a-z]$/i.test(trimmed)) {
    return true;
  }

  // Matches "Avläggare", "Avläggare 2026", "Avläggare 1", "Avläggare A"
  // Must NOT be descriptive sentences like "Avläggare gjord..."
  const avlMatch = trimmed.match(/^avläggare(?:[ \t]+([a-zåäö0-9-]+))?$/i);
  if (avlMatch) {
    const secondWord = avlMatch[1]?.toLowerCase();
    if (secondWord && FORBIDDEN_AVLAGGARE_FOLLOWERS.has(secondWord)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Parse historical notes in text or markdown format
 */
export function parseHistoricalNotes(
  content: string,
  existingHives: Hive[] = [],
): ParsedNotesResult {
  const lines = content.split(/\r?\n/);

  const existingHiveNames = new Set(existingHives.map((h) => h.name.toLowerCase().trim()));
  const discoveredHiveNames = new Set<string>();

  // Pre-scan entire document for explicit hive mentions (e.g. "Kupa A", "Kupa B", "Kupa C", "Avläggare 2026")
  // Use [ \t]+ so we never span across newlines!
  const hiveMentions =
    content.match(/\bkupa[ \t]+[a-zåäö0-9-]+\b|\bsamhälle[ \t]+[0-9a-z]\b|\bavläggare[ \t]+\d{4}\b/gi) || [];
  for (const mention of hiveMentions) {
    if (isHiveName(mention, existingHives)) {
      discoveredHiveNames.add(normalizeHiveName(mention));
    }
  }

  const tasks: ParsedNotesResult["tasks"] = [];
  const events: ParsedNotesResult["events"] = [];
  const harvests: ParsedNotesResult["harvests"] = [];
  const unclassifiedEntries: ParsedNotesResult["unclassifiedEntries"] = [];

  let currentSection = "Allmänt";
  let activeHiveName: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Detect markdown headers (# Huvudrubrik), bracket sections ([Kupa A]), colons (Kupa A:),
    // OR standalone hive name lines (e.g. "Kupa A", "Kupa B", "Avläggare 2026")
    const headerMatch =
      trimmed.match(/^#{1,4}\s+(.+)$/) ||
      trimmed.match(/^\[(.+)\]$/) ||
      trimmed.match(/^([A-ZÅÄÖa-zåäö0-9\s-]+):$/);

    let candidateHeader: string | null = headerMatch ? headerMatch[1].trim() : null;
    if (!candidateHeader && isHiveName(trimmed, existingHives)) {
      candidateHeader = trimmed;
    }

    if (candidateHeader) {
      currentSection = candidateHeader;
      if (isHiveName(currentSection, existingHives)) {
        const norm = normalizeHiveName(currentSection);
        activeHiveName = norm;
        discoveredHiveNames.add(norm);
      } else {
        if (/^#{1,4}\s+/.test(rawLine)) {
          activeHiveName = null;
        }
      }
      continue;
    }

    const sectionLower = currentSection.toLowerCase();

    // 1. Köpa (Shopping list)
    if (sectionLower.includes("köpa") || sectionLower.includes("inköp")) {
      const taskTitle = trimmed.replace(/^[-*•\d.)\]\s]+/, "").trim();
      if (taskTitle) {
        tasks.push({
          title: taskTitle,
          notes: `Importerad från anteckningar (Sektion: ${currentSection})`,
          status: "open",
          rawSource: trimmed,
        });
      }
      continue;
    }

    // 2. Nästa gång (Next planned action)
    if (sectionLower.includes("nästa gång") || sectionLower.includes("att göra")) {
      const taskTitle = trimmed.replace(/^[-*•\d.)\]\s]+/, "").trim();
      if (taskTitle) {
        tasks.push({
          title: taskTitle,
          notes: `Planerad åtgärd från anteckningar (${currentSection})`,
          status: "open",
          rawSource: trimmed,
        });
      }
      continue;
    }

    // 3. Skörd (Harvest records)
    if (
      sectionLower.includes("skörd") ||
      sectionLower.includes("honung") ||
      sectionLower.includes("slungning")
    ) {
      const jarMatch = trimmed.match(/(\d+)\s*(?:st|burkar)?\s*(\d+)\s*g/i);
      const kgMatch = trimmed.match(/(\d+(?:[,.]\d+)?)\s*kg/i);
      const waterMatch = trimmed.match(/(\d+(?:[,.]\d+)?)\s*%\s*(?:vatten|fukt)?/i);
      const dateMatch = trimmed.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/);

      let harvestHiveName: string | undefined =
        activeHiveName ||
        (isHiveName(currentSection, existingHives) ? normalizeHiveName(currentSection) : undefined);

      const harvestPrefixMatch =
        trimmed.match(
          /^[-*•\s]*((?:kupa|samhälle)\s+[a-zåäö0-9-]+|avläggare(?:\s+(?:\d{4}|[a-zåäö0-9]+))?)\s*[:\-.,]?\s*(.*)$/i,
        ) ||
        trimmed.match(
          /^[-*•\s]*\[((?:kupa|samhälle)\s+[a-zåäö0-9-]+|avläggare(?:\s+(?:\d{4}|[a-zåäö0-9]+))?)\]\s*(.*)$/i,
        );

      if (harvestPrefixMatch && isHiveName(harvestPrefixMatch[1].trim(), existingHives)) {
        harvestHiveName = normalizeHiveName(harvestPrefixMatch[1].trim());
        discoveredHiveNames.add(harvestHiveName);
      }

      const parsedDate = dateMatch
        ? parseSwedishDate(dateMatch[1])
        : new Date().toISOString().substring(0, 10);
      let weightGrams: number | undefined;
      let jarCount: number | undefined;
      let jarSize: number | undefined;
      let waterPercent: number | undefined;

      if (jarMatch) {
        jarCount = parseInt(jarMatch[1], 10);
        jarSize = parseInt(jarMatch[2], 10);
        weightGrams = jarCount * jarSize;
      } else if (kgMatch) {
        const kgVal = parseFloat(kgMatch[1].replace(",", "."));
        weightGrams = Math.round(kgVal * 1000);
      }

      if (waterMatch) {
        waterPercent = parseFloat(waterMatch[1].replace(",", "."));
      }

      harvests.push({
        batchName: `${parsedDate ? parsedDate.substring(0, 4) : "2026"} Skörd`,
        date: parsedDate || new Date().toISOString().substring(0, 10),
        honeyWeightGrams: weightGrams,
        waterContentPercent: waterPercent,
        jarCount,
        jarSizeGrams: jarSize || (jarCount ? 500 : undefined),
        notes: `Ursprungstext: "${trimmed}" (Sektion: ${currentSection})`,
        rawSource: trimmed,
        hiveName: harvestHiveName,
      });
      continue;
    }

    // 4. Loggbok or Hive-specific log entries
    const lineDateMatch =
      trimmed.match(
        /^[-*•\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})[:\s-]*(.*)$/,
      ) || trimmed.match(/^[-*•\s]*(\d{1,2}[-/.]\d{1,2})[:\s-]*(.*)$/);

    if (lineDateMatch) {
      let rawDateStr = lineDateMatch[1];
      // If DD/MM without year, append current year
      if (/^\d{1,2}[-/.]\d{1,2}$/.test(rawDateStr)) {
        const curYear = new Date().getFullYear();
        const parts = rawDateStr.split(/[-/.]/);
        rawDateStr = `${curYear}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }

      const parsedDate = parseSwedishDate(rawDateStr);
      let rest = lineDateMatch[2].trim();

      let eventHiveName = activeHiveName;

      // Match explicit inline hive prefix (e.g. "Kupa A: ...", "Kupa A - ...", "Kupa A, ...", "[Kupa A] ...")
      const hivePrefixMatch =
        rest.match(
          /^((?:kupa|samhälle)\s+[a-zåäö0-9-]+|avläggare(?:\s+(?:\d{4}|[a-zåäö0-9]+))?)\s*[:\-.,]?\s*(.*)$/i,
        ) ||
        rest.match(
          /^\[((?:kupa|samhälle)\s+[a-zåäö0-9-]+|avläggare(?:\s+(?:\d{4}|[a-zåäö0-9]+))?)\]\s*(.*)$/i,
        );

      if (hivePrefixMatch && isHiveName(hivePrefixMatch[1].trim(), existingHives)) {
        eventHiveName = normalizeHiveName(hivePrefixMatch[1].trim());
        discoveredHiveNames.add(eventHiveName);
        rest = hivePrefixMatch[2].trim();
      } else if (!eventHiveName && isHiveName(currentSection, existingHives)) {
        eventHiveName = normalizeHiveName(currentSection);
        discoveredHiveNames.add(eventHiveName);
      }

      // If no hive prefix on the line and no active hive, check if the text mentions an already discovered hive
      if (!eventHiveName) {
        for (const known of discoveredHiveNames) {
          const re = new RegExp(`\\b${known}\\b`, "i");
          if (re.test(rest)) {
            eventHiveName = known;
            break;
          }
        }
        if (!eventHiveName) {
          for (const eh of existingHives) {
            const re = new RegExp(`\\b${eh.name}\\b`, "i");
            if (re.test(rest)) {
              eventHiveName = eh.name;
              discoveredHiveNames.add(eventHiveName);
              break;
            }
          }
        }
      }

      // Detect event type
      let type: HiveEvent["type"] = "inspection";
      const textLower = rest.toLowerCase();
      if (
        textLower.includes("matning") ||
        textLower.includes("socker") ||
        textLower.includes("foder")
      ) {
        type = "feeding";
      } else if (
        textLower.includes("myrsyra") ||
        textLower.includes("oxalsyra") ||
        textLower.includes("varroa") ||
        textLower.includes("behandling")
      ) {
        type = "treatment";
      } else if (textLower.includes("skörd") || textLower.includes("slungning")) {
        type = "harvest";
      } else if (
        textLower.includes("låda") ||
        textLower.includes("skattlåda") ||
        textLower.includes("spärrgaller")
      ) {
        type = "equipment";
      } else if (
        textLower.includes("avläggare") ||
        textLower.includes("svärm") ||
        textLower.includes("drottningbyte")
      ) {
        type = "colony_change";
      }

      events.push({
        hiveId: "",
        date: parsedDate || new Date().toISOString().substring(0, 10),
        type,
        title: rest.substring(0, 60) || "Loggboksanteckning",
        notes: `Ursprungsdatum: ${rawDateStr}\nAnteckning: ${rest}\nSektion: ${currentSection}`,
        rawSource: trimmed,
        hiveName: eventHiveName || "",
      });
    } else {
      unclassifiedEntries.push({
        section: currentSection,
        rawText: trimmed,
        reason: "Inget datum identifierades i radens början",
      });
    }
  }

  // Consolidation: If we discovered "Avläggare 2026" and also a standalone "Avläggare", merge "Avläggare" into "Avläggare 2026"
  if (discoveredHiveNames.has("Avläggare 2026") && discoveredHiveNames.has("Avläggare")) {
    discoveredHiveNames.delete("Avläggare");
    for (const ev of events) {
      if (ev.hiveName === "Avläggare") {
        ev.hiveName = "Avläggare 2026";
      }
    }
    for (const h of harvests) {
      if (h.hiveName === "Avläggare") {
        h.hiveName = "Avläggare 2026";
      }
    }
  }

  // If NO hives were detected in the entire document, default to first existing hive or "Kupa A"
  if (discoveredHiveNames.size === 0) {
    if (existingHives.length > 0) {
      discoveredHiveNames.add(existingHives[0].name);
    } else {
      discoveredHiveNames.add("Kupa A");
    }
  }

  // Assign any events/harvests without explicit hive to the first discovered hive
  const defaultHive = Array.from(discoveredHiveNames)[0];
  for (const ev of events) {
    if (!ev.hiveName) {
      ev.hiveName = defaultHive;
    }
  }
  for (const h of harvests) {
    if (!h.hiveName) {
      h.hiveName = defaultHive;
    }
  }

  const detectedHives = Array.from(discoveredHiveNames).map((name) => ({
    name,
    isNew: !existingHiveNames.has(name.toLowerCase().trim()),
  }));

  return {
    detectedHives,
    tasks,
    events,
    harvests,
    unclassifiedEntries,
  };
}
