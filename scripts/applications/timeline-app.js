/**
 * The visual timeline of Ages and historical events.
 *
 * Opened from the calendar window rather than from its own scene control, so
 * the module keeps a single left-hand icon. Browsing here is always local: no
 * control in this window changes the shared campaign date.
 */

import { confirmDialog, enrichHTML, log, promptForm, t } from "../compat.js";
import { MODULE_ID, TIMELINE_MODE, VISIBILITY } from "../constants.js";
import { endYear, yearsInAge } from "../services/age-service.js";
import {
  formatDate,
  formatMonth,
  getAgeForYear,
  getCalendar,
  getCurrentAge,
  getCurrentDate,
  getVisibleAges
} from "../services/calendar-service.js";
import { addMonths, addYears, parseKey } from "../services/date-service.js";
import { getPromotableNotes } from "../services/note-service.js";
import { canManageEvents, canViewTimeline, isGM } from "../services/permission-service.js";
import {
  deleteEvent,
  getEventsForAge,
  getEventsForMonth,
  getEventsForYear,
  getEvent,
  getMode,
  groupEventsByYear,
  setMode
} from "../services/timeline-service.js";
import { EventEditorApp } from "./event-editor-app.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TimelineApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super({ ...options, id: "tta-timeline" });
    const current = getCurrentDate();
    this.viewYear = current.year;
    this.viewMonth = current.month;
    this.filter = "all";
  }

  static DEFAULT_OPTIONS = {
    classes: ["tta", "tta-app", "tta-timeline"],
    tag: "div",
    window: {
      icon: "fa-solid fa-hourglass-half",
      title: "TTA.Timeline.Title",
      resizable: true
    },
    position: { width: 880, height: 700 },
    actions: {
      setMode: TimelineApp.onSetMode,
      prev: TimelineApp.onPrev,
      next: TimelineApp.onNext,
      gotoCurrent: TimelineApp.onGotoCurrent,
      addEvent: TimelineApp.onAddEvent,
      promoteFromNote: TimelineApp.onPromoteFromNote,
      editEvent: TimelineApp.onEditEvent,
      deleteEvent: TimelineApp.onDeleteEvent,
      openSource: TimelineApp.onOpenSource
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/timeline.hbs`,
      scrollable: [".tta-timeline-body"]
    }
  };

  get title() {
    return t("TTA.Timeline.Title");
  }

  /** The Age that frames the current view, based on the browsed year. */
  get viewAge() {
    return getAgeForYear(this.viewYear) ?? getCurrentAge();
  }

  async _prepareContext() {
    const calendar = getCalendar();
    const current = getCurrentDate();
    const mode = getMode();
    const gm = isGM();
    const age = this.viewAge;

    let events = [];
    let years = [];
    if (mode === TIMELINE_MODE.MONTH) {
      events = getEventsForMonth(this.viewYear, this.viewMonth);
      years = [this.viewYear];
    } else if (mode === TIMELINE_MODE.YEAR) {
      events = getEventsForYear(this.viewYear);
      years = [this.viewYear];
    } else if (age) {
      events = getEventsForAge(age);
      years = yearsInAge(age);
    } else {
      events = getEventsForYear(this.viewYear);
      years = [this.viewYear];
    }

    events = this.#applyFilter(events);
    const decorated = await Promise.all(events.map(async event => this.#decorate(event, gm)));
    const grouped = groupEventsByYear(decorated, years, current.year)
      .filter(group => mode === TIMELINE_MODE.EXPANDED || group.events.length > 0);

    return {
      isGM: gm,
      canManage: canManageEvents(),
      canView: canViewTimeline(),
      mode,
      modes: [
        { value: TIMELINE_MODE.EXPANDED, label: t("TTA.Timeline.ModeExpanded"), active: mode === TIMELINE_MODE.EXPANDED },
        { value: TIMELINE_MODE.YEAR, label: t("TTA.Timeline.ModeYear"), active: mode === TIMELINE_MODE.YEAR },
        { value: TIMELINE_MODE.MONTH, label: t("TTA.Timeline.ModeMonth"), active: mode === TIMELINE_MODE.MONTH }
      ],
      isExpanded: mode === TIMELINE_MODE.EXPANDED,
      isYearMode: mode === TIMELINE_MODE.YEAR,
      isMonthMode: mode === TIMELINE_MODE.MONTH,
      age: age ? { ...age, endYear: endYear(age), yearCount: yearsInAge(age).length } : null,
      hasAge: !!age,
      ages: getVisibleAges().map(a => ({ ...a, endYear: endYear(a), isCurrent: a.id === getCurrentAge()?.id })),
      viewYear: this.viewYear,
      viewMonth: this.viewMonth,
      viewMonthLabel: formatMonth(this.viewYear, this.viewMonth),
      currentDate: current,
      currentDateLabel: formatDate(current),
      groups: grouped,
      eventCount: decorated.length,
      isEmpty: decorated.length === 0,
      calendar,
      filter: this.filter,
      filterChoices: this.#filterChoices(gm)
    };
  }

  #filterChoices(gm) {
    const choices = [
      { value: "all", label: t("TTA.Timeline.FilterAll") },
      { value: "age", label: t("TTA.Timeline.FilterAge") },
      { value: "year", label: t("TTA.Timeline.FilterYear") },
      { value: "month", label: t("TTA.Timeline.FilterMonth") },
      { value: "players", label: t("TTA.Timeline.FilterPlayerVisible") }
    ];
    if (gm) choices.push({ value: "gm", label: t("TTA.Timeline.FilterGMOnly") });
    return choices.map(choice => ({ ...choice, selected: choice.value === this.filter }));
  }

  #applyFilter(events) {
    const age = this.viewAge;
    switch (this.filter) {
      case "age":
        return age ? events.filter(event => {
          const year = parseKey(event.dateKey)?.year;
          return year >= Number(age.startYear) && year <= endYear(age);
        }) : events;
      case "year":
        return events.filter(event => parseKey(event.dateKey)?.year === this.viewYear);
      case "month":
        return events.filter(event => {
          const parsed = parseKey(event.dateKey);
          return parsed?.year === this.viewYear && parsed?.month === this.viewMonth;
        });
      case "players":
        return events.filter(event => event.visibility === VISIBILITY.PLAYERS);
      case "gm":
        return events.filter(event => event.visibility === VISIBILITY.GM_ONLY);
      default:
        return events;
    }
  }

  async #decorate(event, gm) {
    const parsed = parseKey(event.dateKey);
    const sourceAvailable = event.source?.noteUuid ? !!(await fromUuid(event.source.noteUuid).catch(() => null)) : false;
    return {
      ...event,
      dateLabel: parsed ? formatDate(parsed) : event.dateKey,
      year: parsed?.year ?? null,
      enriched: await enrichHTML(event.description),
      visibilityLabel: t(`TTA.Visibility.${event.visibility}`),
      isPlayerVisible: event.visibility === VISIBILITY.PLAYERS,
      // The origin indicator and the source link are GM-only information.
      showOrigin: gm && event.source?.type === "promoted",
      sourceAvailable,
      sourceUuid: event.source?.noteUuid ?? null
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[data-filter-select]")?.addEventListener("change", event => {
      this.filter = event.currentTarget.value;
      this.render();
    });
  }

  static async onSetMode(event, target) {
    const mode = target.dataset.mode;
    if (!isGM()) {
      ui.notifications.warn(t("TTA.Errors.ModeGMOnly"));
      return;
    }
    await setMode(mode);
    this.render();
  }

  static onPrev() {
    this.#step(-1);
  }

  static onNext() {
    this.#step(1);
  }

  /** Step the local view by one Age, year, or month depending on the mode. */
  #step(delta) {
    const mode = getMode();
    const calendar = getCalendar();
    if (mode === TIMELINE_MODE.MONTH) {
      const next = addMonths({ year: this.viewYear, month: this.viewMonth, day: 1 }, delta, calendar);
      this.viewYear = next.year;
      this.viewMonth = next.month;
    } else if (mode === TIMELINE_MODE.YEAR) {
      this.viewYear = addYears({ year: this.viewYear, month: this.viewMonth, day: 1 }, delta, calendar).year;
    } else {
      const ages = getVisibleAges();
      const index = ages.findIndex(age => age.id === this.viewAge?.id);
      const target = ages[index + delta];
      if (!target) return;
      this.viewYear = Number(target.startYear);
    }
    this.render();
  }

  static onGotoCurrent() {
    const current = getCurrentDate();
    this.viewYear = current.year;
    this.viewMonth = current.month;
    this.render();
  }

  static onAddEvent() {
    if (!canManageEvents()) return ui.notifications.warn(t("TTA.Errors.EventGMOnly"));
    new EventEditorApp({
      dateKey: null,
      event: null
    }).render({ force: true });
  }

  /**
   * Pick an eligible calendar note and open the promotion form for it.
   * Only day notes that have not already been promoted are offered.
   */
  static async onPromoteFromNote() {
    if (!canManageEvents()) return ui.notifications.warn(t("TTA.Errors.EventGMOnly"));

    const notes = getPromotableNotes();
    if (!notes.length) return ui.notifications.info(t("TTA.Timeline.NoPromotableNotes"));

    const options = notes.map(note => {
      const label = `${note.dateKey} — ${note.title} (${note.authorName})`;
      return `<option value="${note.uuid}">${foundry.utils.escapeHTML(label)}</option>`;
    }).join("");

    const result = await promptForm({
      title: t("TTA.Timeline.FromNoteTitle"),
      content: `<div class="tta-prompt">
        <label for="tta-promote-note">${t("TTA.Timeline.FromNoteLabel")}</label>
        <select id="tta-promote-note" name="uuid">${options}</select>
      </div>`,
      okLabel: t("TTA.Timeline.FromNote")
    });
    if (!result?.uuid) return;

    const note = notes.find(candidate => candidate.uuid === result.uuid);
    if (!note) return ui.notifications.warn(t("TTA.Errors.NoteMissing"));
    new EventEditorApp({ sourceNote: note }).render({ force: true });
  }

  static onEditEvent(event, target) {
    if (!canManageEvents()) return ui.notifications.warn(t("TTA.Errors.EventGMOnly"));
    const record = getEvent(target.dataset.eventId);
    if (!record) return ui.notifications.warn(t("TTA.Errors.EventMissing"));
    new EventEditorApp({ event: record }).render({ force: true });
  }

  static async onDeleteEvent(event, target) {
    if (!canManageEvents()) return ui.notifications.warn(t("TTA.Errors.EventGMOnly"));
    const record = getEvent(target.dataset.eventId);
    if (!record) return ui.notifications.warn(t("TTA.Errors.EventMissing"));

    const confirmed = await confirmDialog({
      title: t("TTA.Timeline.DeleteTitle"),
      content: `<p>${t("TTA.Timeline.DeleteBody", { title: record.title })}</p>`,
      yesLabel: t("TTA.Common.Delete"),
      yesIcon: "fa-solid fa-trash"
    });
    if (!confirmed) return;

    try {
      await deleteEvent(record.id);
      ui.notifications.info(t("TTA.Notifications.EventDeleted"));
      this.render();
    } catch (error) {
      log("error", "Failed to delete timeline event", error);
      ui.notifications.error(error.message ?? t("TTA.Errors.EventDeleteFailed"));
    }
  }

  /** Open the journal page a promoted event originated from. GM-only control. */
  static async onOpenSource(event, target) {
    const document = await fromUuid(target.dataset.uuid).catch(() => null);
    if (!document) return ui.notifications.warn(t("TTA.Timeline.SourceUnavailable"));
    document.parent?.sheet?.render(true, { pageId: document.id });
  }
}
