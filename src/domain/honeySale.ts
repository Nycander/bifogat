export interface FormatHoneySaleDescriptionParams {
  jarCount: number;
  jarSizeGrams: number;
  paymentMethod?: string;
  counterparty?: string;
}

/**
 * Standardized pure description builder for honey sales in Bifogat.
 * Used by both HoneySaleModal and the Swish inbox.
 */
export function formatHoneySaleDescription({
  jarCount,
  jarSizeGrams,
  paymentMethod = "Swish",
  counterparty,
}: FormatHoneySaleDescriptionParams): string {
  const cleanName = counterparty?.trim();
  let desc = `Honungsförsäljning: ${jarCount} st burkar (${jarSizeGrams}g) [${paymentMethod}]`;
  if (cleanName) {
    desc += ` till ${cleanName}`;
  }
  return desc;
}
