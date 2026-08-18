/**
 * GM-only calendar configuration: months, days, weekday names, the starting
 * date, and the list of Ages.
 *
 * The window edits an in-memory draft so a GM can restructure the calendar and
 * review the consequences before anything is written. Structural changes that
 * could strand existing notes or events require an explicit confirmation.
 */

import { confirmDialog, log, randomID, t } from "../compat.js";
import {
  DEFAULT_COLOR,
  DEFAULT_MONTH_NAMES,
  DEFAULT_WEEKDAY_NAMES,
  LIMITS,
  MODULE_ID
} from "../constants.js";
import { endYear, sortAges } from "../services/age-service.js";
import { getData, saveData } from "../services/calendar-service.js";
import * as journal from "../services/journal-service.js";
import { migrateCalendarData, resizeNames } from "../services/migration-service.js";
import { canConfigureCalendar } from "../services/permission-service.js";
import * as timeline from "../services/timeline-service.js";
import { structuralChangeWarnings, validateCalendarData } from "../services/validation-service.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CalendarConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super({ ...options, id: "tta-calendar-config" });
    this.draft = migrateCalendarData(getData());
  }

  static DEFAULT_OPTIONS = {
    classes: ["tta", "tta-app", "tta-config"],
    tag: "form",
    window: {
      icon: "fa-solid fa-gears",
      title: "TTA.Config.Title",
      resizable: true
    },
    position: { width: 820, height: 760 },
    form: {
      handler: CalendarConfigApp.onSubmit,
      closeOnSubmit: false,
      submitOnChange: false
    },
    actions: {
      addAge: CalendarConfigApp.onAddAge,
      removeAge: CalendarConfigApp.onRemoveAge,
      moveAgeUp: CalendarConfigApp.onMoveAgeUp,
      moveAgeDown: CalendarConfigApp.onMoveAgeDown,
      resetNames: CalendarConfigApp.onResetNames,
      repairFolder: CalendarConfigApp.onRepairFolder
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/calendar-config.hbs`,
      scrollable: [".tta-config-body"]
    }
  };

  async _prepareContext() {
    const calendar = this.draft.calendar;
    const validation = validateCalendarData(this.draft);

    return {
      calendar,
      limits: LIMITS,
      weekdayCount: calendar.weekdayNames.length,
      monthNames: calendar.monthNames.map((name, index) => ({ index, number: index + 1, name })),
      weekdayNames: calendar.weekdayNames.map((name, index) => ({ index, number: index + 1, name })),
      monthChoices: calendar.monthNames.map((name, index) => ({
        value: index + 1,
        label: name,
        selected: index + 1 === calendar.currentDate.month
      })),
      ages: sortAges(this.draft.ages).map(age => ({
        ...age,
        endYear: endYear(age)
      })),
      hasAges: this.draft.ages.length > 0,
      errors: validation.errors.map(error => t(`TTA.Validation.${error.code}`, error.data)),
      warnings: validation.warnings.map(warning => t(`TTA.Validation.${warning.code}`, warning.data)),
      isValid: validation.valid,
      folderName: journal.getFolder()?.name ?? null
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    for (const input of this.element.querySelectorAll("[data-structure]")) {
      input.addEventListener("change", this.#onStructureChange.bind(this));
    }
  }

  /** Counts changed: capture the draft, resize the name lists, and re-render. */
  #onStructureChange() {
    this.#readForm();
    this.render();
  }

  /** Read the whole form back into the draft. */
  #readForm() {
    const root = this.element;
    if (!root) return this.draft;

    const number = (selector, fallback) => {
      const value = Number(root.querySelector(selector)?.value);
      return Number.isFinite(value) ? Math.trunc(value) : fallback;
    };

    const previous = this.draft.calendar;
    const monthsPerYear = Math.min(Math.max(number("[name='monthsPerYear']", previous.monthsPerYear), LIMITS.MONTHS_MIN), LIMITS.MONTHS_MAX);
    const daysPerMonth = Math.min(Math.max(number("[name='daysPerMonth']", previous.daysPerMonth), LIMITS.DAYS_MIN), LIMITS.DAYS_MAX);
    const weekdayCount = Math.min(Math.max(number("[name='weekdayCount']", previous.weekdayNames.length), LIMITS.WEEKDAYS_MIN), LIMITS.WEEKDAYS_MAX);

    const monthNames = [...root.querySelectorAll("[data-month-name]")].map(input => input.value);
    const weekdayNames = [...root.querySelectorAll("[data-weekday-name]")].map(input => input.value);

    const ages = [...root.querySelectorAll("[data-age-row]")].map((row, index) => ({
      id: row.dataset.ageId,
      name: row.querySelector("[data-field='name']")?.value ?? "",
      startYear: Number(row.querySelector("[data-field='startYear']")?.value) || LIMITS.YEAR_MIN,
      durationYears: Number(row.querySelector("[data-field='durationYears']")?.value) || LIMITS.AGE_DURATION_MIN,
      description: row.querySelector("[data-field='description']")?.value ?? "",
      color: row.querySelector("[data-field='color']")?.value || DEFAULT_COLOR,
      playerVisible: row.querySelector("[data-field='playerVisible']")?.checked ?? true,
      sortOrder: index
    }));

    this.draft = {
      ...this.draft,
      calendar: {
        monthsPerYear,
        daysPerMonth,
        monthNames: resizeNames(monthNames, monthsPerYear, DEFAULT_MONTH_NAMES, t("TTA.Config.MonthFallback")),
        weekdayNames: resizeNames(weekdayNames, weekdayCount, DEFAULT_WEEKDAY_NAMES, t("TTA.Config.WeekdayFallback")),
        currentDate: {
          year: Math.max(LIMITS.YEAR_MIN, number("[name='currentYear']", previous.currentDate.year)),
          month: Math.min(Math.max(1, number("[name='currentMonth']", previous.currentDate.month)), monthsPerYear),
          day: Math.min(Math.max(1, number("[name='currentDay']", previous.currentDate.day)), daysPerMonth)
        }
      },
      ages
    };
    return this.draft;
  }

  static async onAddAge() {
    this.#readForm();
    const last = sortAges(this.draft.ages).at(-1);
    const startYear = last ? endYear(last) + 1 : LIMITS.YEAR_MIN;
    this.draft.ages.push({
      id: randomID(),
      name: t("TTA.Config.NewAgeName"),
      startYear,
      durationYears: 100,
      description: "",
      color: DEFAULT_COLOR,
      playerVisible: true,
      sortOrder: this.draft.ages.length
    });
    this.render();
  }

  static async onRemoveAge(event, target) {
    this.#readForm();
    const id = target.closest("[data-age-row]")?.dataset.ageId;
    const age = this.draft.ages.find(a => a.id === id);
    if (!age) return;

    const eventCount = timeline.countEventsInAgeRange(age);
    const confirmed = await confirmDialog({
      title: t("TTA.Config.RemoveAgeTitle"),
      content: `<p>${t("TTA.Config.RemoveAgeBody", { name: age.name })}</p>`
        + (eventCount ? `<p class="notification warning">${t("TTA.Config.RemoveAgeEvents", { count: eventCount })}</p>` : "")
    });
    if (!confirmed) return;

    this.draft.ages = this.draft.ages.filter(a => a.id !== id);
    this.render();
  }

  static async onMoveAgeUp(event, target) {
    this.#moveAge(target, -1);
  }

  static async onMoveAgeDown(event, target) {
    this.#moveAge(target, 1);
  }

  #moveAge(target, delta) {
    this.#readForm();
    const id = target.closest("[data-age-row]")?.dataset.ageId;
    const ordered = sortAges(this.draft.ages);
    const index = ordered.findIndex(age => age.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    this.draft.ages = ordered.map((age, i) => ({ ...age, sortOrder: i }));
    this.render();
  }

  static async onResetNames() {
    this.#readForm();
    const { monthsPerYear, weekdayNames } = this.draft.calendar;
    this.draft.calendar.monthNames = resizeNames([], monthsPerYear, DEFAULT_MONTH_NAMES, t("TTA.Config.MonthFallback"));
    this.draft.calendar.weekdayNames = resizeNames([], weekdayNames.length, DEFAULT_WEEKDAY_NAMES, t("TTA.Config.WeekdayFallback"));
    this.render();
  }

  static async onRepairFolder() {
    const result = await journal.repairFolder();
    if (!result) {
      ui.notifications.warn(t("TTA.Errors.GMOnly"));
      return;
    }
    ui.notifications.info(t("TTA.Notifications.FolderRepaired", { count: result.repaired }));
    this.render();
  }

  /** Validate, warn about structural consequences, then persist. */
  static async onSubmit() {
    if (!canConfigureCalendar()) {
      ui.notifications.warn(t("TTA.Errors.GMOnly"));
      return;
    }
    this.#readForm();

    const validation = validateCalendarData(this.draft);
    if (!validation.valid) {
      ui.notifications.error(t("TTA.Errors.ConfigInvalid"));
      this.render();
      return;
    }

    const noteUsage = journal.getDateUsage();
    const eventUsage = timeline.getDateUsage();
    const usage = {
      maxMonth: Math.max(noteUsage.maxMonth, eventUsage.maxMonth),
      maxDay: Math.max(noteUsage.maxDay, eventUsage.maxDay),
      count: noteUsage.count + eventUsage.count
    };

    const stored = getData().calendar;
    const warnings = [
      ...structuralChangeWarnings(this.draft.calendar, usage, stored),
      ...validation.warnings
    ];

    if (warnings.length) {
      const list = warnings.map(warning => `<li>${t(`TTA.Validation.${warning.code}`, warning.data)}</li>`).join("");
      const confirmed = await confirmDialog({
        title: t("TTA.Config.ConfirmChangesTitle"),
        content: `<p>${t("TTA.Config.ConfirmChangesBody")}</p><ul>${list}</ul>`,
        yesLabel: t("TTA.Config.ApplyAnyway")
      });
      if (!confirmed) return;
    }

    try {
      await saveData(this.draft);
      await journal.ensureFolder();
      ui.notifications.info(t("TTA.Notifications.ConfigSaved"));
      this.render();
    } catch (error) {
      log("error", "Failed to save calendar configuration", error);
      ui.notifications.error(error.message ?? t("TTA.Errors.ConfigSaveFailed"));
    }
  }
}
