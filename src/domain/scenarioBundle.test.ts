import test from "node:test";
import assert from "node:assert/strict";
import {
  scrambleCustomerName,
  scrambleScenarioData,
  generateMarkdownDiagnosticReport,
  validateScenarioBundle,
  ScenarioBundle,
} from "./scenarioBundle";

test("scrambleCustomerName scrambles names consistently with anonymized label", () => {
  const result1 = scrambleCustomerName("Anna Berg");
  const result2 = scrambleCustomerName("Anna Berg");
  const result3 = scrambleCustomerName("Erik Lind");

  assert.equal(result1.includes("Kund A.B."), true);
  assert.equal(result1.includes("(Anonymiserad)"), true);
  assert.equal(result1, result2); // Deterministic
  assert.notEqual(result1, result3);
});

test("scrambleScenarioData scrambles counterparties and transaction descriptions", () => {
  const mockBundle: ScenarioBundle = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    isAnonymized: false,
    meta: { key: "config", schemaVersion: 1 },
    hives: [],
    events: [
      {
        id: "ev1",
        hiveId: "h1",
        date: "2026-05-10",
        type: "inspection",
        title: "Kupbesök hos Karin Blom",
        notes: "SÅLDE BURK TILL Karin Blom",
        createdAt: "",
        updatedAt: "",
      },
    ],
    tasks: [],
    harvests: [],
    transactions: [
      {
        id: "tx1",
        date: "2026-05-10",
        description: "Swish från Karin Blom",
        amountOre: 10000,
        counterparty: "Karin Blom",
        source: "manual",
        createdAt: "",
        updatedAt: "",
      },
    ],
    outbox: [],
    conflicts: [],
    environmentInfo: {
      userAgent: "Mozilla/5.0",
      isOnline: true,
      screenResolution: "1080x1920",
      standalonePwa: false,
    },
  };

  const scrambled = scrambleScenarioData(mockBundle);

  assert.equal(scrambled.isAnonymized, true);
  assert.notEqual(scrambled.transactions[0].counterparty, "Karin Blom");
  assert.equal(scrambled.transactions[0].counterparty?.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.transactions[0].description.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.events[0].title.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.events[0].notes.includes("(Anonymiserad)"), true);
});

test("generateMarkdownDiagnosticReport formats clean markdown report", () => {
  const mockBundle: ScenarioBundle = {
    version: "1.0",
    exportedAt: "2026-05-10T12:00:00Z",
    isAnonymized: true,
    meta: { key: "config", schemaVersion: 1 },
    hives: [{ id: "h1", name: "Kupa 1", status: "active", createdAt: "", updatedAt: "" }],
    events: [],
    tasks: [],
    harvests: [],
    transactions: [],
    outbox: [],
    conflicts: [],
    environmentInfo: {
      userAgent: "Android Mobile",
      isOnline: true,
      screenResolution: "390x844",
      standalonePwa: true,
    },
  };

  const markdown = generateMarkdownDiagnosticReport(mockBundle);

  assert.equal(markdown.includes("### 🐝 Bifogat Diagnostik & Scenariorapport"), true);
  assert.equal(markdown.includes("Anonymiserade personuppgifter:** Ja"), true);
  assert.equal(markdown.includes("Kupor:** 1 st"), true);
  assert.equal(markdown.includes("Android PWA"), true);
});

test("validateScenarioBundle rejects missing domain nodes or invalid schema versions", () => {
  // Invalid root
  assert.throws(() => validateScenarioBundle(null), /Förväntade ett JSON-objekt/);
  assert.throws(() => validateScenarioBundle("not json"), /Förväntade ett JSON-objekt/);

  // Unsupported version
  assert.throws(() => validateScenarioBundle({ version: "2.0" }), /version '2.0' stöds inte/);

  // Missing domain nodes
  const incompleteBundle = {
    version: "1.0",
    hives: [],
    events: [],
    // missing tasks
    harvests: [],
    transactions: [],
    outbox: [],
    conflicts: [],
    meta: { key: "config", schemaVersion: 1 },
    environmentInfo: { userAgent: "test", isOnline: true, screenResolution: "100x100", standalonePwa: false },
  };

  assert.throws(() => validateScenarioBundle(incompleteBundle), /Saknar domändatanod 'tasks'/);
});

test("scrambleScenarioData scrubs PII across tasks, harvests, events and transactions", () => {
  const mockBundle: ScenarioBundle = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    isAnonymized: false,
    meta: { key: "config", schemaVersion: 1 },
    hives: [],
    events: [],
    tasks: [
      {
        id: "t1",
        title: "Leverera honungsburk till Karin Blom",
        notes: "Ring Karin Blom vid ankomst",
        status: "open",
        createdAt: "",
        updatedAt: "",
      },
    ],
    harvests: [
      {
        id: "h1",
        date: "2026-06-01",
        batchName: "Specialbeställning Karin Blom",
        notes: "Märkt för Karin Blom",
        createdAt: "",
        updatedAt: "",
      },
    ],
    transactions: [
      {
        id: "tx1",
        date: "2026-06-01",
        description: "Betalning från Karin Blom",
        amountOre: 12000,
        counterparty: "Karin Blom",
        source: "manual",
        createdAt: "",
        updatedAt: "",
      },
    ],
    outbox: [],
    conflicts: [],
    environmentInfo: {
      userAgent: "TestAgent",
      isOnline: true,
      screenResolution: "800x600",
      standalonePwa: false,
    },
  };

  const scrambled = scrambleScenarioData(mockBundle);

  assert.equal(scrambled.isAnonymized, true);
  assert.equal(scrambled.tasks[0].title.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.tasks[0].notes?.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.harvests[0].batchName?.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.harvests[0].notes?.includes("(Anonymiserad)"), true);
  assert.equal(scrambled.transactions[0].counterparty?.includes("(Anonymiserad)"), true);
});
