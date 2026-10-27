/**
 * Bee Flight Physics & Speed Limiter Engine
 *
 * Enforces maximum speed bounds, smooth maneuver timing, and unified C1-continuous
 * flight trajectories so the honeybee never rushes, stutters, or abruptly snaps
 * into its landing morph.
 */

export type FlightPattern = "cruise" | "loop" | "dance" | "orientation";

/** Maximum allowed horizontal velocity across the navbar (% of navbar width per second) */
export const MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC = 30.0;

/** Minimum time required for each flight maneuver to perform gracefully */
export const MIN_MANEUVER_DURATIONS_MS: Record<FlightPattern, number> = {
  cruise: 750,
  loop: 2200,
  dance: 1850,
  orientation: 2800,
};

/** Durations for seamless integrated takeoff and landing phases in ms */
export const TAKEOFF_DURATION_MS = 280;
export const LANDING_DURATION_MS = 380;
export const LANDING_APPROACH_BUFFER_MS = 420;

/** Common flight height baseline above bottom navigation tabs */
export const CRUISE_ALTITUDE_Y = -46;
export const WATERMARK_RESTING_SCALE = 2.3;
export const WATERMARK_RESTING_OPACITY = 0.16;

export interface FlightPhysicsResult {
  durationMs: number;
  effectiveSpeedPercentPerSec: number;
  maneuverDurationMs: number;
  approachBufferMs: number;
  maxSpeedRespected: boolean;
}

/**
 * Calculates the flight duration and timing parameters with strict speed capping.
 *
 * @param distancePercent - Horizontal distance in navbar % (e.g. 20% for 1 tab, 80% for 4 tabs)
 * @param pattern - The selected flight maneuver ("cruise", "loop", "dance", "orientation")
 */
export function calculateFlightPhysics(
  distancePercent: number,
  pattern: FlightPattern,
): FlightPhysicsResult {
  const dist = Math.max(0, distancePercent);

  // 1. Calculate time needed by speed limit: duration >= distance / maxSpeed
  const minTimeBySpeedLimitMs = (dist / MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC) * 1000;

  // 2. Add organic travel base tempo (calm base + proportional distance)
  const organicTravelMs = dist * 22 + 450;

  // 3. Maneuver time requirement
  const minManeuverMs = MIN_MANEUVER_DURATIONS_MS[pattern];

  // 4. Total duration must satisfy speed cap, organic glide, and maneuver completion
  const rawDuration = Math.max(minTimeBySpeedLimitMs, organicTravelMs, minManeuverMs);
  const durationMs = Math.round(rawDuration);

  const durationSec = durationMs / 1000;
  const effectiveSpeed = durationSec > 0 ? dist / durationSec : 0;

  const approachBufferMs = Math.min(LANDING_APPROACH_BUFFER_MS, Math.round(durationMs * 0.25));
  const maneuverDurationMs = durationMs - approachBufferMs;

  return {
    durationMs,
    effectiveSpeedPercentPerSec: Number(effectiveSpeed.toFixed(2)),
    maneuverDurationMs,
    approachBufferMs,
    maxSpeedRespected: effectiveSpeed <= MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC + 0.05,
  };
}

export interface ManeuverCoordinates {
  x: number;
  y: number;
  roll: number;
}

/**
 * Computes exact continuous 2D position and banking roll at time `elapsedMs`.
 * Implements smooth damping over the final approach buffer so the bee levels out
 * seamlessly before landing and morphing into the tab watermark.
 */
