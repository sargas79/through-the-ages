import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  addMonths,
  addSeconds,
  addYears,
  buildMonthGrid,
  clampDate,
  compareDateKeys,
  dayKey,
  fromAbsoluteDay,
  isSameDay,
  isValidTime,
  isValidDate,
  keyForScope,
  monthKey,
  monthName,
  parseKey,
  toAbsoluteDay,
  secondsUntilNextAdventureDay,
  weekdayIndex,
  weekdayName
} from "../scripts/services/date-service.js";

/** A deliberately non-standard calendar: 10 months, 36 days, 3 weekdays. */
const CAL = {
  monthsPerYear: 10,
  daysPerMonth: 36,
  monthNames: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10"],
  weekdayNames: ["A", "B", "C"]
};

describe("date keys", () => {
  it("pads years to four digits and month/day to two", () => {
    assert.equal(dayKey(1, 1, 1), "0001-01-01");
    assert.equal(dayKey(142, 7, 12), "0142-07-12");
    assert.equal(monthKey(142, 7), "0142-07-00");
  });

  it("keeps years longer than four digits intact", () => {
    assert.equal(dayKey(12345, 1, 1), "12345-01-01");
  });

  it("round-trips through parseKey", () => {
    assert.deepEqual(parseKey("0142-07-12"), { year: 142, month: 7, day: 12, scope: "day" });
    assert.deepEqual(parseKey("0142-07-00"), { year: 142, month: 7, day: 0, scope: "month" });
  });

  it("rejects malformed keys", () => {
    for (const bad of ["", "nope", "142-7-12", "0142/07/12", null, undefined, 42]) {
      assert.equal(parseKey(bad), null);
    }
  });

  it("chooses the key that matches a scope", () => {
    const date = { year: 5, month: 3, day: 9 };
    assert.equal(keyForScope(date, "day"), "0005-03-09");
    assert.equal(keyForScope(date, "month"), "0005-03-00");
  });

  it("orders keys numerically, with month keys before their days", () => {
    const keys = ["0002-01-01", "0001-12-31", "0001-01-05", "0001-01-00"];
    keys.sort(compareDateKeys);
    assert.deepEqual(keys, ["0001-01-00", "0001-01-05", "0001-12-31", "0002-01-01"]);
  });

  it("orders large years correctly despite differing key widths", () => {
    assert.ok(compareDateKeys("9999-01-01", "10000-01-01") < 0);
  });
});

describe("absolute day conversion", () => {
  it("treats year 1 month 1 day 1 as day zero", () => {
    assert.equal(toAbsoluteDay({ year: 1, month: 1, day: 1 }, CAL), 0);
  });

  it("round-trips every date in the first two years", () => {
    for (let y = 1; y <= 2; y++) {
      for (let m = 1; m <= CAL.monthsPerYear; m++) {
        for (let d = 1; d <= CAL.daysPerMonth; d++) {
          const date = { year: y, month: m, day: d };
          assert.deepEqual(fromAbsoluteDay(toAbsoluteDay(date, CAL), CAL), date);
        }
      }
    }
  });

  it("clamps negative absolute days to the first day", () => {
    assert.deepEqual(fromAbsoluteDay(-10, CAL), { year: 1, month: 1, day: 1 });
  });
});

describe("time advancement", () => {
  it("rolls a day over into the next month", () => {
    assert.deepEqual(addDays({ year: 1, month: 1, day: 36 }, 1, CAL), { year: 1, month: 2, day: 1 });
  });

  it("rolls the final day of the final month into the next year", () => {
    assert.deepEqual(addDays({ year: 1, month: 10, day: 36 }, 1, CAL), { year: 2, month: 1, day: 1 });
  });

  it("rewinds across a year boundary to the final day of the previous year", () => {
    assert.deepEqual(addDays({ year: 2, month: 1, day: 1 }, -1, CAL), { year: 1, month: 10, day: 36 });
  });

  it("never moves earlier than year 1 month 1 day 1", () => {
    assert.deepEqual(addDays({ year: 1, month: 1, day: 1 }, -500, CAL), { year: 1, month: 1, day: 1 });
  });

  it("advances by whole months and years", () => {
    assert.deepEqual(addMonths({ year: 1, month: 10, day: 5 }, 1, CAL), { year: 2, month: 1, day: 5 });
    assert.deepEqual(addMonths({ year: 2, month: 1, day: 5 }, -1, CAL), { year: 1, month: 10, day: 5 });
    assert.deepEqual(addYears({ year: 3, month: 4, day: 5 }, -1, CAL), { year: 2, month: 4, day: 5 });
    assert.deepEqual(addYears({ year: 1, month: 4, day: 5 }, -5, CAL), { year: 1, month: 4, day: 5 });
  });

  it("advancing a large number of days matches repeated single steps", () => {
    let stepwise = { year: 1, month: 1, day: 1 };
    for (let i = 0; i < 400; i++) stepwise = addDays(stepwise, 1, CAL);
    assert.deepEqual(stepwise, addDays({ year: 1, month: 1, day: 1 }, 400, CAL));
  });
});

