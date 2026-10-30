/**
 * Merges legacy title and notes fields into a single, rich descriptive text.
 * Avoids duplication if notes already contains title or vice-versa.
 */
export function mergeEventDescription(title?: string, notes?: string): string {
  const cleanTitle = (title || "").trim();
  const cleanNotes = (notes || "").trim();

  if (!cleanTitle && !cleanNotes) return "";
  if (!cleanTitle) return cleanNotes;
  if (!cleanNotes) return cleanTitle;

  // If identical, return clean notes
  if (cleanNotes.toLowerCase() === cleanTitle.toLowerCase()) {
    return cleanNotes;
  }

  // If notes already contains or starts with title, return notes
  if (cleanNotes.toLowerCase().includes(cleanTitle.toLowerCase())) {
    return cleanNotes;
  }

  // If title already contains notes, return title
  if (cleanTitle.toLowerCase().includes(cleanNotes.toLowerCase())) {
    return cleanTitle;
  }

  // Check if title ends with punctuation
  const endsWithPunct = /[.!?]$/.test(cleanTitle);
  return `${cleanTitle}${endsWithPunct ? " " : ". "}${cleanNotes}`;
}
