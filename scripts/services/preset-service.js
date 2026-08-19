/**
 * Turns a bundled setting preset into calendar data this module can store.
 *
 * The presets describe their moons and weekdays by anchor — "Selûne is full on
 * Midsummer", "1 Abadius 4710 is a Fireday" — because that is the fact a GM can
 * check against a sourcebook. Everything here resolves those anchors into the
 * stored offsets, then runs the result through the ordinary migration so a
 * preset is normalised exactly like hand-entered or imported data.
 *
 * Identifiers are derived from the preset id rather than randomly generated, so
 * loading the same preset twice produces the same records, and nothing in this
 * file touches Foundry globals.
 */

import { DEFAULT_COLOR, VISIBILITY } from "../constants.js";
import { CALENDAR_PRESETS, PRESET_IDS } from "../data/presets/index.js";
import { dayKey, toAbsoluteDay, weekdayIndex } from "./date-service.js";
import { migrateCalendarData } from "./migration-service.js";
import { clampPhaseCount, offsetForPhaseOnDay } from "./moon-service.js";

export { PRESET_IDS };

/** The raw preset definition, or null when the id is unknown. */
export function getPreset(id) {
  return CALENDAR_PRESETS.find(preset => preset.id === id) ?? null;
}

/** Localisation keys for a preset's picker entry and caveat list. */
export function presetKeys(id) {
  return {
    label: `TTA.Presets.${id}.Label`,
    description: `TTA.Presets.${id}.Description`,
    caveats: `TTA.Presets.${id}.Caveats`
  };
}

/**
 * The weekday offset that makes a preset's anchor date fall on its canon
 * weekday. Without an anchor the week simply starts on its first named day.
 */
export function resolveWeekdayOffset(calendar) {
  const anchor = calendar.weekdayAnchor;
  const count = calendar.weekdayNames?.length || 1;
  if (!anchor) return 0;
  const bare = weekdayIndex(anchor.date, { ...calendar, weekdayOffset: 0 });
  return (((Math.trunc(Number(anchor.weekday)) - bare) % count) + count) % count;
}

/** The cycle offset that puts a moon in its anchored phase on the anchor date. */
export function resolveMoonOffset(moon, calendar) {
  const anchor = moon.anchor;
  if (!anchor) return 0;
  const target = anchor.phase === "full" ? clampPhaseCount(moon.phaseCount) / 2 : 0;
  return offsetForPhaseOnDay(moon, toAbsoluteDay(anchor.date, calendar), target);
}

/**
 * Build the storable `{ calendar, ages }` payload for a preset.
 * @returns {object|null} normalised data, or null when the id is unknown
 */
export function buildPresetData(id) {
  const preset = getPreset(id);
  if (!preset) return null;

  const source = preset.calendar;
  const moons = (source.moons ?? []).map((moon, index) => ({
    id: `${preset.id}-moon-${index}`,
    name: moon.name,
    cycleLength: moon.cycleLength,
    offset: resolveMoonOffset(moon, source),
    phaseCount: moon.phaseCount,
    color: moon.color,
    showInGrid: moon.showInGrid !== false,
    playerVisible: moon.playerVisible !== false,
    sortOrder: index
  }));

  const ages = (preset.ages ?? []).map((age, index) => ({
    id: `${preset.id}-age-${index}`,
    name: age.name,
    startYear: age.startYear,
    durationYears: age.durationYears,
    description: age.description ?? "",
    color: age.color || DEFAULT_COLOR,
    playerVisible: age.playerVisible !== false,
    sortOrder: index
  }));

  return migrateCalendarData({
    calendar: {
      monthsPerYear: source.monthsPerYear,
      daysPerMonth: source.daysPerMonth,
      monthNames: [...source.monthNames],
      monthLengths: [...source.monthLengths],
      weekdayNames: [...source.weekdayNames],
      weekdayOffset: resolveWeekdayOffset(source),
      currentDate: { ...source.currentDate },
      currentTime: { ...source.currentTime },
      yearPrefix: source.yearPrefix ?? "",
      yearSuffix: source.yearSuffix ?? "",
      moons
    },
    ages
  });
}

/**
 * The holiday notes a preset ships, dated into its starting year.
 *
 * A holiday spanning several days becomes one note on its first day: the module
 * has no repeating or multi-day notes, and the text already says how long the
 * festival runs.
 *
 * @returns {Array<{dateKey:string, title:string, content:string, visibility:string}>}
 */
export function buildPresetHolidays(id) {
  const preset = getPreset(id);
  if (!preset) return [];
  const year = preset.calendar.currentDate.year;
  return (preset.holidays ?? []).map(holiday => ({
    dateKey: dayKey(year, holiday.month, holiday.day),
    title: holiday.title,
    content: holiday.content ?? "",
    visibility: VISIBILITY.PLAYERS
  }));
}

/** How many holiday notes a preset would create. */
export function presetHolidayCount(id) {
  return getPreset(id)?.holidays?.length ?? 0;
}
