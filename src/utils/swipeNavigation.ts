import { NavTab } from "../components/NavBar";

export interface SwipePoint {
  x: number;
  y: number;
  time: number;
}

export interface SwipeDecisionOptions {
  minDistance?: number;
  maxDurationMs?: number;
  directionalRatio?: number;
}

export type SwipeDirection = "left" | "right";

export const DEFAULT_MIN_SWIPE_DISTANCE = 45;
export const DEFAULT_MAX_SWIPE_DURATION_MS = 600;
export const DEFAULT_DIRECTIONAL_RATIO = 1.25;

/**
 * Determines whether a touch sequence constitutes a valid horizontal swipe.
 * Rejects vertical scrolls, microscopic movements, and excessively slow drags.
 */
export function detectSwipeDirection(
  start: SwipePoint,
  end: SwipePoint,
  options: SwipeDecisionOptions = {},
): SwipeDirection | null {
  const minDistance = options.minDistance ?? DEFAULT_MIN_SWIPE_DISTANCE;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_SWIPE_DURATION_MS;
  const ratio = options.directionalRatio ?? DEFAULT_DIRECTIONAL_RATIO;

  const duration = end.time - start.time;
  if (duration > maxDurationMs) {
    return null;
  }

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  // Must exceed minimum horizontal distance
  if (absX < minDistance) {
    return null;
  }

  // Horizontal motion must decisively dominate vertical scroll motion
  if (absX < absY * ratio) {
    return null;
  }

  // DeltaX < 0 means swiping left (touch moved to the left) -> advance to next tab
  // DeltaX > 0 means swiping right (touch moved to the right) -> return to previous tab
  return deltaX < 0 ? "left" : "right";
}

/**
 * Computes the target tab given current tab, ordered tabs, and swipe direction.
 * Swiping left advances to the next tab (index + 1).
 * Swiping right returns to the previous tab (index - 1).
 * Returns null if attempting to swipe past the edges.
 */
export function getAdjacentTab(
  currentTab: NavTab,
  tabOrder: NavTab[],
  swipeDirection: SwipeDirection,
): NavTab | null {
  const currentIndex = tabOrder.indexOf(currentTab);
  if (currentIndex === -1) return null;

  if (swipeDirection === "left") {
    // Swiping left moves viewport to the right (next tab)
    if (currentIndex < tabOrder.length - 1) {
      return tabOrder[currentIndex + 1];
    }
  } else if (swipeDirection === "right") {
    // Swiping right moves viewport to the left (previous tab)
    if (currentIndex > 0) {
      return tabOrder[currentIndex - 1];
    }
  }

  return null;
}
