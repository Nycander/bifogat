export interface SheetDragState {
  startY: number;
  currentY: number;
  startTime: number;
  isDragging: boolean;
}

export interface SheetDecisionOptions {
  dismissDistanceThreshold?: number; // default 130px
  dismissVelocityThreshold?: number; // default 0.55 px/ms
  minFlickDistance?: number; // default 75px
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
 * Prevents premature dismissal on tiny finger slips or early short releases (< 75px).
 */
export function shouldDismissSheet(
  startY: number,
  endY: number,
  startTime: number,
  endTime: number,
  options?: SheetDecisionOptions,
): boolean {
  const distanceThreshold = options?.dismissDistanceThreshold ?? 130;
  const velocityThreshold = options?.dismissVelocityThreshold ?? 0.55;
  const minFlickDistance = options?.minFlickDistance ?? 75;

  const deltaY = endY - startY;
  if (deltaY <= 0) {
    return false;
  }

  const deltaTime = Math.max(1, endTime - startTime);
  const velocity = deltaY / deltaTime; // px per ms

  // Downward distance exceeds substantial threshold (e.g. >= 130px)
  if (deltaY >= distanceThreshold) {
    return true;
  }

  // Fast downward flick requires at least minFlickDistance (>= 75px) to prevent accidental dismissals
  if (deltaY >= minFlickDistance && velocity >= velocityThreshold) {
    return true;
  }

  return false;
}

/**
 * Smooth cubic ease-out curve matching cubic-bezier(0.25, 1, 0.5, 1).
 */
export function easeOutCubic(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - p, 3);
}

/**
 * Spring ease-out with subtle overshoot for responsive, organic rebound to 0.
 */
export function easeOutBack(t: number): number {
  const p = Math.max(0, Math.min(1, t));
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

/**
 * Computes intermediate translation coordinate along an animation curve.
 */
export function interpolatePosition(
  from: number,
  to: number,
  progress: number,
  easing: (t: number) => number = easeOutCubic,
): number {
  const eased = easing(progress);
  return from + (to - from) * eased;
}

/**
 * Computes intermediate backdrop opacity along an animation curve.
 */
export function interpolateOpacity(
  from: number,
  to: number,
  progress: number,
): number {
  const p = Math.max(0, Math.min(1, progress));
  return from + (to - from) * p;
}
