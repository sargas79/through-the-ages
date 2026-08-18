/**
 * Owns the single shared calendar: configuration, Ages, and the authoritative
 * campaign date. All writes are GM-only; reads are safe for every client.
 */

import { log, rerenderModuleApps, t } from "../compat.js";
import { MODULE_ID, SETTINGS } from "../constants.js";
import { findAgeForYear, visibleAges } from "./age-service.js";
import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  isValidDate,
  monthName,
  weekdayName
} from "./date-service.js";
import { migrateCalendarData, needsMigration } from "./migration-service.js";
import { canChangeTime, canConfigureCalendar, isGM } from "./permission-service.js";

/** The full stored payload, normalised through the migration service. */
export function getData() {
  const raw = game.settings.get(MODULE_ID, SETTINGS.CALENDAR_DATA);
  return migrateCalendarData(raw);
}

/** Just the calendar structure block. */
export function getCalendar() {
  return getData().calendar;
}

/** The shared current date. */
export function getCurrentDate() {
  return getCalendar().currentDate;
}

/** Every configured Age, ordered. */
export function getAges() {
  return getData().ages;
}

/** Ages the given user may see. */
export function getVisibleAges(user = game.user) {
  return visibleAges(getAges(), isGM(user));
}

/** The Age containing a year, or null. */
export function getAgeForYear(year) {
  return findAgeForYear(getAges(), year);
}

/** The Age containing the current campaign year, or null. */
export function getCurrentAge() {
  return getAgeForYear(getCurrentDate().year);
}

/** True once a GM has completed first-time setup. */
export function isConfigured() {
  return game.settings.get(MODULE_ID, SETTINGS.CONFIGURED) === true;
}

/** Persist the whole calendar payload. GM only. */
export async function saveData(data, { markConfigured = true } = {}) {
  if (!canConfigureCalendar()) {
    ui.notifications.warn(t("TTA.Errors.GMOnly"));
    return null;
  }
  const normalized = migrateCalendarData(data);
  await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_DATA, normalized);
  await game.settings.set(MODULE_ID, SETTINGS.SCHEMA_VERSION, normalized.schemaVersion);
  if (markConfigured) await game.settings.set(MODULE_ID, SETTINGS.CONFIGURED, true);
  log("debug", "Calendar data saved", normalized);
  return normalized;
}

/** Replace the Age list without touching the calendar structure. GM only. */
export async function saveAges(ages) {
  const data = getData();
  return saveData({ ...data, ages }, { markConfigured: isConfigured() });
}

/**
 * Set the shared campaign date. Out-of-range values are clamped.
 * @returns {object|null} the applied date, or null when the change was refused
 */
export async function setCurrentDate(date) {
  if (!canChangeTime()) {
    ui.notifications.warn(t("TTA.Errors.TimeGMOnly"));
    return null;
  }
  const data = getData();
  const calendar = data.calendar;
  const target = isValidDate(date, calendar) ? date : clampDate(date, calendar);
  if (!isValidDate(date, calendar)) log("warn", "Requested date was out of range and has been clamped", date, target);

  const updated = { ...data, calendar: { ...calendar, currentDate: target } };
  await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_DATA, updated);
  Hooks.callAll(`${MODULE_ID}.dateChanged`, target);
  return target;
}

/** Advance (or rewind) the campaign date by whole days. GM only. */
export async function advanceDays(delta) {
  const calendar = getCalendar();
  return setCurrentDate(addDays(calendar.currentDate, delta, calendar));
}

/** Advance (or rewind) the campaign date by whole months. GM only. */
export async function advanceMonths(delta) {
  const calendar = getCalendar();
  return setCurrentDate(addMonths(calendar.currentDate, delta, calendar));
}

/** Advance (or rewind) the campaign date by whole years. GM only. */
export async function advanceYears(delta) {
  const calendar = getCalendar();
  return setCurrentDate(addYears(calendar.currentDate, delta, calendar));
}

/** A human-readable date label using the configured month and weekday names. */
export function formatDate(date, { withWeekday = true } = {}) {
  const calendar = getCalendar();
  const month = monthName(date.month, calendar);
  const base = t("TTA.Format.Date", { day: date.day, month, year: date.year });
  if (!withWeekday) return base;
  return t("TTA.Format.DateWithWeekday", { weekday: weekdayName(date, calendar), date: base });
}

/** A human-readable month label. */
export function formatMonth(year, month) {
  return t("TTA.Format.Month", { month: monthName(month, getCalendar()), year });
}

/** Run the stored-data migration once, if needed. GM only; safe to call twice. */
export async function runMigrationIfNeeded() {
  if (!isGM()) return false;
  const raw = game.settings.get(MODULE_ID, SETTINGS.CALENDAR_DATA);
  if (!needsMigration(raw)) return false;
  const migrated = migrateCalendarData(raw);
  await game.settings.set(MODULE_ID, SETTINGS.CALENDAR_DATA, migrated);
  await game.settings.set(MODULE_ID, SETTINGS.SCHEMA_VERSION, migrated.schemaVersion);
  log("info", `Migrated calendar data to schema version ${migrated.schemaVersion}`);
  return true;
}

/** Setting change handler: keep every open module window in sync. */
export function onCalendarDataChanged() {
  rerenderModuleApps();
}
