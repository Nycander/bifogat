import test from "node:test";
import assert from "node:assert/strict";
import {
  detectSwipeDirection,
  getAdjacentTab,
  DEFAULT_MIN_SWIPE_DISTANCE,
} from "./swipeNavigation";
import { NavTab } from "../components/NavBar";

const TAB_ORDER: NavTab[] = ["overview", "hives", "harvests", "economy", "settings"];

test("detectSwipeDirection detects fast horizontal swipe left and right", () => {
  // Swiping left (touch moved -70px in 180ms)
  const swipeLeft = detectSwipeDirection(
    { x: 200, y: 300, time: 1000 },
    { x: 130, y: 305, time: 1180 },
  );
  assert.strictEqual(swipeLeft, "left");

  // Swiping right (touch moved +85px in 220ms)
  const swipeRight = detectSwipeDirection(
    { x: 100, y: 300, time: 1000 },
    { x: 185, y: 310, time: 1220 },
  );
  assert.strictEqual(swipeRight, "right");
});

test("detectSwipeDirection ignores vertical scrolling gestures", () => {
  // Vertical scroll down (+120px Y, 20px X)
  const verticalScroll = detectSwipeDirection(
    { x: 150, y: 200, time: 1000 },
    { x: 170, y: 320, time: 1250 },
  );
  assert.strictEqual(verticalScroll, null);

  // Diagonal movement where vertical dominates
  const diagonal = detectSwipeDirection(
    { x: 150, y: 200, time: 1000 },
    { x: 200, y: 280, time: 1200 },
  );
  assert.strictEqual(diagonal, null);
});

test("detectSwipeDirection rejects tiny movements below minimum threshold", () => {
  const tinyLeft = detectSwipeDirection(
    { x: 100, y: 100, time: 1000 },
    { x: 100 - (DEFAULT_MIN_SWIPE_DISTANCE - 5), y: 102, time: 1100 },
  );
  assert.strictEqual(tinyLeft, null);
});

test("detectSwipeDirection rejects slow drags exceeding max duration", () => {
  const slowDrag = detectSwipeDirection(
    { x: 100, y: 100, time: 1000 },
    { x: 20, y: 102, time: 1800 }, // 800ms duration > 600ms default
  );
  assert.strictEqual(slowDrag, null);
});

test("getAdjacentTab steps through tabOrder correctly when swiping left", () => {
  assert.strictEqual(getAdjacentTab("overview", TAB_ORDER, "left"), "hives");
  assert.strictEqual(getAdjacentTab("hives", TAB_ORDER, "left"), "harvests");
  assert.strictEqual(getAdjacentTab("harvests", TAB_ORDER, "left"), "economy");
  assert.strictEqual(getAdjacentTab("economy", TAB_ORDER, "left"), "settings");
  // At last tab, swiping left has no next tab
  assert.strictEqual(getAdjacentTab("settings", TAB_ORDER, "left"), null);
});

test("getAdjacentTab steps through tabOrder correctly when swiping right", () => {
  assert.strictEqual(getAdjacentTab("settings", TAB_ORDER, "right"), "economy");
  assert.strictEqual(getAdjacentTab("economy", TAB_ORDER, "right"), "harvests");
  assert.strictEqual(getAdjacentTab("harvests", TAB_ORDER, "right"), "hives");
  assert.strictEqual(getAdjacentTab("hives", TAB_ORDER, "right"), "overview");
  // At first tab, swiping right has no previous tab
  assert.strictEqual(getAdjacentTab("overview", TAB_ORDER, "right"), null);
});
