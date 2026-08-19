import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LIMITS, SCHEMA_VERSION } from "../scripts/constants.js";
import {
  migrateCalendarData,
  migrateEvents,
  migrateMoons,
  migrateNoteFlags,
  needsMigration,
  normalizeYearAffix,
  resizeMonthLengths,
  resizeNames
} from "../scripts/services/migration-service.js";

describe("needsMigration", () => {
  it("flags missing or outdated data", () => {
    assert.ok(needsMigration(undefined));
    assert.ok(needsMigration(null));
    assert.ok(needsMigration({}));
    assert.ok(needsMigration({ schemaVersion: SCHEMA_VERSION - 1 }));
  });

  it("leaves current data alone", () => {
    assert.ok(!needsMigration({ schemaVersion: SCHEMA_VERSION }));
  });
});

describe("resizeNames", () => {
  it("keeps existing names and pads from the defaults", () => {
    assert.deepEqual(resizeNames(["Keep"], 3, ["D1", "D2", "D3"], "Month"), ["Keep", "D2", "D3"]);
  });

  it("truncates when the count shrinks", () => {
    assert.deepEqual(resizeNames(["A", "B", "C"], 2, [], "Month"), ["A", "B"]);
  });

  it("falls back to numbered names when defaults run out", () => {
    assert.deepEqual(resizeNames([], 2, [], "Month"), ["Month 1", "Month 2"]);
  });

  it("replaces blank entries", () => {
    assert.deepEqual(resizeNames(["", "  "], 2, ["D1", "D2"], "Month"), ["D1", "D2"]);
  });
});

describe("migrateCalendarData", () => {
  it("produces a complete payload from nothing", () => {
    const result = migrateCalendarData(undefined);
    assert.equal(result.schemaVersion, SCHEMA_VERSION);
    assert.equal(result.calendar.monthNames.length, result.calendar.monthsPerYear);
    assert.ok(result.calendar.weekdayNames.length >= 1);
    assert.deepEqual(result.ages, []);
  });

  it("resizes the month name list to match the month count", () => {
    const result = migrateCalendarData({
      calendar: { monthsPerYear: 3, daysPerMonth: 10, monthNames: ["A", "B", "C", "D", "E"], weekdayNames: ["W"] }
    });
    assert.deepEqual(result.calendar.monthNames, ["A", "B", "C"]);
  });

  it("clamps the current date into the configured structure", () => {
    const result = migrateCalendarData({
      calendar: {
        monthsPerYear: 3,
        daysPerMonth: 10,
        monthNames: ["A", "B", "C"],
        weekdayNames: ["W"],
        currentDate: { year: 0, month: 40, day: 90 }
      }
    });
    assert.deepEqual(result.calendar.currentDate, { year: 1, month: 3, day: 10 });
  });

  it("migrates date-only calendars to midnight", () => {
    const result = migrateCalendarData({ calendar: { currentDate: { year: 2, month: 3, day: 4 } } });
    assert.deepEqual(result.calendar.currentTime, { hour: 0, minute: 0 });
  });

  it("clamps the current time into a 24-hour clock", () => {
    const result = migrateCalendarData({ calendar: { currentTime: { hour: 30, minute: -2 } } });
    assert.deepEqual(result.calendar.currentTime, { hour: 23, minute: 0 });
  });

  it("clamps out-of-range structural values instead of failing", () => {
    const result = migrateCalendarData({ calendar: { monthsPerYear: 999, daysPerMonth: -4 } });
    assert.ok(result.calendar.monthsPerYear <= 24);
    assert.ok(result.calendar.daysPerMonth >= 1);
  });

  it("normalises and renumbers Ages", () => {
    const result = migrateCalendarData({
      ages: [
        { id: "b", name: "Iron", startYear: 100, durationYears: 50, sortOrder: 9 },
        { id: "a", name: "Ash", startYear: 1, durationYears: 99, sortOrder: 2 }
      ]
    });
    assert.deepEqual(result.ages.map(age => age.id), ["a", "b"]);
    assert.deepEqual(result.ages.map(age => age.sortOrder), [0, 1]);
  });

  it("is idempotent", () => {
    const once = migrateCalendarData({
      calendar: { monthsPerYear: 4, daysPerMonth: 7, monthNames: ["A"], weekdayNames: ["W", "X"] },
      ages: [{ id: "a", name: "Ash", startYear: 3, durationYears: 4 }]
    });
    assert.deepEqual(migrateCalendarData(once), once);
    assert.deepEqual(migrateCalendarData(migrateCalendarData(once)), once);
  });
});

