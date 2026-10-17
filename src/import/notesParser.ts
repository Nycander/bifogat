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

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Detect markdown headers or section markers (# Köpa, ## Skörd, [Kupa A], Kupa A:)
    const headerMatch =
      trimmed.match(/^#{1,4}\s+(.+)$/) ||
      trimmed.match(/^\[(.+)\]$/) ||
      trimmed.match(/^([A-ZÅÄÖa-zåäö0-9\s]+):$/);

    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      // Check if section name is a hive (e.g. "Kupa A", "Kupa B", "Avläggare 2026")
      if (/^kupa\s+[A-Za-z0-9]|avläggare/i.test(currentSection)) {
        discoveredHiveNames.add(currentSection);
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
      // Look for jar counts like "45 st 500 g", "30 kg", "60%"
      const jarMatch = trimmed.match(/(\d+)\s*(?:st|burkar)?\s*(\d+)\s*g/i);
      const kgMatch = trimmed.match(/(\d+(?:[,.]\d+)?)\s*kg/i);
      const dateMatch = trimmed.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/);

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
        hiveName: currentSection.includes("Kupa") ? currentSection : undefined,
      });
      continue;
    }

    // 4. Loggbok or Hive-specific log entries (e.g. Kupa A, Kupa B, Avläggare 2026)
    // Check if line starts with a date, e.g. "2026-05-15: Kollade yngel, drottning sedd"
    const lineDateMatch = trimmed.match(
      /^[-*•\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})[:\s]*(.*)$/,
    );

    if (lineDateMatch) {
      const rawDateStr = lineDateMatch[1];
      const parsedDate = parseSwedishDate(rawDateStr);
      const rest = lineDateMatch[2].trim();

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

      const hiveName = /^kupa\s+[A-Za-z0-9]|avläggare/i.test(currentSection)
        ? currentSection
        : "Kupa A";
      discoveredHiveNames.add(hiveName);

      events.push({
        hiveId: "", // will be mapped to hive ID
        date: parsedDate || new Date().toISOString().substring(0, 10),
        type,
        title: rest.substring(0, 60) || "Loggboksanteckning",
        notes: `Ursprungsdatum: ${rawDateStr}\nAnteckning: ${rest}\nSektion: ${currentSection}`,
        rawSource: trimmed,
        hiveName,
      });
    } else {
      // Entry without explicit recognized date
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
