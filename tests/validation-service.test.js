import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  structuralChangeWarnings,
  validateAges,
  validateCalendarData,
  validateEvent,
  validateNote
} from "../scripts/services/validation-service.js";

const CALENDAR = { monthsPerYear: 10, daysPerMonth: 36 };

function validData(overrides = {}) {
  return {
    schemaVersion: 1,
    calendar: {
      monthsPerYear: 3,
      daysPerMonth: 10,
      monthNames: ["One", "Two", "Three"],
      weekdayNames: ["A", "B"],
      currentDate: { year: 1, month: 1, day: 1 },
      ...overrides.calendar
    },
    ages: overrides.ages ?? []
  };
}

function codes(result) {
  return result.errors.map(error => error.code);
}

describe("calendar configuration", () => {
  it("accepts a well-formed calendar", () => {
    const result = validateCalendarData(validData());
    assert.ok(result.valid, JSON.stringify(result.errors));
  });

  it("rejects out-of-range month and day counts", () => {
    assert.ok(codes(validateCalendarData(validData({ calendar: { monthsPerYear: 0 } }))).includes("monthsRange"));
    assert.ok(codes(validateCalendarData(validData({ calendar: { monthsPerYear: 99 } }))).includes("monthsRange"));
    assert.ok(codes(validateCalendarData(validData({ calendar: { daysPerMonth: 0 } }))).includes("daysRange"));
    assert.ok(codes(validateCalendarData(validData({ calendar: { daysPerMonth: 500 } }))).includes("daysRange"));
  });

  it("requires one name per month", () => {
    const data = validData();
    data.calendar.monthNames = ["One", "Two"];
    assert.ok(codes(validateCalendarData(data)).includes("monthNameCount"));
  });

  it("rejects blank and duplicate names", () => {
    const blank = validData();
    blank.calendar.monthNames = ["One", "  ", "Three"];
    assert.ok(codes(validateCalendarData(blank)).includes("monthNameEmpty"));

    const duped = validData();
    duped.calendar.weekdayNames = ["A", "a"];
    assert.ok(codes(validateCalendarData(duped)).includes("weekdayNameDuplicate"));
  });

  it("rejects a weekday count outside the supported range", () => {
    const data = validData();
    data.calendar.weekdayNames = Array.from({ length: 20 }, (_, i) => `W${i}`);
    assert.ok(codes(validateCalendarData(data)).includes("weekdayRange"));
  });

  it("rejects a current date that does not fit the structure", () => {
    const data = validData();
    data.calendar.currentDate = { year: 1, month: 4, day: 1 };
    assert.ok(codes(validateCalendarData(data)).includes("currentDateOutOfRange"));
  });

  it("rejects a year below one", () => {
    const data = validData();
    data.calendar.currentDate = { year: 0, month: 1, day: 1 };
    assert.ok(codes(validateCalendarData(data)).includes("yearMinimum"));
  });
});

describe("Age validation", () => {
  it("blocks overlapping Ages", () => {
    const result = validateAges([
      { name: "Ash", startYear: 1, durationYears: 100 },
      { name: "Iron", startYear: 50, durationYears: 100 }
    ]);
    assert.ok(!result.valid);
    assert.ok(codes(result).includes("ageOverlap"));
  });

  it("warns but does not fail on a gap", () => {
    const result = validateAges([
      { name: "Ash", startYear: 1, durationYears: 10 },
      { name: "Iron", startYear: 30, durationYears: 10 }
    ]);
    assert.ok(result.valid);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].code, "ageGap");
  });

  it("requires names, start years and durations", () => {
    const result = validateAges([{ name: "", startYear: 0, durationYears: 0 }]);
    const found = codes(result);
    assert.ok(found.includes("ageNameEmpty"));
    assert.ok(found.includes("ageStartYear"));
    assert.ok(found.includes("ageDuration"));
  });

  it("rejects duplicate Age names", () => {
    const result = validateAges([
      { name: "Ash", startYear: 1, durationYears: 10 },
      { name: "ash", startYear: 11, durationYears: 10 }
    ]);
    assert.ok(codes(result).includes("ageNameDuplicate"));
  });
});

