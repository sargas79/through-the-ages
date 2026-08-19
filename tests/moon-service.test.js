import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_MOON_COLOR, LIMITS } from "../scripts/constants.js";
import {
  clampPhaseCount,
  daysUntilPhase,
  describePhase,
  illumination,
  isFullMoon,
  isNewMoon,
  isPhaseChange,
  isWaxing,
  clampCycleLength,
  normalizeMoon,
  offsetForPhaseOnDay,
  phaseFraction,
  phaseIndex,
  phaseKey,
  sortMoons,
  visibleMoons
} from "../scripts/services/moon-service.js";

/** A 28-day, 8-phase moon starting new on absolute day 0. */
const moon = normalizeMoon({ id: "m1", name: "Selene", cycleLength: 28, offset: 0 });

/** First absolute day on which `moon` reads as the given phase index. */
function changeDay(m, targetIndex) {
  return daysUntilPhase(m, 0, targetIndex);
}

describe("normalizeMoon", () => {
  it("fills defaults for an empty record", () => {
    const result = normalizeMoon({}, 0);
    assert.equal(result.cycleLength, LIMITS.MOON_CYCLE_MIN);
    assert.equal(result.offset, 0);
    assert.equal(result.phaseCount, 8);
    assert.equal(result.color, DEFAULT_MOON_COLOR);
    assert.equal(result.showInGrid, true);
    assert.equal(result.playerVisible, true);
    assert.ok(result.name);
  });

  it("clamps the cycle length into range", () => {
    assert.equal(normalizeMoon({ cycleLength: 1 }).cycleLength, LIMITS.MOON_CYCLE_MIN);
    assert.equal(normalizeMoon({ cycleLength: 99999 }).cycleLength, LIMITS.MOON_CYCLE_MAX);
  });

  it("wraps the offset into the cycle, including negative values", () => {
    assert.equal(normalizeMoon({ cycleLength: 28, offset: 30 }).offset, 2);
    assert.equal(normalizeMoon({ cycleLength: 28, offset: -1 }).offset, 27);
  });

  it("falls back to a supported phase count", () => {
    assert.equal(normalizeMoon({ phaseCount: 5 }).phaseCount, 8);
    assert.equal(normalizeMoon({ phaseCount: 4 }).phaseCount, 4);
  });

  it("is idempotent", () => {
    const once = normalizeMoon({ name: "A", cycleLength: 28, offset: 3 }, 0);
    assert.deepEqual(normalizeMoon(once, 0), once);
  });

  it("respects explicit false flags", () => {
    const result = normalizeMoon({ showInGrid: false, playerVisible: false });
    assert.equal(result.showInGrid, false);
    assert.equal(result.playerVisible, false);
  });
});

describe("clampPhaseCount", () => {
  it("accepts only the supported counts", () => {
    assert.equal(clampPhaseCount(2), 2);
    assert.equal(clampPhaseCount(4), 4);
    assert.equal(clampPhaseCount(8), 8);
    assert.equal(clampPhaseCount(3), 8);
    assert.equal(clampPhaseCount(undefined), 8);
  });
});

describe("phaseFraction", () => {
  it("starts at zero and wraps at the cycle length", () => {
    assert.equal(phaseFraction(moon, 0), 0);
    assert.equal(phaseFraction(moon, 14), 0.5);
    assert.equal(phaseFraction(moon, 28), 0);
  });

  it("handles days before the epoch", () => {
    assert.equal(phaseFraction(moon, -14), 0.5);
    assert.equal(phaseFraction(moon, -28), 0);
  });

  it("shifts with the offset", () => {
    const shifted = normalizeMoon({ cycleLength: 28, offset: 14 });
    assert.equal(phaseFraction(shifted, 14), 0);
    assert.equal(phaseFraction(shifted, 0), 0.5);
  });
});

