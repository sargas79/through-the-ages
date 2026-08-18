import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SCHEMA_VERSION } from "../scripts/constants.js";
import {
  migrateCalendarData,
  migrateEvents,
  migrateNoteFlags,
  needsMigration,
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
