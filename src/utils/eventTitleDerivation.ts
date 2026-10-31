import { EventType } from "../domain/types";

export const DEFAULT_EVENT_LABELS: Record<EventType, string> = {
  inspection: "Kupbesiktning & tillsyn",
  feeding: "Fodring & foderkontroll",
  treatment: "Varroabehandling",
  equipment_change: "Utrustningsbyte / skattlådor",
  queen_activity: "Drottningtillsyn & yngelkontroll",
  harvest: "Skördeuttag",
  other: "Skötsel & tillsyn",
};

/**
 * Derives a clean, short summary title from single-field event notes.
 */
export function deriveEventTitle(notesText: string, eventType: EventType): string {
  const cleanText = notesText.trim();
  if (!cleanText) return DEFAULT_EVENT_LABELS[eventType] || "Kupbesök";

  const firstLine = cleanText.split(/[\r\n]+/)[0]?.trim() || "";
  if (firstLine.length <= 70) {
    return firstLine;
  }

  const periodIdx = firstLine.search(/[.!?]/);
  if (periodIdx > 10 && periodIdx <= 70) {
    return firstLine.slice(0, periodIdx).trim();
  }

  return firstLine.slice(0, 67).trim() + "...";
}