describe("phaseIndex and phaseKey", () => {
  it("names the cardinal phases of an 8-phase moon", () => {
    assert.equal(phaseKey(moon, 0), "New");
    assert.equal(phaseKey(moon, 7), "FirstQuarter");
    assert.equal(phaseKey(moon, 14), "Full");
    assert.equal(phaseKey(moon, 21), "LastQuarter");
    assert.equal(phaseKey(moon, 28), "New");
  });

  it("centres phases so the nearest day wins", () => {
    // 3.5 days per phase: day 2 is still nearest to new, day 4 to the crescent.
    assert.equal(phaseIndex(moon, 1), 0);
    assert.equal(phaseIndex(moon, 4), 1);
  });

  it("never returns an index outside the phase count", () => {
    for (let day = -60; day <= 60; day++) {
      const index = phaseIndex(moon, day);
      assert.ok(index >= 0 && index < 8, `index ${index} out of range on day ${day}`);
    }
  });

  it("uses the reduced vocabulary for 4- and 2-phase moons", () => {
    const quarters = normalizeMoon({ cycleLength: 28, phaseCount: 4 });
    assert.deepEqual(
      [0, 7, 14, 21].map(day => phaseKey(quarters, day)),
      ["New", "FirstQuarter", "Full", "LastQuarter"]
    );
    const halves = normalizeMoon({ cycleLength: 28, phaseCount: 2 });
    assert.deepEqual([0, 14].map(day => phaseKey(halves, day)), ["New", "Full"]);
  });
});

describe("illumination", () => {
  it("runs from dark at new to fully lit at full", () => {
    assert.equal(illumination(moon, 0), 0);
    assert.ok(Math.abs(illumination(moon, 14) - 1) < 1e-9);
    assert.ok(Math.abs(illumination(moon, 7) - 0.5) < 1e-9);
  });

  it("is symmetric around the full moon", () => {
    for (let day = 1; day < 14; day++) {
      assert.ok(Math.abs(illumination(moon, 14 - day) - illumination(moon, 14 + day)) < 1e-9);
    }
  });

  it("stays within bounds for every day of the cycle", () => {
    for (let day = 0; day < 28; day++) {
      const lit = illumination(moon, day);
      assert.ok(lit >= 0 && lit <= 1);
    }
  });
});

describe("waxing, full and new helpers", () => {
  it("waxes through the first half of the cycle", () => {
    assert.ok(isWaxing(moon, 3));
    assert.ok(!isWaxing(moon, 20));
  });

  it("identifies the full and new days", () => {
    assert.ok(isNewMoon(moon, 0));
    assert.ok(isFullMoon(moon, 14));
    assert.ok(!isFullMoon(moon, 7));
  });
});

describe("daysUntilPhase", () => {
  it("returns zero when the phase is already active", () => {
    assert.equal(daysUntilPhase(moon, 14, 4), 0);
  });

  // Phases are centred on their midpoint, so each one covers a band of days
  // rather than a single day: on this 28-day, 8-phase moon "Full" runs from day
  // 13 to day 15 and "New" from day 27 to day 1. The count is to the first day
  // the moon reads as the target phase, which is what the grid already labels,
  // not to the exact midpoint.
  it("counts forward to the first day of the phase", () => {
    assert.equal(daysUntilPhase(moon, 0, 4), 13);
    assert.equal(daysUntilPhase(moon, 15, 0), 12);
  });

  it("agrees with the phase the day actually reads as", () => {
    for (const target of [0, 2, 4, 6]) {
      for (const start of [0, 5, 13, 27]) {
        const arrival = start + daysUntilPhase(moon, start, target);
        assert.equal(phaseIndex(moon, arrival), target);
      }
    }
  });

  it("wraps the target index", () => {
    assert.equal(daysUntilPhase(moon, 0, 8), 0);
  });
});

describe("isPhaseChange", () => {
  it("is true only on the first day of each named phase", () => {
    const changes = [];
    for (let day = 0; day < moon.cycleLength; day++) {
      if (isPhaseChange(moon, day)) changes.push(day);
    }
    assert.equal(changes.length, moon.phaseCount);
    for (const day of changes) {
      assert.notEqual(phaseIndex(moon, day), phaseIndex(moon, day - 1));
      assert.equal(phaseIndex(moon, day), phaseIndex(moon, day + 1));
    }
  });

  it("is reported by describePhase", () => {
    assert.equal(describePhase(moon, changeDay(moon, 4)).isPhaseChange, true);
    assert.equal(describePhase(moon, changeDay(moon, 4) + 1).isPhaseChange, false);
  });
});

