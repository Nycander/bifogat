import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFlightPhysics,
  calculateManeuverPosition,
  computeUnifiedFlightFrame,
  MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC,
  MIN_MANEUVER_DURATIONS_MS,
  CRUISE_ALTITUDE_Y,
  WATERMARK_RESTING_SCALE,
  WATERMARK_RESTING_OPACITY,
  FlightPattern,
} from "./beeFlightPhysics";

test("calculateFlightPhysics strictly caps horizontal speed at 30% per second", () => {
  const distances = [0, 5, 20, 40, 60, 80, 100];
  const patterns: FlightPattern[] = ["cruise", "loop", "dance", "orientation"];

  for (const dist of distances) {
    for (const pattern of patterns) {
      const result = calculateFlightPhysics(dist, pattern);

      // Verify that speed cap is never violated
      assert.ok(
        result.effectiveSpeedPercentPerSec <= MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC + 0.05,
        `Speed ${result.effectiveSpeedPercentPerSec}%/s exceeded max ${MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC}%/s at dist ${dist}% with pattern ${pattern}`,
      );
      assert.strictEqual(result.maxSpeedRespected, true);
    }
  }
});

test("calculateFlightPhysics respects minimum maneuver durations for loop, dance, and orientation", () => {
  const shortDistance = 20; // 1 tab distance ~ 20%
  const loopPhysics = calculateFlightPhysics(shortDistance, "loop");
  const dancePhysics = calculateFlightPhysics(shortDistance, "dance");
  const orientationPhysics = calculateFlightPhysics(shortDistance, "orientation");
  const cruisePhysics = calculateFlightPhysics(shortDistance, "cruise");

  assert.ok(
    loopPhysics.durationMs >= MIN_MANEUVER_DURATIONS_MS.loop,
    `Loop flight duration ${loopPhysics.durationMs}ms must be at least ${MIN_MANEUVER_DURATIONS_MS.loop}ms`,
  );
  assert.ok(
    dancePhysics.durationMs >= MIN_MANEUVER_DURATIONS_MS.dance,
    `Dance flight duration ${dancePhysics.durationMs}ms must be at least ${MIN_MANEUVER_DURATIONS_MS.dance}ms`,
  );
  assert.ok(
    orientationPhysics.durationMs >= MIN_MANEUVER_DURATIONS_MS.orientation,
    `Orientation flight duration ${orientationPhysics.durationMs}ms must be at least ${MIN_MANEUVER_DURATIONS_MS.orientation}ms`,
  );
  assert.ok(
    cruisePhysics.durationMs >= MIN_MANEUVER_DURATIONS_MS.cruise,
    `Cruise flight duration ${cruisePhysics.durationMs}ms must be at least ${MIN_MANEUVER_DURATIONS_MS.cruise}ms`,
  );
});

test("calculateFlightPhysics ensures large distances take sufficient time to prevent rushing", () => {
  // Jumping across 4 tabs (from tab 0 to tab 4 is 80% of navbar)
  const fullCrossNavbar = 80;
  const result = calculateFlightPhysics(fullCrossNavbar, "cruise");

  // At 30%/s, 80% must take at least 80/30 * 1000 = 2666ms
  assert.ok(
    result.durationMs >= 2666,
    `Full navbar crossing took ${result.durationMs}ms, expected >= 2666ms to prevent rushing`,
  );
  assert.ok(result.effectiveSpeedPercentPerSec <= 30.0);
});

test("calculateManeuverPosition smooths and damps maneuver to 0 before touchdown", () => {
  const patterns: FlightPattern[] = ["loop", "dance", "orientation"];
  const totalDuration = 2400;

  for (const pattern of patterns) {
    const finalPos = calculateManeuverPosition(pattern, totalDuration, totalDuration, 1);

    assert.strictEqual(
      finalPos.x,
      0,
      `Pattern ${pattern} final x-offset should be 0 for smooth touchdown, got ${finalPos.x}`,
    );
    assert.strictEqual(
      finalPos.roll,
      0,
      `Pattern ${pattern} final roll should be 0deg (level) for smooth touchdown, got ${finalPos.roll}`,
    );
  }
});

test("calculateManeuverPosition loop maneuver climbs in a vertical circle and responds to facing direction", () => {
  const duration = 2000;

  // Mid-loop facing right (1)
  const posRight = calculateManeuverPosition("loop", 400, duration, 1);
  assert.ok(!Number.isNaN(posRight.x) && !Number.isNaN(posRight.y));

  // Facing left (-1) should invert x and roll
  const posLeft = calculateManeuverPosition("loop", 400, duration, -1);
  assert.strictEqual(posLeft.x, -posRight.x);
  assert.strictEqual(posLeft.roll, -posRight.roll);
  assert.strictEqual(posLeft.y, posRight.y); // y altitude is independent of facing
});

test("computeUnifiedFlightFrame is C1-continuous with no height or rotation pops across all patterns", () => {
  const patterns: FlightPattern[] = ["cruise", "loop", "dance", "orientation"];
  const dt = 16.666; // 60fps frame delta

  for (const pattern of patterns) {
    const physics = calculateFlightPhysics(20, pattern);
    const dur = physics.durationMs;

    // 1. Initial frame matches resting watermark
    const startFrame = computeUnifiedFlightFrame({
      startPercent: 10,
      targetPercent: 30,
      pattern,
      elapsedMs: 0,
      totalDurationMs: dur,
      facing: 1,
    });
    assert.strictEqual(startFrame.trackPercent, 10);
    assert.strictEqual(startFrame.y, 0);
    assert.strictEqual(startFrame.scale, WATERMARK_RESTING_SCALE);
    assert.strictEqual(startFrame.opacity, WATERMARK_RESTING_OPACITY);
    assert.strictEqual(startFrame.roll, 0);

    // 2. Continuous frame-by-frame verification (no 14px pops or 19° snaps)
    let prevY = startFrame.y;
    let prevRoll = startFrame.roll;

    for (let t = dt; t < dur; t += dt) {
      const frame = computeUnifiedFlightFrame({
        startPercent: 10,
        targetPercent: 30,
        pattern,
        elapsedMs: t,
        totalDurationMs: dur,
        facing: 1,
      });

      const deltaY = Math.abs(frame.y - prevY);
      const deltaRoll = Math.abs(frame.roll - prevRoll);

      // Max allowable delta per 16ms frame
      assert.ok(
        deltaY < 8.0,
        `Pattern ${pattern} had unexpected y-jump of ${deltaY}px at t=${t.toFixed(0)}ms (prevY=${prevY}, y=${frame.y})`,
      );
      assert.ok(
        deltaRoll < 5.0,
        `Pattern ${pattern} had unexpected roll jump of ${deltaRoll}deg at t=${t.toFixed(0)}ms (prevRoll=${prevRoll}, roll=${frame.roll})`,
      );

      prevY = frame.y;
      prevRoll = frame.roll;
    }

    // 3. Final frame matches target resting watermark exactly
    const endFrame = computeUnifiedFlightFrame({
      startPercent: 10,
      targetPercent: 30,
      pattern,
      elapsedMs: dur,
      totalDurationMs: dur,
      facing: 1,
    });
    assert.strictEqual(endFrame.trackPercent, 30);
    assert.strictEqual(endFrame.y, 0);
    assert.strictEqual(endFrame.scale, WATERMARK_RESTING_SCALE);
    assert.strictEqual(endFrame.opacity, WATERMARK_RESTING_OPACITY);
    assert.strictEqual(endFrame.roll, 0);
    assert.strictEqual(endFrame.isComplete, true);
  }
});