export function calculateManeuverPosition(
  pattern: FlightPattern,
  elapsedMs: number,
  totalDurationMs: number,
  facing: 1 | -1,
): ManeuverCoordinates {
  const approachBuffer = Math.min(LANDING_APPROACH_BUFFER_MS, totalDurationMs * 0.25);
  const activeManeuverMs = Math.max(1, totalDurationMs - approachBuffer);

  // Dampening factor over final approach buffer: smoothly scales from 1.0 down to 0.0
  let amplitudeFactor = 1.0;
  if (elapsedMs > activeManeuverMs) {
    const approachProgress = Math.min(1.0, (elapsedMs - activeManeuverMs) / approachBuffer);
    amplitudeFactor = 0.5 * (1 + Math.cos(approachProgress * Math.PI));
  }

  const progress = Math.min(1.0, elapsedMs / activeManeuverMs);
  const t = progress * 2 * Math.PI;

  if (pattern === "cruise") {
    const y = CRUISE_ALTITUDE_Y - 6 * Math.sin(t) * amplitudeFactor;
    const roll = Math.cos(t) * 6 * facing * amplitudeFactor;
    return { x: 0, y: Number(y.toFixed(2)), roll: Number(roll.toFixed(1)) };
  }

  if (pattern === "loop") {
    const loopHeight = 92 * amplitudeFactor;
    const loopWidth = 38 * amplitudeFactor;
    const x = loopWidth * Math.sin(t) * facing;
    const y = CRUISE_ALTITUDE_Y - loopHeight * Math.sin(t / 2) * Math.sin(t / 2);
    const roll = -Math.sin(t) * 65 * facing * amplitudeFactor;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      roll: Number(roll.toFixed(1)),
    };
  }

  const isOrientation = pattern === "orientation";
  const width = (isOrientation ? 38 : 18) * amplitudeFactor;
  const height = (isOrientation ? 65 : 18) * amplitudeFactor;

  const x = width * Math.sin(t) * facing;
  // C1 continuous baseline starting and ending strictly at CRUISE_ALTITUDE_Y
  const y = isOrientation
    ? CRUISE_ALTITUDE_Y - height * Math.sin(t / 2) * Math.sin(t / 2) - 22 * Math.sin(2 * t) * Math.sin(progress * Math.PI) * amplitudeFactor
    : CRUISE_ALTITUDE_Y - height * Math.sin(2 * t) * Math.sin(progress * Math.PI) * amplitudeFactor;

  const roll = (isOrientation ? 14 : 9) * Math.sin(2 * t) * Math.sin(progress * Math.PI) * facing * amplitudeFactor;

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    roll: Number(roll.toFixed(1)),
  };
}

export interface UnifiedFlightParams {
  startPercent: number;
  targetPercent: number;
  pattern: FlightPattern;
  elapsedMs: number;
  totalDurationMs: number;
  facing: 1 | -1;
}

export interface UnifiedFlightFrame {
  trackPercent: number;
  x: number;
  y: number;
  roll: number;
  scale: number;
  opacity: number;
  isComplete: boolean;
}

