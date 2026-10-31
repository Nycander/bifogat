import test from "node:test";
import assert from "node:assert/strict";
import { deriveEventTitle, DEFAULT_EVENT_LABELS } from "./eventTitleDerivation";

test("deriveEventTitle returns default type label when notes is empty or whitespace", () => {
  assert.equal(deriveEventTitle("", "inspection"), DEFAULT_EVENT_LABELS.inspection);
  assert.equal(deriveEventTitle("   \n ", "feeding"), DEFAULT_EVENT_LABELS.feeding);
  assert.equal(deriveEventTitle("", "treatment"), "Varroabehandling");
});

test("deriveEventTitle uses short first line as title directly", () => {
  const notes = "Drottning sedd, 4 ramar yngel";
  assert.equal(deriveEventTitle(notes, "inspection"), "Drottning sedd, 4 ramar yngel");
});

test("deriveEventTitle splits by period if first line is long", () => {
  const notes = "Kollade alla ramar i yngelrummet noggrant. Mycket foder kvar sedan invintringen och friska bin.";
  assert.equal(deriveEventTitle(notes, "inspection"), "Kollade alla ramar i yngelrummet noggrant");
});

test("deriveEventTitle truncates very long single line with ellipsis", () => {
  const notes = "En väldigt lång sammanhängande mening utan några punkter överhuvudtaget som förklarar i detalj hur bisamhället mår under vårkontrollen";
  const derived = deriveEventTitle(notes, "inspection");
  assert.ok(derived.endsWith("..."));
  assert.ok(derived.length <= 70);
});

test("deriveEventTitle uses only the first line if notes contains multiple lines", () => {
  const notes = "Satte på skattlåda 2\n- 10 nya ramar med vax\n- Yngelrummet såg fint ut";
  assert.equal(deriveEventTitle(notes, "equipment_change"), "Satte på skattlåda 2");
});