describe("migrateEvents", () => {
  it("returns an empty list for junk input", () => {
    assert.deepEqual(migrateEvents(undefined), []);
    assert.deepEqual(migrateEvents("nonsense"), []);
  });

  it("drops records without a usable date", () => {
    assert.equal(migrateEvents([{ id: "x", title: "No date" }]).length, 0);
  });

  it("fills defaults for partial records", () => {
    const [event] = migrateEvents([{ dateKey: "0002-01-01" }]);
    assert.equal(event.visibility, "gm-only");
    assert.equal(event.source.type, "manual");
    assert.ok(event.title);
    assert.ok(event.icon);
    assert.ok(event.color);
  });

  it("sorts chronologically", () => {
    const events = migrateEvents([
      { id: "late", dateKey: "0005-01-01", title: "Late" },
      { id: "early", dateKey: "0001-12-31", title: "Early" }
    ]);
    assert.deepEqual(events.map(e => e.id), ["early", "late"]);
  });

  it("preserves a promoted source reference", () => {
    const [event] = migrateEvents([{
      id: "p",
      dateKey: "0003-02-02",
      title: "Promoted",
      source: { type: "promoted", noteUuid: "JournalEntry.abc.JournalEntryPage.def" }
    }]);
    assert.equal(event.source.type, "promoted");
    assert.equal(event.source.noteUuid, "JournalEntry.abc.JournalEntryPage.def");
  });

  it("is idempotent", () => {
    const once = migrateEvents([{ id: "e", dateKey: "0003-02-02", title: "Event" }]);
    assert.deepEqual(migrateEvents(once), once);
  });
});

describe("migrateNoteFlags", () => {
  it("returns null when the date key is unusable", () => {
    assert.equal(migrateNoteFlags(undefined), null);
    assert.equal(migrateNoteFlags({ dateKey: "nope" }), null);
  });

  it("derives the scope from the key", () => {
    assert.equal(migrateNoteFlags({ dateKey: "0001-01-05" }).scope, "day");
    assert.equal(migrateNoteFlags({ dateKey: "0001-01-00" }).scope, "month");
  });

  it("defaults an unknown visibility to GM only", () => {
    assert.equal(migrateNoteFlags({ dateKey: "0001-01-05", visibility: "bogus" }).visibility, "gm-only");
  });

  it("preserves a valid visibility and the promotion link", () => {
    const flags = migrateNoteFlags({
      dateKey: "0001-01-05",
      visibility: "author-and-gm",
      timelineEventId: "abc123"
    });
    assert.equal(flags.visibility, "author-and-gm");
    assert.equal(flags.timelineEventId, "abc123");
  });

  it("is idempotent", () => {
    const once = migrateNoteFlags({ dateKey: "0001-01-05", authorId: "u1", authorName: "Wrenn" });
    assert.deepEqual(migrateNoteFlags(once), once);
  });
});

describe("migrateMoons", () => {
  it("returns an empty list for missing or unusable data", () => {
    assert.deepEqual(migrateMoons(undefined), []);
    assert.deepEqual(migrateMoons(null), []);
    assert.deepEqual(migrateMoons("nonsense"), []);
    assert.deepEqual(migrateMoons([null, 3, "x"]), []);
  });

  it("normalises entries and re-indexes the sort order", () => {
    const result = migrateMoons([
      { id: "b", name: "Beta", cycleLength: 30, sortOrder: 5 },
      { id: "a", name: "Alpha", cycleLength: 12, sortOrder: 1 }
    ]);
    assert.deepEqual(result.map(moon => moon.id), ["a", "b"]);
    assert.deepEqual(result.map(moon => moon.sortOrder), [0, 1]);
  });

  it("caps the list at the supported maximum", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `m${i}`, name: `Moon ${i}`, sortOrder: i }));
    assert.equal(migrateMoons(many).length, LIMITS.MOONS_MAX);
  });

  it("is idempotent", () => {
    const once = migrateMoons([{ id: "a", name: "Alpha", cycleLength: 28, offset: 3 }]);
    assert.deepEqual(migrateMoons(once), once);
  });
});