describe("clock arithmetic", () => {
  it("validates exact minute values", () => {
    assert.ok(isValidTime({ hour: 0, minute: 0 }));
    assert.ok(isValidTime({ hour: 23, minute: 59 }));
    assert.ok(!isValidTime({ hour: 24, minute: 0 }));
    assert.ok(!isValidTime({ hour: 12, minute: 60 }));
  });

  it("rolls time over into the next calendar day", () => {
    assert.deepEqual(
      addSeconds({ year: 1, month: 1, day: 36 }, { hour: 23, minute: 50 }, 600, CAL),
      { date: { year: 1, month: 2, day: 1 }, time: { hour: 0, minute: 0 } }
    );
  });

  it("clamps rewinding before the calendar origin to midnight", () => {
    assert.deepEqual(
      addSeconds({ year: 1, month: 1, day: 1 }, { hour: 0, minute: 5 }, -600, CAL),
      { date: { year: 1, month: 1, day: 1 }, time: { hour: 0, minute: 0 } }
    );
  });

  it("always targets 07:00 on the following day for an adventure day", () => {
    assert.equal(secondsUntilNextAdventureDay({ hour: 6, minute: 30 }), 88200);
    assert.equal(secondsUntilNextAdventureDay({ hour: 19, minute: 0 }), 43200);
  });
});

describe("weekdays", () => {
  it("cycles through the configured weekday names", () => {
    assert.equal(weekdayIndex({ year: 1, month: 1, day: 1 }, CAL), 0);
    assert.equal(weekdayName({ year: 1, month: 1, day: 1 }, CAL), "A");
    assert.equal(weekdayName({ year: 1, month: 1, day: 2 }, CAL), "B");
    assert.equal(weekdayName({ year: 1, month: 1, day: 4 }, CAL), "A");
  });

  it("handles a single-weekday calendar", () => {
    const single = { ...CAL, weekdayNames: ["Only"] };
    assert.equal(weekdayIndex({ year: 9, month: 4, day: 17 }, single), 0);
  });

  it("resolves month names and falls back to the number", () => {
    assert.equal(monthName(3, CAL), "M3");
    assert.equal(monthName(99, CAL), "99");
  });
});

describe("validation and clamping", () => {
  it("accepts in-range dates and rejects out-of-range ones", () => {
    assert.ok(isValidDate({ year: 1, month: 10, day: 36 }, CAL));
    assert.ok(!isValidDate({ year: 1, month: 11, day: 1 }, CAL));
    assert.ok(!isValidDate({ year: 1, month: 1, day: 37 }, CAL));
    assert.ok(!isValidDate({ year: 0, month: 1, day: 1 }, CAL));
    assert.ok(!isValidDate({ year: 1, month: 1, day: 1.5 }, CAL));
  });

  it("clamps out-of-range values into the configured bounds", () => {
    assert.deepEqual(clampDate({ year: 0, month: 99, day: 99 }, CAL), { year: 1, month: 10, day: 36 });
  });

  it("compares days", () => {
    assert.ok(isSameDay({ year: 1, month: 2, day: 3 }, { year: 1, month: 2, day: 3 }));
    assert.ok(!isSameDay({ year: 1, month: 2, day: 3 }, { year: 1, month: 2, day: 4 }));
  });
});

describe("month grid", () => {
  it("pads leading blanks so day 1 lands under its weekday", () => {
    // Year 1 month 2 day 1 is absolute day 36, which is weekday index 0 for a
    // 3-day week, so month 2 needs no leading blanks.
    const grid = buildMonthGrid(1, 2, CAL);
    assert.equal(grid.leading, 0);
    assert.equal(grid.weeks[0][0].day, 1);
  });

  it("produces complete rows of exactly weekday-count cells", () => {
    for (const weekdays of [1, 5, 7, 14]) {
      const calendar = { ...CAL, weekdayNames: Array.from({ length: weekdays }, (_, i) => `W${i}`) };
      const grid = buildMonthGrid(3, 4, calendar);
      for (const week of grid.weeks) assert.equal(week.length, weekdays);
      const days = grid.weeks.flat().filter(cell => cell.day !== null).length;
      assert.equal(days, calendar.daysPerMonth);
    }
  });

  it("renders every day exactly once and in order", () => {
    const days = buildMonthGrid(2, 5, CAL).weeks.flat()
      .filter(cell => cell.day !== null)
      .map(cell => cell.day);
    assert.deepEqual(days, Array.from({ length: CAL.daysPerMonth }, (_, i) => i + 1));
  });
});
