import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  Transaction,
  OutboxOp,
  SyncConflict,
  AppMeta,
} from "./types";
import {
  hiveRepository,
  eventRepository,
  taskRepository,
  harvestRepository,
  transactionRepository,
  outboxRepository,
  conflictRepository,
  metaRepository,
} from "../storage/repositories";
import { putInStore } from "../storage/db";

export interface ScenarioBundle {
  version: "1.0";
  exportedAt: string;
  isAnonymized: boolean;
  meta: AppMeta;
  hives: Hive[];
  events: HiveEvent[];
  tasks: Task[];
  harvests: Harvest[];
  transactions: Transaction[];
  outbox: OutboxOp[];
  conflicts: SyncConflict[];
  environmentInfo: {
    userAgent: string;
    isOnline: boolean;
    screenResolution: string;
    standalonePwa: boolean;
  };
}

/**
 * Deterministically scrambles a person's name while preserving string structure when required.
 * E.g. "Anna Berg" -> "Kund A.B. (Anonymiserad)"
 */
export function scrambleCustomerName(name: string): string {
  if (!name || name.trim() === "") return name;
  const trimmed = name.trim();

  // If already anonymized format
  if (trimmed.includes("(Anonymiserad)")) return trimmed;

  const parts = trimmed.split(/\s+/);
  const initials = parts
    .map((p) => (p[0] ? p[0].toUpperCase() : ""))
    .filter(Boolean)
    .join(".");

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 900) + 100;

  return `Kund ${initials ? initials + "." : ""} ${code} (Anonymiserad)`;
}



/**
 * Validates that a raw object strictly conforms to the ScenarioBundle schema.
 */
export function validateScenarioBundle(data: unknown): ScenarioBundle {
  if (!data || typeof data !== "object") {
    throw new Error("Ogiltigt scenariopaket: Förväntade ett JSON-objekt.");
  }
  const obj = data as Record<string, any>;
  if (obj.version !== "1.0") {
    throw new Error(`Stöds ej: Scenariopaket-version '${obj.version || "okänd"}' stöds inte (förväntades 1.0).`);
  }
  const requiredArrays = ["hives", "events", "tasks", "harvests", "transactions", "outbox", "conflicts"];
  for (const key of requiredArrays) {
    if (!Array.isArray(obj[key])) {
      throw new Error(`Saknar domändatanod '${key}': förväntade en lista i scenariopaketet.`);
    }
  }
  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Error("Saknar applikationsmeta ('meta') i scenariopaketet.");
  }
  if (!obj.environmentInfo || typeof obj.environmentInfo !== "object") {
    throw new Error("Saknar miljöinformation ('environmentInfo') i scenariopaketet.");
  }
  return data as ScenarioBundle;
}

/**
 * Scrubs or scrambles PII fields across transactions and records
 */
export function scrambleScenarioData(bundle: ScenarioBundle): ScenarioBundle {
  const nameMap = new Map<string, string>();

  const getScrambledName = (rawName?: string): string | undefined => {
    if (!rawName) return undefined;
    if (!nameMap.has(rawName)) {
      nameMap.set(rawName, scrambleCustomerName(rawName));
    }
    return nameMap.get(rawName);
  };

  const scrambledTransactions = bundle.transactions.map((tx) => {
    const counterpartyScrambled = getScrambledName(tx.counterparty);
    let descScrambled = tx.description;
    if (tx.counterparty && counterpartyScrambled) {
      descScrambled = descScrambled.replace(tx.counterparty, counterpartyScrambled);
    }
    return {
      ...tx,
      counterparty: counterpartyScrambled,
      description: descScrambled,
    };
  });

  const scrambledEvents = bundle.events.map((ev) => {
    let notesScrambled = ev.notes;
    let titleScrambled = ev.title;
    nameMap.forEach((scrambled, raw) => {
      notesScrambled = notesScrambled.replaceAll(raw, scrambled);
      titleScrambled = titleScrambled.replaceAll(raw, scrambled);
    });
    return {
      ...ev,
      title: titleScrambled,
      notes: notesScrambled,
    };
  });

  const scrambledTasks = bundle.tasks.map((task) => {
    let notesScrambled = task.notes;
    let titleScrambled = task.title;
    nameMap.forEach((scrambled, raw) => {
      if (notesScrambled) notesScrambled = notesScrambled.replaceAll(raw, scrambled);
      if (titleScrambled) titleScrambled = titleScrambled.replaceAll(raw, scrambled);
    });
    return {
      ...task,
      title: titleScrambled,
      notes: notesScrambled,
    };
  });

  const scrambledHarvests = bundle.harvests.map((har) => {
    let notesScrambled = har.notes;
    let batchScrambled = har.batchName;
    nameMap.forEach((scrambled, raw) => {
      if (notesScrambled) notesScrambled = notesScrambled.replaceAll(raw, scrambled);
      if (batchScrambled) batchScrambled = batchScrambled.replaceAll(raw, scrambled);
    });
    return {
      ...har,
      batchName: batchScrambled,
      notes: notesScrambled,
    };
  });

  return {
    ...bundle,
    isAnonymized: true,
    transactions: scrambledTransactions,
    events: scrambledEvents,
    tasks: scrambledTasks,
    harvests: scrambledHarvests,
  };
}