describe("migrateCalendarData moons", () => {
  it("defaults to no moons", () => {
    assert.deepEqual(migrateCalendarData(undefined).calendar.moons, []);
    assert.deepEqual(migrateCalendarData({ calendar: { monthsPerYear: 12 } }).calendar.moons, []);
  });

  it("preserves configured moons across a migration", () => {
    const data = migrateCalendarData({
      calendar: { moons: [{ id: "m1", name: "Selene", cycleLength: 28, offset: 4, phaseCount: 4 }] }
    });
    assert.equal(data.calendar.moons.length, 1);
    assert.equal(data.calendar.moons[0].name, "Selene");
    assert.equal(data.calendar.moons[0].offset, 4);
    assert.equal(data.calendar.moons[0].phaseCount, 4);
  });

  it("upgrades schema 2 data, which had no moons, without loss", () => {
    const legacy = {
      schemaVersion: 2,
      calendar: {
        monthsPerYear: 12,
        daysPerMonth: 30,
        monthNames: Array.from({ length: 12 }, (_, i) => `M${i + 1}`),
        weekdayNames: ["A", "B", "C", "D", "E", "F", "G"],
        currentDate: { year: 3, month: 4, day: 5 },
        currentTime: { hour: 8, minute: 15 }
      },
      ages: []
    };
    const migrated = migrateCalendarData(legacy);
    assert.deepEqual(migrated.calendar.moons, []);
    assert.deepEqual(migrated.calendar.currentDate, { year: 3, month: 4, day: 5 });
    assert.deepEqual(migrated.calendar.currentTime, { hour: 8, minute: 15 });
    assert.deepEqual(migrateCalendarData(migrated), migrated);
  });
});

describe("upgrading a pre-4 calendar", () => {
  /** Stored data as schema 3 wrote it: uniform months, no era labels. */
  const legacy = {
    schemaVersion: 3,
    calendar: {
      monthsPerYear: 4,
      daysPerMonth: 25,
      monthNames: ["A", "B", "C", "D"],
      weekdayNames: ["X", "Y"],
      currentDate: { year: 5, month: 3, day: 25 },
      currentTime: { hour: 1, minute: 2 },
      moons: []
    },
    ages: []
  };

  it("gives every month the old uniform length", () => {
    const migrated = migrateCalendarData(legacy);
    assert.deepEqual(migrated.calendar.monthLengths, [25, 25, 25, 25]);
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  });

  it("leaves the stored date exactly where it was", () => {
    assert.deepEqual(migrateCalendarData(legacy).calendar.currentDate, { year: 5, month: 3, day: 25 });
  });

  it("defaults the era labels and the weekday offset", () => {
    const { calendar } = migrateCalendarData(legacy);
    assert.equal(calendar.yearPrefix, "");
    assert.equal(calendar.yearSuffix, "");
    assert.equal(calendar.weekdayOffset, 0);
  });

  it("is idempotent", () => {
    const once = migrateCalendarData(legacy);
    assert.deepEqual(migrateCalendarData(once), once);
  });
});

describe("resizeMonthLengths", () => {
  it("keeps stored lengths and fills the rest from the uniform default", () => {
    assert.deepEqual(resizeMonthLengths([30, 1], 4, 28), [30, 1, 28, 28]);
  });

  it("truncates a list that is too long", () => {
    assert.deepEqual(resizeMonthLengths([30, 1, 30, 7], 2, 28), [30, 1]);
  });

  it("clamps unusable entries into range", () => {
    const lengths = resizeMonthLengths([0, -5, "x", 1000], 4, 28);
    assert.deepEqual(lengths, [LIMITS.DAYS_MIN, LIMITS.DAYS_MIN, 28, LIMITS.DAYS_MAX]);
  });
});

describe("month lengths in stored data", () => {
  it("clamps the current day to its own month", () => {
    const data = migrateCalendarData({
      calendar: {
        monthsPerYear: 3,
        daysPerMonth: 30,
        monthNames: ["A", "B", "C"],
        monthLengths: [30, 1, 30],
        currentDate: { year: 1, month: 2, day: 30 }
      }
    });
    assert.deepEqual(data.calendar.currentDate, { year: 1, month: 2, day: 1 });
  });

  it("resizes the length list along with the month count", () => {
    const data = migrateCalendarData({
      calendar: { monthsPerYear: 2, daysPerMonth: 20, monthLengths: [30, 1, 30, 7] }
    });
    assert.deepEqual(data.calendar.monthLengths, [30, 1]);
  });

  it("bounds the weekday offset by the weekday count", () => {
    const tooHigh = migrateCalendarData({
      calendar: { weekdayNames: ["A", "B", "C"], weekdayOffset: 9 }
    });
    assert.equal(tooHigh.calendar.weekdayOffset, 2);

    const negative = migrateCalendarData({
      calendar: { weekdayNames: ["A", "B", "C"], weekdayOffset: -4 }
    });
    assert.equal(negative.calendar.weekdayOffset, 0);
  });
});

describe("normalizeYearAffix", () => {
  it("trims and shortens era labels", () => {
    assert.equal(normalizeYearAffix("  DR  "), "DR");
    assert.equal(normalizeYearAffix(undefined), "");
    assert.equal(normalizeYearAffix("x".repeat(40)).length, LIMITS.YEAR_AFFIX_MAX);
  });
});
