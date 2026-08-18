/**
 * Pure calendar arithmetic.
 *
 * Nothing in this module touches Foundry globals: every function takes an
 * explicit calendar descriptor `{ monthsPerYear, daysPerMonth, weekdayNames }`
 * so the rules stay deterministic and unit testable.
 */

import { LIMITS, SCOPE } from "../constants.js";

/** Pad a year to the canonical four-digit form used in date keys. */
export function padYear(year) {
  return String(Math.trunc(year)).padStart(4, "0");
}

/** Pad a month or day to the canonical two-digit form used in date keys. */
export function pad2(value) {
  return String(Math.trunc(value)).padStart(2, "0");
}

/** Build the canonical `YYYY-MM-DD` key for a day note. */
export function dayKey(year, month, day) {
  return `${padYear(year)}-${pad2(month)}-${pad2(day)}`;
}

/** Build the canonical `YYYY-MM-00` key for a month note. */
export function monthKey(year, month) {
  return `${padYear(year)}-${pad2(month)}-00`;
}

/** Build the key appropriate for a scope. */
export function keyForScope(date, scope) {
  return scope === SCOPE.MONTH ? monthKey(date.year, date.month) : dayKey(date.year, date.month, date.day);
}

/**
 * Parse a canonical date key.
 * @returns {{year:number, month:number, day:number, scope:string}|null}
 */
export function parseKey(key) {
  if (typeof key !== "string") return null;
  const match = /^(\d{1,6})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return {
    year,
    month,
    day,
    scope: day === 0 ? SCOPE.MONTH : SCOPE.DAY
  };
}

/** Numeric ordering for two canonical date keys. Month keys sort before their days. */
export function compareDateKeys(a, b) {
  const pa = parseKey(a);
  const pb = parseKey(b);
  if (!pa && !pb) return 0;
  if (!pa) return 1;
  if (!pb) return -1;
  return (pa.year - pb.year) || (pa.month - pb.month) || (pa.day - pb.day);
}

/** True when `date` describes an in-range day for the given calendar. */
export function isValidDate(date, calendar) {
  if (!date || !calendar) return false;
  const { year, month, day } = date;
  if (![year, month, day].every(v => Number.isInteger(v))) return false;
  if (year < LIMITS.YEAR_MIN) return false;
  if (month < 1 || month > calendar.monthsPerYear) return false;
  if (day < 1 || day > calendar.daysPerMonth) return false;
  return true;
}

/** Clamp a possibly out-of-range date into the configured calendar bounds. */
export function clampDate(date, calendar) {
  const year = Math.max(LIMITS.YEAR_MIN, Math.trunc(Number(date?.year) || LIMITS.YEAR_MIN));
  const month = Math.min(Math.max(1, Math.trunc(Number(date?.month) || 1)), calendar.monthsPerYear);
  const day = Math.min(Math.max(1, Math.trunc(Number(date?.day) || 1)), calendar.daysPerMonth);
  return { year, month, day };
}