/**
 * Creates a complete state snapshot from IndexedDB
 */
export async function createScenarioBundle(scramblePii = true): Promise<ScenarioBundle> {
  const meta = await metaRepository.get();
  const hives = await hiveRepository.getAll();
  const events = await eventRepository.getAll();
  const tasks = await taskRepository.getAll();
  const harvests = await harvestRepository.getAll();
  const transactions = await transactionRepository.getAll();
  const outbox = await outboxRepository.getAll();
  const conflicts = await conflictRepository.getAll();

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
  const screenResolution =
    typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown";
  const standalonePwa =
    typeof window !== "undefined"
      ? window.matchMedia("(display-mode: standalone)").matches
      : false;

  const rawBundle: ScenarioBundle = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    isAnonymized: false,
    meta,
    hives,
    events,
    tasks,
    harvests,
    transactions,
    outbox,
    conflicts,
    environmentInfo: {
      userAgent,
      isOnline,
      screenResolution,
      standalonePwa,
    },
  };

  return scramblePii ? scrambleScenarioData(rawBundle) : rawBundle;
}

/**
 * Generates a clean, pasteable markdown report for sharing in chat or issues
 */
export function generateMarkdownDiagnosticReport(bundle: ScenarioBundle): string {
  const dateStr = new Date(bundle.exportedAt).toLocaleString("sv-SE");

  const openTasks = bundle.tasks.filter((t) => t.status === "open");
  const totalBalanceOre = bundle.transactions.reduce((sum, t) => sum + (t.amountOre || 0), 0);
  const totalBalanceSek = (totalBalanceOre / 100).toFixed(2);

  const sampleTx = bundle.transactions.slice(0, 5).map((t) => {
    return `- ${t.date}: ${t.description} (${(t.amountOre / 100).toFixed(0)} kr${t.counterparty ? `, ${t.counterparty}` : ""})`;
  });

  const sampleEvents = bundle.events.slice(0, 5).map((e) => {
    const hive = bundle.hives.find((h) => h.id === e.hiveId);
    return `- ${e.date} [${hive?.name || "Kupa"}]: ${e.title}`;
  });

  return `### 🐝 Bifogat Diagnostik & Scenariorapport
**Genererad:** ${dateStr}
**Anonymiserade personuppgifter:** ${bundle.isAnonymized ? "Ja (Krypterade kundnamn)" : "Nej (Originaldata)"}

#### 📱 Miljö & Status
- **Plattform / Webbläsare:** ${bundle.environmentInfo.userAgent.includes("Android") ? "Android PWA" : "Webb / Desktop"}
- **Nätverk:** ${bundle.environmentInfo.isOnline ? "Online" : "Offline"}
- **Skärmupplösning:** ${bundle.environmentInfo.screenResolution} (Standalone PWA: ${bundle.environmentInfo.standalonePwa ? "Ja" : "Nej"})
- **Kalkylark länkat:** ${bundle.meta.spreadsheetId ? "Ja (" + (bundle.meta.spreadsheetTitle || "Länkat") + ")" : "Nej"}
- **Väntande ändringar i utbox:** ${bundle.outbox.length} st
- **Aktiva konflikter:** ${bundle.conflicts.length} st

#### 📊 Register & Volymer
- **Kupor:** ${bundle.hives.length} st (${bundle.hives.filter((h) => h.status === "active").length} aktiva)
- **Kupbesök:** ${bundle.events.length} st
- **Uppgifter:** ${bundle.tasks.length} st (${openTasks.length} öppna)
- **Honungsskördar:** ${bundle.harvests.length} st
- **Transaktioner:** ${bundle.transactions.length} st (Beräknat saldo: ${totalBalanceSek} kr)

#### 📝 Senaste Kupbesök (Sample)
${sampleEvents.length > 0 ? sampleEvents.join("\n") : "_Inga registrerade kupbesök_"}

#### 💳 Senaste Transaktioner (Sample)
${sampleTx.length > 0 ? sampleTx.join("\n") : "_Inga registrerade transaktioner_"}
`;
}

/**
 * Loads and restores a ScenarioBundle into IndexedDB for dev preview simulation
 */
export async function loadScenarioBundle(bundle: ScenarioBundle): Promise<void> {
  const validated = validateScenarioBundle(bundle);

  // Restore hives
  for (const h of validated.hives || []) {
    await putInStore("hives", h);
  }

  // Restore events
  for (const e of validated.events || []) {
    await putInStore("events", e);
  }

  // Restore tasks
  for (const t of validated.tasks || []) {
    await putInStore("tasks", t);
  }

  // Restore harvests
  for (const h of validated.harvests || []) {
    await putInStore("harvests", h);
  }

  // Restore transactions
  for (const tx of validated.transactions || []) {
    await putInStore("transactions", tx);
  }
}
