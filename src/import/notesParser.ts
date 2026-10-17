import { Hive, HiveEvent, Task, Harvest } from "../domain/types";
import { generateUUID, parseSwedishDate } from "../domain/validation";

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

function isHiveName(name: string, existingHives: Hive[] = []): boolean {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  const nonHiveSections = [
    "köpa",
    "inköp",
    "skörd",
    "honung",
    "nästa gång",
    "att göra",
    "allmänt",
    "loggbok",
  ];
  if (nonHiveSections.includes(lower)) {
    return false;
  }

  if (/^(?:kupa|samhälle)\s+[a-zåäö0-9-]+$/i.test(trimmed)) {
    return true;
  }
  if (/^avläggare/i.test(trimmed)) {
    return true;
  }
  if (existingHives.some((h) => h.name.toLowerCase().trim() === lower)) {
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

    // Detect markdown headers, section markers
    const headerMatch =
      trimmed.match(/^#{1,4}\s+(.+)$/) ||
      trimmed.match(/^\[(.+)\]$/) ||
      trimmed.match(/^([A-ZÅÄÖa-zåäö0-9\s-]+):$/);

    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      if (isHiveName(currentSection, existingHives)) {
        activeHiveName = currentSection;
        discoveredHiveNames.add(currentSection);
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
    if (sectionLower.includes("skörd") || sectionLower.includes("honung")) {
      const jarMatch = trimmed.match(/(\d+)\s*(?:st|burkar)?\s*(\d+)\s*g/i);
      const kgMatch = trimmed.match(/(\d+(?:[,.]\d+)?)\s*kg/i);
      const dateMatch = trimmed.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/);

      let harvestHiveName: string | undefined =
        activeHiveName ||
        (isHiveName(currentSection, existingHives) ? currentSection : undefined);
      const harvestPrefixMatch = trimmed.match(
        /^[-*•\s]*((?:kupa|samhälle)\s*[\wåäö0-9-]+|avläggare.*)[:\-]?\s*(.*)$/i,
      );
      if (harvestPrefixMatch && isHiveName(harvestPrefixMatch[1].trim(), existingHives)) {
        harvestHiveName = harvestPrefixMatch[1].trim();
        discoveredHiveNames.add(harvestHiveName);
      }

      const parsedDate = dateMatch
        ? parseSwedishDate(dateMatch[1])
        : new Date().toISOString().substring(0, 10);
      let weightGrams: number | undefined;
      let jarCount: number | undefined;
      let jarSize: number | undefined;

      if (jarMatch) {
        jarCount = parseInt(jarMatch[1], 10);
        jarSize = parseInt(jarMatch[2], 10);
        weightGrams = jarCount * jarSize;
      } else if (kgMatch) {
        const kgVal = parseFloat(kgMatch[1].replace(",", "."));
        weightGrams = Math.round(kgVal * 1000);
      }

      harvests.push({
        date: parsedDate || new Date().toISOString().substring(0, 10),
        honeyWeightGrams: weightGrams,
        jarCount,
        jarSizeGrams: jarSize || (jarCount ? 500 : undefined),
        notes: `Ursprungstext: "${trimmed}" (Sektion: ${currentSection})`,
        rawSource: trimmed,
        hiveName: harvestHiveName,
      });
      continue;
    }

    // 4. Loggbok or Hive-specific log entries
    const lineDateMatch = trimmed.match(
      /^[-*•\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})[:\s]*(.*)$/,
    );

    if (lineDateMatch) {
      const rawDateStr = lineDateMatch[1];
      const parsedDate = parseSwedishDate(rawDateStr);
      let rest = lineDateMatch[2].trim();

      let eventHiveName = activeHiveName;
      const hivePrefixMatch = rest.match(
        /^((?:kupa|samhälle)\s*[\wåäö0-9-]+|avläggare.*)[:\-]?\s*(.*)$/i,
      );
      if (hivePrefixMatch && isHiveName(hivePrefixMatch[1].trim(), existingHives)) {
        eventHiveName = hivePrefixMatch[1].trim();
        discoveredHiveNames.add(eventHiveName);
        rest = hivePrefixMatch[2].trim();
      } else if (!eventHiveName && isHiveName(currentSection, existingHives)) {
        eventHiveName = currentSection;
      }

      const finalHiveName = eventHiveName || "Kupa A";
      discoveredHiveNames.add(finalHiveName);

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
        hiveName: finalHiveName,
      });
    } else {
      unclassifiedEntries.push({
        section: currentSection,
        rawText: trimmed,
        reason: "Inget datum identifierades i radens början",
      });
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
