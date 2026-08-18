/**
 * The main calendar window: the single entry point reached from the Calendar
 * scene control.
 *
 * Browsing state (viewed month, selected day, active filter) is local to each
 * client. Only the GM time controls change the shared campaign date.
 */

import { confirmDialog, enrichHTML, isDebug, log, promptForm, t } from "../compat.js";
import { MODULE_ID, SCOPE } from "../constants.js";
import { endYear } from "../services/age-service.js";
import {
  advanceDays,
  formatDate,
  formatMonth,
  getAgeForYear,
  getCalendar,
  getCurrentAge,
  getCurrentDate,
  isConfigured,
  setCurrentDate
} from "../services/calendar-service.js";
import {
  addMonths,
  addYears,
  buildMonthGrid,
  dayKey,
  isSameDay,
  isSameMonth,
  monthKey,
  monthName,
  weekdayName
} from "../services/date-service.js";
import {
  deleteNote,
  filterNotes,
  getFilterChoices,
  getMonthNoteCounts,
  getNotesForKey
} from "../services/note-service.js";
import {
  allowedNoteScopes,
  canChangeTime,
  canConfigureCalendar,
  canPromoteNotes,
  canViewTimeline,
  isGM
} from "../services/permission-service.js";
import {
  getEventsForDay,
  getEventsForMonth,
  getMonthEventCounts
} from "../services/timeline-service.js";
import { CalendarConfigApp } from "./calendar-config-app.js";
import { EventEditorApp } from "./event-editor-app.js";
import { NoteEditorApp } from "./note-editor-app.js";
import { TimelineApp } from "./timeline-app.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CalendarApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super({ ...options, id: "tta-calendar" });
    const current = getCurrentDate();
    this.viewYear = current.year;
    this.viewMonth = current.month;
    this.selectedDay = current.day;
    this.filter = "all";
  }

  static DEFAULT_OPTIONS = {
    classes: ["tta", "tta-app", "tta-calendar"],
    tag: "div",
    window: {
      icon: "fa-solid fa-calendar-days",
      title: "TTA.Calendar.Title",
      resizable: true
    },
    position: { width: 980, height: 720 },
    actions: {
      prevMonth: CalendarApp.onPrevMonth,
      nextMonth: CalendarApp.onNextMonth,
      prevYear: CalendarApp.onPrevYear,
      nextYear: CalendarApp.onNextYear,
      gotoCurrent: CalendarApp.onGotoCurrent,
      selectDay: CalendarApp.onSelectDay,
      prevDay: CalendarApp.onPrevDay,
      nextDay: CalendarApp.onNextDay,
      advanceDays: CalendarApp.onAdvanceDays,
      setDate: CalendarApp.onSetDate,
      openConfig: CalendarApp.onOpenConfig,
      openTimeline: CalendarApp.onOpenTimeline,
      addDayNote: CalendarApp.onAddDayNote,
      addMonthNote: CalendarApp.onAddMonthNote,
      editNote: CalendarApp.onEditNote,
      deleteNote: CalendarApp.onDeleteNote,
      promoteNote: CalendarApp.onPromoteNote,
      openJournal: CalendarApp.onOpenJournal
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/calendar.hbs`,
      scrollable: [".tta-grid-wrap", ".tta-detail"]
    }
  };

  get title() {
    return t("TTA.Calendar.Title");
  }

  /** The date currently selected for the detail panel. */
  get selectedDate() {
    return { year: this.viewYear, month: this.viewMonth, day: this.selectedDay };
  }

  async _prepareContext() {
    const calendar = getCalendar();
    const current = getCurrentDate();
    const gm = isGM();

    // Keep browsing state inside the configured bounds after a reconfiguration.
    this.viewMonth = Math.min(Math.max(1, this.viewMonth), calendar.monthsPerYear);
    this.selectedDay = Math.min(Math.max(1, this.selectedDay), calendar.daysPerMonth);

    const grid = buildMonthGrid(this.viewYear, this.viewMonth, calendar);
    const noteCounts = getMonthNoteCounts(this.viewYear, this.viewMonth);
    const eventCounts = getMonthEventCounts(this.viewYear, this.viewMonth);

    const weeks = grid.weeks.map(week => week.map(cell => {
      if (cell.day === null) return { empty: true };
      const date = { year: this.viewYear, month: this.viewMonth, day: cell.day };
      const notes = noteCounts[cell.day] ?? 0;
      const events = eventCounts[cell.day] ?? 0;
      return {
        empty: false,
        day: cell.day,
        dateKey: dayKey(date.year, date.month, date.day),
        weekday: weekdayName(date, calendar),
        isCurrent: isSameDay(date, current),
        isSelected: cell.day === this.selectedDay,
        noteCount: notes,
        eventCount: events,
        hasNotes: notes > 0,
        hasEvents: events > 0,
        label: t("TTA.Calendar.DayCellLabel", {
          day: cell.day,
          month: monthName(this.viewMonth, calendar),
          year: this.viewYear,
          notes,
          events
        })
      };
    }));

    const selectedKey = dayKey(this.viewYear, this.viewMonth, this.selectedDay);
    const monthNoteKey = monthKey(this.viewYear, this.viewMonth);

    const dayNotes = await this.#decorate(filterNotes(getNotesForKey(selectedKey), this.filter));
    const monthNotes = await this.#decorate(filterNotes(getNotesForKey(monthNoteKey), this.filter));

    const dayEvents = getEventsForDay(this.viewYear, this.viewMonth, this.selectedDay);
    const monthEvents = getEventsForMonth(this.viewYear, this.viewMonth);
    const viewAge = getAgeForYear(this.viewYear);
    const currentAge = getCurrentAge();
    const scopes = allowedNoteScopes();

    return {
      isGM: gm,
      configured: isConfigured(),
      calendar,
      weekdayNames: calendar.weekdayNames,
      weeks,
      viewYear: this.viewYear,
      viewMonth: this.viewMonth,
      viewMonthName: monthName(this.viewMonth, calendar),
      viewLabel: formatMonth(this.viewYear, this.viewMonth),
      viewingCurrentMonth: isSameMonth({ year: this.viewYear, month: this.viewMonth }, current),
      currentDate: current,
      currentDateLabel: formatDate(current),
      currentAge: currentAge ? { ...currentAge, endYear: endYear(currentAge) } : null,
      viewAge: viewAge ? { ...viewAge, endYear: endYear(viewAge) } : null,
      selectedDay: this.selectedDay,
      selectedKey,
      selectedLabel: formatDate(this.selectedDate),
      monthNoteKey,
      dayNotes,
      monthNotes,
      dayEvents,
      monthEvents,
      hasDayContent: dayNotes.length > 0 || dayEvents.length > 0,
      canChangeTime: canChangeTime(),
      canConfigure: canConfigureCalendar(),
      canPromote: canPromoteNotes(),
      canViewTimeline: canViewTimeline(),
      canAddDayNote: scopes.includes(SCOPE.DAY),
      canAddMonthNote: scopes.includes(SCOPE.MONTH),
      showFilters: gm,
      filter: this.filter,
      filterChoices: getFilterChoices().map(choice => ({ ...choice, selected: choice.value === this.filter })),
      moduleVersion: isDebug() ? (game.modules.get(MODULE_ID)?.version ?? "") : ""
    };
  }

  /** Enrich note bodies only for the notes actually rendered in the panel. */
  async #decorate(notes) {
    return Promise.all(notes.map(async note => ({
      ...note,
      enriched: await enrichHTML(note.content)
    })));
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const filter = this.element.querySelector("[data-filter-select]");
    filter?.addEventListener("change", event => {
      this.filter = event.currentTarget.value;
      this.render();
    });
  }

  /** Move the browsing view without touching world time. */
  #browse(date) {
    this.viewYear = date.year;
    this.viewMonth = date.month;
    this.render();
  }

  static onPrevMonth() {
    this.#browse(addMonths({ year: this.viewYear, month: this.viewMonth, day: 1 }, -1, getCalendar()));
  }

  static onNextMonth() {
    this.#browse(addMonths({ year: this.viewYear, month: this.viewMonth, day: 1 }, 1, getCalendar()));
  }

  static onPrevYear() {
    this.#browse(addYears({ year: this.viewYear, month: this.viewMonth, day: 1 }, -1, getCalendar()));
  }

  static onNextYear() {
    this.#browse(addYears({ year: this.viewYear, month: this.viewMonth, day: 1 }, 1, getCalendar()));
  }

  static onGotoCurrent() {
    const current = getCurrentDate();
    this.viewYear = current.year;
    this.viewMonth = current.month;
    this.selectedDay = current.day;
    this.render();
  }

  static onSelectDay(event, target) {
    const day = Number(target.dataset.day);
    if (!Number.isInteger(day)) return;
    this.selectedDay = day;
    this.render();
  }

  static async onPrevDay() {
    await advanceDays(-1);
    CalendarApp.onGotoCurrent.call(this);
  }

  static async onNextDay() {
    await advanceDays(1);
    CalendarApp.onGotoCurrent.call(this);
  }

  static async onAdvanceDays() {
    const result = await promptForm({
      title: t("TTA.Time.AdvanceTitle"),
      content: `<div class="tta-prompt">
        <label for="tta-advance-days">${t("TTA.Time.AdvanceLabel")}</label>
        <input id="tta-advance-days" type="number" name="days" value="1" step="1" autofocus>
      </div>`,
      okLabel: t("TTA.Time.Advance")
    });
    if (!result) return;
    const days = Number(result.days);
    if (!Number.isFinite(days) || days === 0) return;
    await advanceDays(Math.trunc(days));
    CalendarApp.onGotoCurrent.call(this);
  }

  static async onSetDate() {
    const calendar = getCalendar();
    const current = getCurrentDate();
    const monthOptions = calendar.monthNames
      .map((name, index) => `<option value="${index + 1}" ${index + 1 === current.month ? "selected" : ""}>${foundry.utils.escapeHTML(name)}</option>`)
      .join("");

    const result = await promptForm({
      title: t("TTA.Time.SetDateTitle"),
      content: `<div class="tta-prompt tta-prompt-grid">
        <label for="tta-set-year">${t("TTA.Common.Year")}</label>
        <input id="tta-set-year" type="number" name="year" min="1" step="1" value="${current.year}">
        <label for="tta-set-month">${t("TTA.Common.Month")}</label>
        <select id="tta-set-month" name="month">${monthOptions}</select>
        <label for="tta-set-day">${t("TTA.Common.Day")}</label>
        <input id="tta-set-day" type="number" name="day" min="1" max="${calendar.daysPerMonth}" step="1" value="${current.day}">
      </div>`,
      okLabel: t("TTA.Time.SetDate")
    });
    if (!result) return;

    await setCurrentDate({
      year: Number(result.year),
      month: Number(result.month),
      day: Number(result.day)
    });
    CalendarApp.onGotoCurrent.call(this);
  }

  static onOpenConfig() {
    if (!canConfigureCalendar()) return ui.notifications.warn(t("TTA.Errors.GMOnly"));
    new CalendarConfigApp().render({ force: true });
  }

  static onOpenTimeline() {
    if (!canViewTimeline()) return ui.notifications.warn(t("TTA.Errors.TimelineHidden"));
    new TimelineApp().render({ force: true });
  }

  static onAddDayNote() {
    new NoteEditorApp({ dateKey: dayKey(this.viewYear, this.viewMonth, this.selectedDay) }).render({ force: true });
  }

  static onAddMonthNote() {
    new NoteEditorApp({ dateKey: monthKey(this.viewYear, this.viewMonth) }).render({ force: true });
  }

  /** Locate a rendered note record by the uuid stored on its element. */
  #findNote(uuid) {
    const all = [
      ...getNotesForKey(dayKey(this.viewYear, this.viewMonth, this.selectedDay)),
      ...getNotesForKey(monthKey(this.viewYear, this.viewMonth))
    ];
    return all.find(note => note.uuid === uuid) ?? null;
  }

  static onEditNote(event, target) {
    const note = this.#findNote(target.dataset.uuid);
    if (!note) return ui.notifications.warn(t("TTA.Errors.NoteMissing"));
    new NoteEditorApp({ note }).render({ force: true });
  }

  static async onDeleteNote(event, target) {
    const note = this.#findNote(target.dataset.uuid);
    if (!note) return ui.notifications.warn(t("TTA.Errors.NoteMissing"));

    const confirmed = await confirmDialog({
      title: t("TTA.Notes.DeleteTitle"),
      content: `<p>${t("TTA.Notes.DeleteBody", { title: note.title })}</p>`,
      yesLabel: t("TTA.Common.Delete"),
      yesIcon: "fa-solid fa-trash"
    });
    if (!confirmed) return;

    try {
      await deleteNote(note.uuid);
      ui.notifications.info(t("TTA.Notifications.NoteDeleted"));
      this.render();
    } catch (error) {
      log("error", "Failed to delete note", error);
      ui.notifications.error(error.message ?? t("TTA.Errors.NoteDeleteFailed"));
    }
  }

  static onPromoteNote(event, target) {
    if (!canPromoteNotes()) return ui.notifications.warn(t("TTA.Errors.PromoteGMOnly"));
    const note = this.#findNote(target.dataset.uuid);
    if (!note) return ui.notifications.warn(t("TTA.Errors.NoteMissing"));
    if (note.scope !== SCOPE.DAY) return ui.notifications.warn(t("TTA.Errors.PromoteDayOnly"));
    new EventEditorApp({ sourceNote: note }).render({ force: true });
  }

  static async onOpenJournal(event, target) {
    const document = await fromUuid(target.dataset.uuid);
    if (!document) return ui.notifications.warn(t("TTA.Errors.NoteMissing"));
    document.parent?.sheet?.render(true, { pageId: document.id });
  }
}