/** True when `time` is an exact minute within a 24-hour day. */
export function isValidTime(time) {
  if (!time) return false;
  const { hour, minute } = time;
  return Number.isInteger(hour) && Number.isInteger(minute)
    && hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

/** Clamp an arbitrary value to a 24-hour, minute-precision clock time. */
export function clampTime(time) {
  const hour = Math.min(Math.max(0, Math.trunc(Number(time?.hour) || 0)), 23);
  const minute = Math.min(Math.max(0, Math.trunc(Number(time?.minute) || 0)), 59);
  return { hour, minute };
}

/** Advance a date and minute-precision time by a whole number of seconds. */
export function addSeconds(date, time, seconds, calendar) {
  const start = (time.hour * 3600) + (time.minute * 60);
  const total = start + Math.trunc(seconds);
  const dayDelta = Math.floor(total / 86400);
  const secondOfDay = ((total % 86400) + 86400) % 86400;
  const targetDate = addDays(date, dayDelta, calendar);

  if (toAbsoluteDay(targetDate, calendar) === 0 && dayDelta < 0) {
    return { date: targetDate, time: { hour: 0, minute: 0 } };
  }

  return {
    date: targetDate,
    time: {
      hour: Math.floor(secondOfDay / 3600),
      minute: Math.floor((secondOfDay % 3600) / 60)
    }
  };
}

/** Seconds until 07:00 on the following calendar day. */
export function secondsUntilNextAdventureDay(time) {
  const current = (time.hour * 3600) + (time.minute * 60);
  return (86400 - current) + (7 * 3600);
}

/**
 * Convert a date to a zero-based absolute day index counted from Year 1, Month 1, Day 1.
 */
export function toAbsoluteDay(date, calendar) {
  const { monthsPerYear, daysPerMonth } = calendar;
  return ((date.year - 1) * monthsPerYear * daysPerMonth)
    + ((date.month - 1) * daysPerMonth)
    + (date.day - 1);
}

/** Inverse of {@link toAbsoluteDay}. Values below zero clamp to the first day. */
export function fromAbsoluteDay(absoluteDay, calendar) {
  const { monthsPerYear, daysPerMonth } = calendar;
  const perYear = monthsPerYear * daysPerMonth;
  const abs = Math.max(0, Math.trunc(absoluteDay));
  const year = Math.floor(abs / perYear) + 1;
  const remainder = abs % perYear;
  const month = Math.floor(remainder / daysPerMonth) + 1;
  const day = (remainder % daysPerMonth) + 1;
  return { year, month, day };
}

/**
 * Advance (or rewind, with a negative delta) a date by whole days.
 * The result is never earlier than Year 1, Month 1, Day 1.
 */
export function addDays(date, delta, calendar) {
  return fromAbsoluteDay(toAbsoluteDay(date, calendar) + Math.trunc(delta), calendar);
}

/** Advance (or rewind) by whole months, keeping the day number where possible. */
export function addMonths(date, delta, calendar) {
  const { monthsPerYear, daysPerMonth } = calendar;
  const totalMonths = ((date.year - 1) * monthsPerYear) + (date.month - 1) + Math.trunc(delta);
  const safeMonths = Math.max(0, totalMonths);
  const year = Math.floor(safeMonths / monthsPerYear) + 1;
  const month = (safeMonths % monthsPerYear) + 1;
  const day = Math.min(date.day, daysPerMonth);
  return { year, month, day };
}

/** Advance (or rewind) by whole years. */
export function addYears(date, delta, calendar) {
  const year = Math.max(LIMITS.YEAR_MIN, date.year + Math.trunc(delta));
  return { year, month: date.month, day: Math.min(date.day, calendar.daysPerMonth) };
}

/** Zero-based index into `weekdayNames` for a date. */
export function weekdayIndex(date, calendar) {
  const count = calendar.weekdayNames?.length || 1;
  return ((toAbsoluteDay(date, calendar) % count) + count) % count;
}

/** Display name of the weekday for a date. */
export function weekdayName(date, calendar) {
  return calendar.weekdayNames?.[weekdayIndex(date, calendar)] ?? "";
}

/** Display name of a month number (1-based). */
export function monthName(month, calendar) {
  return calendar.monthNames?.[month - 1] ?? String(month);
}

/** True when two dates describe the same day. */
export function isSameDay(a, b) {
  return !!a && !!b && a.year === b.year && a.month === b.month && a.day === b.day;
}

/** True when two dates fall in the same month of the same year. */
export function isSameMonth(a, b) {
  return !!a && !!b && a.year === b.year && a.month === b.month;
}

/**
 * Build the renderable month grid for a date, honouring the configured
 * weekday count. Leading blanks align day 1 under its weekday column.
 * @returns {{weeks: Array<Array<{day:number|null}>>, leading:number}}
 */
export function buildMonthGrid(year, month, calendar) {
  const weekdayCount = calendar.weekdayNames?.length || 1;
  const leading = weekdayIndex({ year, month, day: 1 }, calendar);
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push({ day: null });
  for (let d = 1; d <= calendar.daysPerMonth; d++) cells.push({ day: d });
  while (cells.length % weekdayCount !== 0) cells.push({ day: null });

  const weeks = [];
  for (let i = 0; i < cells.length; i += weekdayCount) weeks.push(cells.slice(i, i + weekdayCount));
  return { weeks, leading };
}