describe("describePhase", () => {
  it("returns render-ready geometry", () => {
    const full = describePhase(moon, 14);
    assert.equal(full.phaseKey, "Full");
    assert.ok(full.gibbous);
    assert.ok(Math.abs(full.terminator - 1) < 1e-9);

    const quarter = describePhase(moon, 7);
    assert.ok(!quarter.gibbous);
    assert.ok(Math.abs(quarter.terminator) < 1e-9);
    assert.ok(quarter.waxing);
  });
});

describe("sortMoons and visibleMoons", () => {
  const moons = [
    normalizeMoon({ id: "b", name: "Beta", sortOrder: 1 }),
    normalizeMoon({ id: "a", name: "Alpha", sortOrder: 0, playerVisible: false })
  ];

  it("orders by sort order", () => {
    assert.deepEqual(sortMoons(moons).map(m => m.id), ["a", "b"]);
  });

  it("hides GM-only moons from players", () => {
    assert.deepEqual(visibleMoons(moons, false).map(m => m.id), ["b"]);
    assert.deepEqual(visibleMoons(moons, true).map(m => m.id), ["a", "b"]);
  });
});

describe("fractional cycle lengths", () => {
  it("keeps a decimal cycle instead of truncating it", () => {
    assert.equal(normalizeMoon({ name: "Selûne", cycleLength: 30.45 }).cycleLength, 30.45);
    assert.equal(normalizeMoon({ name: "Moon", cycleLength: 29.53059 }).cycleLength, 29.5306);
  });

  it("still bounds the cycle", () => {
    assert.equal(clampCycleLength(0.5), LIMITS.MOON_CYCLE_MIN);
    assert.equal(clampCycleLength(99999), LIMITS.MOON_CYCLE_MAX);
    assert.equal(clampCycleLength("nonsense"), LIMITS.MOON_CYCLE_MIN);
  });

  it("drifts against a whole-day calendar as a real moon does", () => {
    const selune = normalizeMoon({ name: "Selûne", cycleLength: 30.45, offset: 0 });
    // A 30.45 day cycle cannot repeat on a 30 day rhythm: after ten cycles the
    // moon is several days adrift of where a whole-day cycle would place it.
    assert.notEqual(phaseIndex(selune, 0), phaseIndex(selune, 300));
  });

  it("bounds the offset by whole days of the cycle", () => {
    assert.ok(normalizeMoon({ name: "M", cycleLength: 29.53, offset: 40 }).offset < 30);
  });
});

describe("offsetForPhaseOnDay", () => {
  it("finds the offset that makes a moon full on a chosen day", () => {
    for (const cycleLength of [28, 29.5306, 30.45, 34, 91, 125]) {
      const shape = { cycleLength, phaseCount: 8 };
      const offset = offsetForPhaseOnDay(shape, 500, 4);
      assert.equal(phaseKey({ ...shape, offset }, 500), "Full", `cycle ${cycleLength}`);
    }
  });

  it("finds the offset that makes a moon new on a chosen day", () => {
    const shape = { cycleLength: 34, phaseCount: 8 };
    const offset = offsetForPhaseOnDay(shape, 77, 0);
    assert.equal(phaseKey({ ...shape, offset }, 77), "New");
  });

  it("returns an offset the validator will accept", () => {
    const shape = { cycleLength: 29.5306, phaseCount: 8 };
    const offset = offsetForPhaseOnDay(shape, 12345, 4);
    assert.ok(Number.isInteger(offset));
    assert.ok(offset >= 0 && offset < Math.ceil(shape.cycleLength));
  });

  it("wraps a phase index beyond the named set", () => {
    const shape = { cycleLength: 28, phaseCount: 8 };
    assert.equal(offsetForPhaseOnDay(shape, 100, 12), offsetForPhaseOnDay(shape, 100, 4));
  });
});
