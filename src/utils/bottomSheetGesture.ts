export interface SheetDragState {
  startY: number;
  currentY: number;
  startTime: number;
  isDragging: boolean;
}

export interface SheetDecisionOptions {
  dismissDistanceThreshold?: number; // default 85px
  dismissVelocityThreshold?: number; // default 0.45 px/ms
  resistanceFactor?: number; // damping for upward pulls (default 0.2)
}

/**
 * Calculates current visual translation offset during a drag gesture.
 * When pulling downward (currentY > startY), translates 1:1.
 * When pulling upward (currentY < startY), dampens with resistance factor to simulate physical tension.
 */
export function calculateSheetTranslation(
  startY: number,
  currentY: number,
  options?: SheetDecisionOptions,
): number {
  const delta = currentY - startY;
  if (delta >= 0) {
    return delta;
  }
  const resistance = options?.resistanceFactor ?? 0.2;
  return delta * resistance;
}

/**
 * Evaluates whether a release gesture should dismiss the bottom sheet.
 * Returns true if dragged down past threshold distance or swiped with sufficient downward velocity.
 */
export function shouldDismissSheet(
  startY: number,
  endY: number,
  startTime: number,
  endTime: number,
  options?: SheetDecisionOptions,
): boolean {
  const distanceThreshold = options?.dismissDistanceThreshold ?? 85;
  const velocityThreshold = options?.dismissVelocityThreshold ?? 0.45;

  const deltaY = endY - startY;
  const deltaTime = Math.max(1, endTime - startTime);
  const velocity = deltaY / deltaTime; // px per ms

  // Downward distance exceeds threshold
  if (deltaY >= distanceThreshold) {
    return true;
  }

  // Fast downward swipe even if short distance (minimum 35px)
  if (deltaY >= 35 && velocity >= velocityThreshold) {
    return true;
  }

  return false;
}
