import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSheetTranslation,
  shouldDismissSheet,
  easeOutCubic,
  easeOutBack,
  interpolatePosition,
  interpolateOpacity,
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
  // Dragged down 140px in 300ms (threshold is 130px)
  const dismiss = shouldDismissSheet(100, 240, 1000, 1300);
  assert.equal(dismiss, true);
});

test("shouldDismissSheet returns false if dragged down less than distance threshold and slow", () => {
  // Dragged down 90px in 1000ms => velocity 0.09 px/ms (< 0.55 px/ms threshold and < 130px distance)
  const dismiss = shouldDismissSheet(100, 190, 1000, 2000);
  assert.equal(dismiss, false);
});

test("shouldDismissSheet returns false for early short release under minFlickDistance (even with high velocity)", () => {
  // Dragged down only 45px in 40ms => velocity 1.1 px/ms, but deltaY < 75px (minFlickDistance)
  // Prevents accidental dismissals when releasing modal too early or slight twitch
  const dismiss = shouldDismissSheet(100, 145, 1000, 1040);
  assert.equal(dismiss, false);
});

test("shouldDismissSheet returns true for fast flick downwards when exceeding minFlickDistance", () => {
  // Dragged down 85px in 90ms => velocity 0.94 px/ms (>= 75px minFlickDistance and > 0.55 px/ms threshold)
  const dismiss = shouldDismissSheet(100, 185, 1000, 1090);
  assert.equal(dismiss, true);
});

test("shouldDismissSheet returns false for upward drag", () => {
  const dismiss = shouldDismissSheet(200, 100, 1000, 1100);
  assert.equal(dismiss, false);
});

test("easeOutCubic starts at 0, ends at 1, and decelerates monotonically", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  const mid = easeOutCubic(0.5);
  // Ease out reaches > 0.5 at halfway mark
  assert.ok(mid > 0.7);
  assert.ok(mid < 1.0);
});

test("easeOutBack starts at 0 and ends at 1 with overshoot", () => {
  assert.equal(easeOutBack(0), 0);
  assert.equal(easeOutBack(1), 1);
  // Overshoots slightly past 1 around t=0.75-0.85
  const peak = easeOutBack(0.8);
  assert.ok(peak > 1.0);
});

test("interpolatePosition calculates intermediate coordinates correctly", () => {
  const atStart = interpolatePosition(100, 800, 0);
  const atEnd = interpolatePosition(100, 800, 1);
  assert.equal(atStart, 100);
  assert.equal(atEnd, 800);

  const atHalf = interpolatePosition(100, 800, 0.5, (t) => t);
  assert.equal(atHalf, 450);
});

test("interpolateOpacity clamps between from and to", () => {
  assert.equal(interpolateOpacity(0.8, 0, 0), 0.8);
  assert.equal(interpolateOpacity(0.8, 0, 1), 0);
  assert.equal(interpolateOpacity(0.8, 0, 0.5), 0.4);
});
