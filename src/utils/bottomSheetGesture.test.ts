import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSheetTranslation,
  shouldDismissSheet,
} from "./bottomSheetGesture";

test("calculateSheetTranslation returns direct translation for downward drag", () => {
  const t = calculateSheetTranslation(100, 150);
  assert.equal(t, 50);
});

test("calculateSheetTranslation applies resistance when dragging upward", () => {
  const t = calculateSheetTranslation(100, 50);
  // delta is -50, resistance 0.2 => -10
  assert.equal(t, -10);
});

test("shouldDismissSheet returns true if dragged down past distance threshold", () => {
  // Dragged down 90px in 300ms (threshold is 85px)
  const dismiss = shouldDismissSheet(100, 190, 1000, 1300);
  assert.equal(dismiss, true);
});

test("shouldDismissSheet returns false if dragged down less than distance threshold and slow", () => {
  // Dragged down 40px in 500ms => velocity 0.08 px/ms
  const dismiss = shouldDismissSheet(100, 140, 1000, 1500);
  assert.equal(dismiss, false);
});

test("shouldDismissSheet returns true for fast flick downwards even with modest distance", () => {
  // Dragged down 50px in 60ms => velocity 0.83 px/ms (> 0.45 px/ms threshold)
  const dismiss = shouldDismissSheet(100, 150, 1000, 1060);
  assert.equal(dismiss, true);
});

test("shouldDismissSheet returns false for upward drag", () => {
  const dismiss = shouldDismissSheet(200, 100, 1000, 1100);
  assert.equal(dismiss, false);
});
