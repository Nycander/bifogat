import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFlightPhysics,
  calculateManeuverPosition,
  computeUnifiedFlightFrame,
  computeContinuousFlightFrame,
  MAX_HORIZONTAL_SPEED_PERCENT_PER_SEC,
  MIN_MANEUVER_DURATIONS_MS,
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
        deltaRoll < 8.0,
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

test("computeContinuousFlightFrame with wasAirborne = true retains exact coordinates at t = 0 (no position reset or jump)", () => {
  const midFlightCoords = {
    startX: 14.5,
    startY: -42.8,
    startRoll: 68.2,
    startScale: 1.05,
    startOpacity: 0.98,
    startPercent: 36.4,
  };

  const frame0 = computeContinuousFlightFrame({
    ...midFlightCoords,
    targetPercent: 70,
    wasAirborne: true,
    pattern: "cruise",
    elapsedMs: 0,
    totalDurationMs: 1200,
    facing: 1,
  });

  // Verify exact coordinate preservation on initial frame of redirected flight (zero snap)
  assert.strictEqual(frame0.trackPercent, midFlightCoords.startPercent);
  assert.strictEqual(frame0.x, midFlightCoords.startX);
  assert.strictEqual(frame0.y, midFlightCoords.startY);
  assert.strictEqual(frame0.roll, midFlightCoords.startRoll);
  assert.strictEqual(frame0.scale, midFlightCoords.startScale);
  assert.strictEqual(frame0.opacity, midFlightCoords.startOpacity);
  assert.strictEqual(frame0.isComplete, false);
});

test("rapid navigation simulation across multiple mid-flight retargets maintains strict continuity with zero jumps", () => {
  // Simulate clicking Tab 0 -> Tab 2 -> interrupted at 220ms to Tab 4 -> interrupted at 380ms to Tab 1
  let currentTargetPercent = 50; // Tab 2
  let currentStartPercent = 10; // Tab 0
  let wasAirborne = false;
  let startX = 0;
  let startY = 0;
  let startRoll = 0;
  let startScale = WATERMARK_RESTING_SCALE;
  let startOpacity = WATERMARK_RESTING_OPACITY;
  let duration = calculateFlightPhysics(40, "dance").durationMs;
  let facing: 1 | -1 = 1;

  let prevX = 0;
  let prevY = 0;
  let prevScale = WATERMARK_RESTING_SCALE;
  let prevTrack = currentStartPercent;

  const dt = 16.666;
  let localElapsed = 0;

  // Run initial flight for 220ms
  for (; localElapsed <= 220; localElapsed += dt) {
    const frame = computeContinuousFlightFrame({
      startPercent: currentStartPercent,
      targetPercent: currentTargetPercent,
      startX,
      startY,
      startRoll,
      startScale,
      startOpacity,
      wasAirborne,
      pattern: "dance",
      elapsedMs: localElapsed,
      totalDurationMs: duration,
      facing,
    });
    prevX = frame.x;
    prevY = frame.y;
    prevScale = frame.scale;
    prevTrack = frame.trackPercent;
  }

  // Rapid Click #1: User clicks Tab 4 (90%) mid-flight!
  currentStartPercent = prevTrack;
  currentTargetPercent = 90;
  startX = prevX;
  startY = prevY;
  startRoll = 72;
  startScale = prevScale;
  startOpacity = 1.0;
  wasAirborne = true;
  facing = 1;
  duration = calculateFlightPhysics(Math.abs(currentTargetPercent - currentStartPercent), "cruise").durationMs;
  localElapsed = 0;

  // Frame 0 of retarget MUST match previous frame with zero jump!
  const retargetFrame0 = computeContinuousFlightFrame({
    startPercent: currentStartPercent,
    targetPercent: currentTargetPercent,
    startX,
    startY,
    startRoll,
    startScale,
    startOpacity,
    wasAirborne,
    pattern: "cruise",
    elapsedMs: 0,
    totalDurationMs: duration,
    facing,
  });

  assert.strictEqual(retargetFrame0.trackPercent, prevTrack);
  assert.strictEqual(retargetFrame0.x, prevX);
  assert.strictEqual(retargetFrame0.y, prevY);
  assert.ok(Math.abs(retargetFrame0.y - prevY) < 0.01, "Y position must not jump on retarget");
  assert.ok(Math.abs(retargetFrame0.scale - prevScale) < 0.01, "Scale must not jump on retarget");

  // Advance 160ms further
  for (; localElapsed <= 160; localElapsed += dt) {
    const frame = computeContinuousFlightFrame({
      startPercent: currentStartPercent,
      targetPercent: currentTargetPercent,
      startX,
      startY,
      startRoll,
      startScale,
      startOpacity,
      wasAirborne,
      pattern: "cruise",
      elapsedMs: localElapsed,
      totalDurationMs: duration,
      facing,
    });

    const deltaY = Math.abs(frame.y - prevY);
    assert.ok(deltaY < 8.0, `Delta Y jump ${deltaY}px during rapid flight transition`);

    prevX = frame.x;
    prevY = frame.y;
    prevScale = frame.scale;
    prevTrack = frame.trackPercent;
  }

  // Rapid Click #2: User rapidly flips direction to Tab 1 (30%)
  currentStartPercent = prevTrack;
  currentTargetPercent = 30;
  startX = prevX;
  startY = prevY;
  startRoll = 72;
  startScale = prevScale;
  startOpacity = 1.0;
  wasAirborne = true;
  facing = -1;
  duration = calculateFlightPhysics(Math.abs(currentTargetPercent - currentStartPercent), "cruise").durationMs;

  const reverseFrame0 = computeContinuousFlightFrame({
    startPercent: currentStartPercent,
    targetPercent: currentTargetPercent,
    startX,
    startY,
    startRoll,
    startScale,
    startOpacity,
    wasAirborne,
    pattern: "cruise",
    elapsedMs: 0,
    totalDurationMs: duration,
    facing,
  });

  assert.strictEqual(reverseFrame0.trackPercent, prevTrack);
  assert.strictEqual(reverseFrame0.x, prevX);
  assert.strictEqual(reverseFrame0.y, prevY);
  assert.ok(Math.abs(reverseFrame0.y - prevY) < 0.01);
});

