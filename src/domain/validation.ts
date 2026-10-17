import { Hive, HiveEvent, Task, Harvest, Transaction } from './types';

/**
 * Generate a v4 UUID using crypto.randomUUID or browser/node crypto
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Check if a string is a valid UUID format
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(id);
}

/**
 * Parse Swedish currency string or number to integer öre.
 * Handles:
 * - Unicode minus (U+2212, U+2013, U+2014)
 * - Space/NBSP as thousands separator: "1 250,50", "1 250,50 kr", "1250,50"
 * - Decimal comma: "50,25" -> 5025 öre
 * - Negative amounts: "-150,00", "− 150,00 kr"
 * - Plain integers: "500" -> 50000 öre
 */
export function parseSwedishCurrencyToOre(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    return Math.round(val * 100);
  }

  const str = String(val).trim();
  if (!str) return null;

  // Clean currency symbols, trailing text, non-breaking spaces
  // Unicode minuses: \u2212 (MINUS SIGN), \u2013 (EN DASH), \u2014 (EM DASH)
  let normalized = str
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F\s]/g, '') // remove all whitespace
    .replace(/(?:kr|sek|:-)$/i, '')
    .trim();

  if (!normalized) return null;

  // Detect sign
  let isNegative = false;
  if (normalized.startsWith('-')) {
    isNegative = true;
    normalized = normalized.substring(1);
  } else if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }

  // Split integer and decimal parts by comma or dot
  const parts = normalized.split(/[,.]/);
  if (parts.length > 2) {
    // Malformed number with multiple commas/dots
    return null;
  }

  const intPartStr = parts[0];
  if (!/^\d*$/.test(intPartStr)) {
    return null;
  }
  const intPart = intPartStr ? parseInt(intPartStr, 10) : 0;

  let orePart = 0;
  if (parts.length === 2) {
    let decStr = parts[1];
    if (!/^\d*$/.test(decStr)) {
      return null;
    }
    // Take first 2 digits or pad
    if (decStr.length === 0) {
      orePart = 0;
    } else if (decStr.length === 1) {
      orePart = parseInt(decStr, 10) * 10;
    } else {
      // Round if more than 2 decimal digits
      const twoDigits = decStr.substring(0, 2);
      const thirdDigit = decStr[2];
      let cents = parseInt(twoDigits, 10);
      if (thirdDigit && parseInt(thirdDigit, 10) >= 5) {
        cents += 1;
      }
      orePart = cents;
    }
  }

  const totalOre = intPart * 100 + orePart;
  return isNegative ? -totalOre : totalOre;
}

/**
 * Format öre as Swedish Kronor string: e.g. 125050 -> "1 250,50 kr"
 */
export function formatOreToSEK(ore: number): string {
  const sign = ore < 0 ? '-' : '';
  const absOre = Math.abs(ore);
  const kronor = Math.floor(absOre / 100);
  const remainingOre = absOre % 100;

  // Format thousands with space
  const kronorStr = kronor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const oreStr = remainingOre.toString().padStart(2, '0');

  return `${sign}${kronorStr},${oreStr} kr`;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse Swedish date or standard ISO date string to YYYY-MM-DD
 */
export function parseSwedishDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Pattern: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // Pattern: DD/MM/YYYY or DD-MM-YYYY or D.M.YYYY
  const euroMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (euroMatch) {
    const d = parseInt(euroMatch[1], 10);
    const m = parseInt(euroMatch[2], 10);
    const y = parseInt(euroMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

/**
 * Calculate total balance in öre from an array of transactions
 */
export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => acc + (t.amountOre || 0), 0);
}

/**
 * Validation rules
 */
export function validateHive(hive: Partial<Hive>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!hive.id || !isValidUUID(hive.id)) errors.push('Giltigt ID saknas (UUID krävs)');
  if (!hive.name || !hive.name.trim()) errors.push('Kupnamn måste anges');
  if (!hive.status || !['active', 'inactive', 'merged', 'archived'].includes(hive.status)) {
    errors.push('Ogiltig kupstatus');
  }
  return { valid: errors.length === 0, errors };
}

export function validateEvent(event: Partial<HiveEvent>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!event.id || !isValidUUID(event.id)) errors.push('Giltigt ID saknas');
  if (!event.hiveId || !isValidUUID(event.hiveId)) errors.push('Kupa måste väljas');
  if (!event.date || !parseSwedishDate(event.date)) errors.push('Giltigt datum (ÅÅÅÅ-MM-DD) krävs');
  if (!event.type) errors.push('Händelsetyp måste anges');
  // Free text notes or title are valid
  if (!event.title?.trim() && !event.notes?.trim()) {
    errors.push('Rubrik eller anteckning måste fyllas i');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTask(task: Partial<Task>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!task.id || !isValidUUID(task.id)) errors.push('Giltigt ID saknas');
  if (!task.title || !task.title.trim()) errors.push('Uppgiftsbeskrivning måste anges');
  if (!task.status || !['open', 'completed'].includes(task.status)) errors.push('Ogiltig status');
  if (task.dueDate && !parseSwedishDate(task.dueDate)) errors.push('Ogiltigt förfallodatum');
  return { valid: errors.length === 0, errors };
}

export function validateHarvest(harvest: Partial<Harvest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!harvest.id || !isValidUUID(harvest.id)) errors.push('Giltigt ID saknas');
  if (!harvest.date || !parseSwedishDate(harvest.date)) errors.push('Giltigt datum krävs');
  if (harvest.honeyWeightGrams !== undefined && harvest.honeyWeightGrams < 0) {
    errors.push('Honungsvikt kan inte vara negativ');
  }
  if (harvest.jarCount !== undefined && harvest.jarCount < 0) {
    errors.push('Antal burkar kan inte vara negativt');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTransaction(tx: Partial<Transaction>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!tx.id || !isValidUUID(tx.id)) errors.push('Giltigt ID saknas');
  if (!tx.date || !parseSwedishDate(tx.date)) errors.push('Giltigt datum krävs');
  if (!tx.description || !tx.description.trim()) errors.push('Beskrivning måste anges');
  if (tx.amountOre === undefined || isNaN(tx.amountOre)) errors.push('Belopp måste anges');
  return { valid: errors.length === 0, errors };
}
