/**
 * Public module API, exposed as `game.modules.get("through-the-ages").api`.
 *
 * Only stable, permission-checked operations are surfaced here so that macros
 * and companion modules never have to reach into internals.
 */

import { MODULE_ID } from "./constants.js";
import * as ageService from "./services/age-service.js";
import * as calendarService from "./services/calendar-service.js";
import * as dateService from "./services/date-service.js";
import * as journalService from "./services/journal-service.js";
import * as noteService from "./services/note-service.js";
import * as timelineService from "./services/timeline-service.js";
import { CalendarApp } from "./applications/calendar-app.js";
import { CalendarConfigApp } from "./applications/calendar-config-app.js";
import { TimelineApp } from "./applications/timeline-app.js";
import { openCalendar } from "./hooks.js";

export function buildApi() {
  return {
    // Windows
    openCalendar,
    openTimeline: () => new TimelineApp().render({ force: true }),
    openConfiguration: () => new CalendarConfigApp().render({ force: true }),

    // Calendar state
    getCalendar: calendarService.getCalendar,
    getCurrentDate: calendarService.getCurrentDate,
    getCurrentTime: calendarService.getCurrentTime,
    getCurrentAge: calendarService.getCurrentAge,
    getAges: calendarService.getAges,
    formatDate: calendarService.formatDate,
    formatTime: calendarService.formatTime,
    setCurrentDate: calendarService.setCurrentDate,
    setCurrentDateTime: calendarService.setCurrentDateTime,
    advanceDays: calendarService.advanceDays,
    advanceTime: calendarService.advanceTime,
    advanceToNextAdventureDay: calendarService.advanceToNextAdventureDay,
    acknowledgeWorldTime: calendarService.acknowledgeWorldTime,

    // Notes
    getNotesForKey: noteService.getNotesForKey,
    getDayNotes: noteService.getDayNotes,
    getMonthNotes: noteService.getMonthNotes,
    createNote: noteService.createNote,
    updateNote: noteService.updateNote,
    deleteNote: noteService.deleteNote,
    repairNotesFolder: journalService.repairFolder,

    // Timeline
    getEvents: timelineService.getVisibleEvents,
    createEvent: timelineService.createEvent,
    updateEvent: timelineService.updateEvent,
    deleteEvent: timelineService.deleteEvent,
    promoteNote: timelineService.promoteNote,

    // Pure helpers, useful for macros
    utils: {
      dayKey: dateService.dayKey,
      monthKey: dateService.monthKey,
      parseKey: dateService.parseKey,
      addDays: dateService.addDays,
      weekdayName: dateService.weekdayName,
      endYear: ageService.endYear,
      findAgeForYear: ageService.findAgeForYear
    },

    applications: { CalendarApp, TimelineApp, CalendarConfigApp },
    MODULE_ID
  };
}
