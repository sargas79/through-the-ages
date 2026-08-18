/**
 * Pure validation for calendar configuration, Ages and timeline events.
 *
 * Results are returned as localisation codes plus interpolation data so the
 * rules stay testable outside Foundry while the UI still renders localised text.
 * Codes resolve to `TTA.Validation.<code>` keys in `lang/en.json`.
 */

import { LIMITS, SCOPE, VISIBILITY } from "../constants.js";
import { endYear, findGaps, findOverlaps } from "./age-service.js";
import { isValidDate, parseKey } from "./date-service.js";

function issue(code, data = {}) {
  return { code, data };
}

function isIntegerInRange(value, min, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

function duplicates(list) {
  const seen = new Set();
  const dupes = new Set();
  for (const raw of list) {
    const key = String(raw ?? "").trim().toLowerCase();
    if (seen.has(key)) dupes.add(String(raw).trim());
    seen.add(key);
  }
  return [...dupes];
}

/**
 * Validate a full calendar payload.
 * @returns {{valid:boolean, errors:Array, warnings:Array}}
 */
export function validateCalendarData(data) {
  const errors = [];
  const warnings = [];
  const calendar = data?.calendar ?? {};

  if (!isIntegerInRange(calendar.monthsPerYear, LIMITS.MONTHS_MIN, LIMITS.MONTHS_MAX)) {
    errors.push(issue("monthsRange", { min: LIMITS.MONTHS_MIN, max: LIMITS.MONTHS_MAX }));
  }
  if (!isIntegerInRange(calendar.daysPerMonth, LIMITS.DAYS_MIN, LIMITS.DAYS_MAX)) {
    errors.push(issue("daysRange", { min: LIMITS.DAYS_MIN, max: LIMITS.DAYS_MAX }));
  }

  const monthNames = Array.isArray(calendar.monthNames) ? calendar.monthNames : [];
  const weekdayNames = Array.isArray(calendar.weekdayNames) ? calendar.weekdayNames : [];

  if (!isIntegerInRange(weekdayNames.length, LIMITS.WEEKDAYS_MIN, LIMITS.WEEKDAYS_MAX)) {
    errors.push(issue("weekdayRange", { min: LIMITS.WEEKDAYS_MIN, max: LIMITS.WEEKDAYS_MAX }));
  }
  if (monthNames.length !== Number(calendar.monthsPerYear)) {
    errors.push(issue("monthNameCount", { expected: calendar.monthsPerYear, actual: monthNames.length }));
  }
  if (monthNames.some(name => !String(name ?? "").trim())) errors.push(issue("monthNameEmpty"));
  if (weekdayNames.some(name => !String(name ?? "").trim())) errors.push(issue("weekdayNameEmpty"));

  const dupeMonths = duplicates(monthNames);
  if (dupeMonths.length) errors.push(issue("monthNameDuplicate", { names: dupeMonths.join(", ") }));
  const dupeWeekdays = duplicates(weekdayNames);
  if (dupeWeekdays.length) errors.push(issue("weekdayNameDuplicate", { names: dupeWeekdays.join(", ") }));

  const date = calendar.currentDate;
  if (!Number.isInteger(Number(date?.year)) || Number(date?.year) < LIMITS.YEAR_MIN) {
    errors.push(issue("yearMinimum", { min: LIMITS.YEAR_MIN }));
  } else if (!isValidDate(
    { year: Number(date.year), month: Number(date.month), day: Number(date.day) },
    { monthsPerYear: Number(calendar.monthsPerYear), daysPerMonth: Number(calendar.daysPerMonth) }
  )) {
    errors.push(issue("currentDateOutOfRange", {
      months: calendar.monthsPerYear,
      days: calendar.daysPerMonth
    }));
  }

  const ageResult = validateAges(data?.ages ?? []);
  errors.push(...ageResult.errors);
  warnings.push(...ageResult.warnings);

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate an Age list: bounds, names, overlaps, and gap warnings.
 * @returns {{valid:boolean, errors:Array, warnings:Array}}
 */
export function validateAges(ages = []) {
  const errors = [];
  const warnings = [];

  for (const age of ages) {
    if (!String(age?.name ?? "").trim()) errors.push(issue("ageNameEmpty"));
    if (!Number.isInteger(Number(age?.startYear)) || Number(age.startYear) < LIMITS.YEAR_MIN) {
      errors.push(issue("ageStartYear", { name: age?.name ?? "", min: LIMITS.YEAR_MIN }));
    }
    if (!Number.isInteger(Number(age?.durationYears)) || Number(age.durationYears) < LIMITS.AGE_DURATION_MIN) {
      errors.push(issue("ageDuration", { name: age?.name ?? "", min: LIMITS.AGE_DURATION_MIN }));
    }
  }

  const dupeNames = duplicates(ages.map(a => a?.name));
  if (dupeNames.length) errors.push(issue("ageNameDuplicate", { names: dupeNames.join(", ") }));

  for (const { a, b } of findOverlaps(ages)) {
    errors.push(issue("ageOverlap", {
      a: a.name, b: b.name,
      aRange: `${a.startYear}-${endYear(a)}`,
      bRange: `${b.startYear}-${endYear(b)}`
    }));
  }

  for (const gap of findGaps(ages)) {
    warnings.push(issue("ageGap", { from: gap.from, to: gap.to }));
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Compare a proposed calendar against the highest month/day numbers already in
 * use by stored notes and events, producing structural-change warnings.
 *
 * @param {object} proposed        proposed `calendar` block
 * @param {{maxMonth:number, maxDay:number, count:number}} usage
 * @param {object} [previous]      the currently stored `calendar` block
 */
export function structuralChangeWarnings(proposed, usage, previous = null) {
  const warnings = [];
  if (!usage || !usage.count) return warnings;

  if (Number(proposed.monthsPerYear) < Number(usage.maxMonth)) {
    warnings.push(issue("shrinkMonths", { months: proposed.monthsPerYear, used: usage.maxMonth, count: usage.count }));
  }
  if (Number(proposed.daysPerMonth) < Number(usage.maxDay)) {
    warnings.push(issue("shrinkDays", { days: proposed.daysPerMonth, used: usage.maxDay, count: usage.count }));
  }
  const previousWeekdays = previous?.weekdayNames?.length;
  if (previousWeekdays && previousWeekdays !== proposed.weekdayNames?.length) {
    warnings.push(issue("weekdayCountChanged", { from: previousWeekdays, to: proposed.weekdayNames.length }));
  }
  return warnings;
}

/** Validate a note payload before it is written to a journal page. */
export function validateNote(note, calendar) {
  const errors = [];
  if (!String(note?.title ?? "").trim()) errors.push(issue("noteTitleEmpty"));
  if (![SCOPE.DAY, SCOPE.MONTH].includes(note?.scope)) errors.push(issue("noteScopeInvalid"));
  if (!Object.values(VISIBILITY).includes(note?.visibility)) errors.push(issue("noteVisibilityInvalid"));

  const parsed = parseKey(note?.dateKey);
  if (!parsed) {
    errors.push(issue("dateKeyInvalid", { key: note?.dateKey ?? "" }));
  } else if (parsed.scope !== note?.scope) {
    errors.push(issue("dateKeyScopeMismatch", { key: note.dateKey, scope: note.scope }));
  } else if (calendar) {
    const probe = { year: parsed.year, month: parsed.month, day: parsed.scope === SCOPE.MONTH ? 1 : parsed.day };
    if (!isValidDate(probe, calendar)) errors.push(issue("dateKeyOutOfRange", { key: note.dateKey }));
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}

/** Validate a timeline event payload. */
export function validateEvent(event, calendar) {
  const errors = [];
  if (!String(event?.title ?? "").trim()) errors.push(issue("eventTitleEmpty"));
  if (![VISIBILITY.GM_ONLY, VISIBILITY.PLAYERS].includes(event?.visibility)) {
    errors.push(issue("eventVisibilityInvalid"));
  }

  const parsed = parseKey(event?.dateKey);
  if (!parsed || parsed.scope !== SCOPE.DAY) {
    errors.push(issue("eventDateInvalid", { key: event?.dateKey ?? "" }));
  } else if (calendar && !isValidDate(parsed, calendar)) {
    errors.push(issue("eventDateOutOfRange", { key: event.dateKey }));
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