describe("structural change warnings", () => {
  const usage = { maxMonth: 9, maxDay: 30, count: 12 };

  it("stays silent when nothing is stored", () => {
    assert.deepEqual(structuralChangeWarnings({ monthsPerYear: 1, daysPerMonth: 1 }, { maxMonth: 0, maxDay: 0, count: 0 }), []);
  });

  it("warns when the calendar shrinks below stored content", () => {
    const warnings = structuralChangeWarnings({ monthsPerYear: 5, daysPerMonth: 20, weekdayNames: ["A"] }, usage);
    const found = warnings.map(w => w.code);
    assert.ok(found.includes("shrinkMonths"));
    assert.ok(found.includes("shrinkDays"));
  });

  it("stays silent when the calendar grows", () => {
    const warnings = structuralChangeWarnings({ monthsPerYear: 12, daysPerMonth: 40, weekdayNames: ["A"] }, usage, { weekdayNames: ["A"] });
    assert.deepEqual(warnings.map(w => w.code), []);
  });

  it("warns when the weekday count changes", () => {
    const warnings = structuralChangeWarnings(
      { monthsPerYear: 12, daysPerMonth: 40, weekdayNames: ["A", "B"] },
      usage,
      { weekdayNames: ["A"] }
    );
    assert.ok(warnings.map(w => w.code).includes("weekdayCountChanged"));
  });
});

describe("note validation", () => {
  it("accepts a well-formed day note", () => {
    const result = validateNote({
      title: "Caravan arrives",
      scope: "day",
      visibility: "author-and-gm",
      dateKey: "0004-02-11"
    }, CALENDAR);
    assert.ok(result.valid, JSON.stringify(result.errors));
  });

  it("rejects a missing title and unknown visibility", () => {
    const found = codes(validateNote({ title: "  ", scope: "day", visibility: "nope", dateKey: "0004-02-11" }, CALENDAR));
    assert.ok(found.includes("noteTitleEmpty"));
    assert.ok(found.includes("noteVisibilityInvalid"));
  });

  it("rejects a key whose scope does not match", () => {
    const found = codes(validateNote({ title: "x", scope: "day", visibility: "gm-only", dateKey: "0004-02-00" }, CALENDAR));
    assert.ok(found.includes("dateKeyScopeMismatch"));
  });

  it("rejects a date outside the configured calendar", () => {
    const found = codes(validateNote({ title: "x", scope: "day", visibility: "gm-only", dateKey: "0004-11-01" }, CALENDAR));
    assert.ok(found.includes("dateKeyOutOfRange"));
  });

  it("accepts a month note using the day placeholder", () => {
    const result = validateNote({ title: "x", scope: "month", visibility: "gm-only", dateKey: "0004-02-00" }, CALENDAR);
    assert.ok(result.valid, JSON.stringify(result.errors));
  });
});

describe("event validation", () => {
  it("accepts a well-formed event", () => {
    const result = validateEvent({ title: "Treaty", visibility: "players", dateKey: "0004-02-11" }, CALENDAR);
    assert.ok(result.valid, JSON.stringify(result.errors));
  });

  it("requires an exact day, not a month", () => {
    assert.ok(codes(validateEvent({ title: "x", visibility: "players", dateKey: "0004-02-00" }, CALENDAR)).includes("eventDateInvalid"));
  });

  it("rejects author-and-gm visibility for events", () => {
    assert.ok(codes(validateEvent({ title: "x", visibility: "author-and-gm", dateKey: "0004-02-11" }, CALENDAR)).includes("eventVisibilityInvalid"));
  });

  it("rejects a date outside the calendar", () => {
    assert.ok(codes(validateEvent({ title: "x", visibility: "players", dateKey: "0004-02-99" }, CALENDAR)).includes("eventDateOutOfRange"));
  });
});