function quinticEaseInOut(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Computes the unified, fully continuous flight state across all phases:
 * Phase 1: Takeoff & morph from resting watermark
 * Phase 2: Active aerial maneuver (cruise, loop, dance, orientation)
 * Phase 3: Touchdown & morph into target watermark
 *
 * Eliminates all CSS transition handover glitches, 14px altitude jumps,
 * and 19-degree rotational snaps.
 */
export function computeUnifiedFlightFrame(params: UnifiedFlightParams): UnifiedFlightFrame {
  const { startPercent, targetPercent, pattern, elapsedMs, totalDurationMs, facing } = params;

  if (elapsedMs >= totalDurationMs) {
    return {
      trackPercent: targetPercent,
      x: 0,
      y: 0,
      roll: 0,
      scale: WATERMARK_RESTING_SCALE,
      opacity: WATERMARK_RESTING_OPACITY,
      isComplete: true,
    };
  }

  // 1. Horizontal position: C1-continuous quintic S-curve
  const globalProgress = Math.max(0, Math.min(1, elapsedMs / totalDurationMs));
  const horizontalEased = quinticEaseInOut(globalProgress);
  const trackPercent = Number(
    (startPercent + (targetPercent - startPercent) * horizontalEased).toFixed(3),
  );

  const takeoffDuration = TAKEOFF_DURATION_MS;
  const landingDuration = LANDING_DURATION_MS;
  const activeDuration = Math.max(1, totalDurationMs - takeoffDuration - landingDuration);
  const initialFlightTilt = -12 * facing;

  // Phase 1: Takeoff
  if (elapsedMs < takeoffDuration) {
    const tProgress = elapsedMs / takeoffDuration;
    // Cubic ease-out
    const e = 1 - Math.pow(1 - tProgress, 3);

    const y = CRUISE_ALTITUDE_Y * e;
    const scale = WATERMARK_RESTING_SCALE - (WATERMARK_RESTING_SCALE - 1.0) * e;
    const opacity = WATERMARK_RESTING_OPACITY + (1.0 - WATERMARK_RESTING_OPACITY) * e;
    const roll = initialFlightTilt * e;

    return {
      trackPercent,
      x: 0,
      y: Number(y.toFixed(2)),
      roll: Number(roll.toFixed(1)),
      scale: Number(scale.toFixed(3)),
      opacity: Number(opacity.toFixed(3)),
      isComplete: false,
    };
  }

  // Phase 3: Landing
  const landingStartTime = totalDurationMs - landingDuration;
  if (elapsedMs >= landingStartTime) {
    const lElapsed = elapsedMs - landingStartTime;
    const lProgress = Math.min(1.0, lElapsed / landingDuration);
    // Smoothstep
    const e = lProgress * lProgress * (3 - 2 * lProgress);

    const y = CRUISE_ALTITUDE_Y * (1 - e);
    const scale = 1.0 + (WATERMARK_RESTING_SCALE - 1.0) * e;
    const opacity = 1.0 - (1.0 - WATERMARK_RESTING_OPACITY) * e;

    return {
      trackPercent,
      x: 0,
      y: Number(y.toFixed(2)),
      roll: 0,
      scale: Number(scale.toFixed(3)),
      opacity: Number(opacity.toFixed(3)),
      isComplete: false,
    };
  }

  // Phase 2: Active Airborne Maneuver
  const activeElapsed = elapsedMs - takeoffDuration;
  const tau = Math.min(1.0, Math.max(0, activeElapsed / activeDuration));
  const theta = tau * 2 * Math.PI;

  let x = 0;
  let y = CRUISE_ALTITUDE_Y;
  let roll = 0;

  if (pattern === "cruise") {
    // Cruising wave: gentle sinusoidal vertical drift
    y = CRUISE_ALTITUDE_Y - 7 * Math.sin(theta);
    // Smoothly blend from initial flight tilt to level zero
    roll = initialFlightTilt * (1 - tau) + 6 * facing * Math.sin(theta) * Math.sin(Math.PI * tau);
  } else if (pattern === "loop") {
    // Grand Aerial Loop-the-loop: climbs in sweeping 360 vertical loop
    const loopHeight = 92;
    const loopWidth = 38;
    x = loopWidth * Math.sin(theta) * facing;
    y = CRUISE_ALTITUDE_Y - loopHeight * Math.sin(theta / 2) * Math.sin(theta / 2);
    roll = initialFlightTilt * (1 - tau) - 65 * facing * Math.sin(theta);
  } else if (pattern === "dance") {
    // Playful waggle dance 8
    x = 18 * Math.sin(theta) * facing;
    y = CRUISE_ALTITUDE_Y - 18 * Math.sin(2 * theta) * Math.sin(Math.PI * tau);
    roll = initialFlightTilt * (1 - tau) + 9 * facing * Math.sin(2 * theta) * Math.sin(Math.PI * tau);
  } else {
    // Orientation: Grand expansive figure 8 soaring high above navbar
    x = 38 * Math.sin(theta) * facing;
    y = CRUISE_ALTITUDE_Y - 65 * Math.sin(theta / 2) * Math.sin(theta / 2) - 22 * Math.sin(2 * theta) * Math.sin(Math.PI * tau);
    roll = initialFlightTilt * (1 - tau) + 14 * facing * Math.sin(2 * theta) * Math.sin(Math.PI * tau);
  }

  return {
    trackPercent,
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    roll: Number(roll.toFixed(1)),
    scale: 1.0,
    opacity: 1.0,
    isComplete: false,
  };
}
