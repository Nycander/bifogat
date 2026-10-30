import test from "node:test";
import assert from "node:assert/strict";
import { mergeEventDescription } from "./eventMigration";

test("mergeEventDescription returns clean title when notes is empty", () => {
  const merged = mergeEventDescription("Drottning sedd", "");
  assert.equal(merged, "Drottning sedd");
});

test("mergeEventDescription returns clean notes when title is empty", () => {
  const merged = mergeEventDescription("", "5 ramar yngel och gott om foder.");
  assert.equal(merged, "5 ramar yngel och gott om foder.");
});

test("mergeEventDescription combines title and notes with period when needed", () => {
  const merged = mergeEventDescription("Vårkoll", "Drottning sedd och 4 ramar yngel");
  assert.equal(merged, "Vårkoll. Drottning sedd och 4 ramar yngel");
});

test("mergeEventDescription respects existing punctuation in title", () => {
  const merged = mergeEventDescription("Drottning sedd!", "Fint humör hos samhället.");
  assert.equal(merged, "Drottning sedd! Fint humör hos samhället.");
});

test("mergeEventDescription avoids duplicating if notes already includes title", () => {
  const merged = mergeEventDescription("Drottning sedd", "Drottning sedd i Kupa A, gott om foder");
  assert.equal(merged, "Drottning sedd i Kupa A, gott om foder");
});

test("mergeEventDescription handles identical title and notes without repetition", () => {
  const merged = mergeEventDescription("Invintring klar", "Invintring klar");
  assert.equal(merged, "Invintring klar");
});
