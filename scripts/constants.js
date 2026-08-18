/**
 * Shared constants for the Through the Ages module.
 * This file must stay free of Foundry globals so the pure services that import
 * it can be unit tested outside of a Foundry runtime.
 */

export const MODULE_ID = "through-the-ages";
export const MODULE_TITLE = "Through the Ages";
export const SCHEMA_VERSION = 3;

export const SOCKET_EVENT = `module.${MODULE_ID}`;

export const NOTES_FOLDER_NAME = "Calendar Notes";

/** World and client setting keys. */
export const SETTINGS = {
  CALENDAR_DATA: "calendarData",
  TIMELINE_EVENTS: "timelineEvents",
  NOTES_FOLDER_ID: "notesFolderId",
  CONFIGURED: "calendarConfigured",
  PLAYER_NOTE_CREATION: "playerNoteCreation",
  PLAYER_NOTE_SCOPE: "playerNoteScope",
  SHOW_TIMELINE_TO_PLAYERS: "showTimelineToPlayers",
  TIMELINE_MODE: "defaultTimelineMode",
  DEBUG: "debugLogging",
  SCHEMA_VERSION: "schemaVersion",
  WORLD_TIME: "synchronizedWorldTime"
};

/** Flag keys written under `flags.through-the-ages`. */
export const FLAGS = {
  NOTE: "note",
  ENTRY: "entry"
};

/** Note visibility classifications. */
export const VISIBILITY = {
  GM_ONLY: "gm-only",
  AUTHOR_AND_GM: "author-and-gm",
  PLAYERS: "players"
};

/** Calendar scope of a note. */
export const SCOPE = {
  DAY: "day",
  MONTH: "month"
};

/** Which note scopes players are allowed to create. */
export const PLAYER_SCOPE = {
  DAY: "day",
  MONTH: "month",
  BOTH: "both"
};

/** Timeline display densities. */
export const TIMELINE_MODE = {
  EXPANDED: "expanded",
  YEAR: "year",
  MONTH: "month"
};

/** Origin of a timeline event. */
export const EVENT_SOURCE = {
  MANUAL: "manual",
  PROMOTED: "promoted"
};

/** Socket operations relayed to an active GM. */
export const SOCKET_OPS = {
  CREATE_NOTE: "createNote",
  UPDATE_NOTE: "updateNote",
  DELETE_NOTE: "deleteNote"
};

/** Configuration bounds enforced by the validation service. */
export const LIMITS = {
  MONTHS_MIN: 1,
  MONTHS_MAX: 24,
  DAYS_MIN: 1,
  DAYS_MAX: 100,
  WEEKDAYS_MIN: 1,
  WEEKDAYS_MAX: 14,
  YEAR_MIN: 1,
  AGE_DURATION_MIN: 1,
  MOONS_MAX: 10,
  MOON_CYCLE_MIN: 2,
  MOON_CYCLE_MAX: 1000
};

/** Named phase counts a moon may be divided into. */
export const MOON_PHASE_COUNTS = [2, 4, 8];

/** Default number of named phases for a newly added moon. */
export const DEFAULT_MOON_PHASE_COUNT = 8;

/**
 * Phase name keys, ordered from new moon through the full cycle. The 2- and
 * 4-phase sets are strict subsets, so every moon uses the same vocabulary.
 */
export const MOON_PHASE_KEYS = {
  2: ["New", "Full"],
  4: ["New", "FirstQuarter", "Full", "LastQuarter"],
  8: [
    "New", "WaxingCrescent", "FirstQuarter", "WaxingGibbous",
    "Full", "WaningGibbous", "LastQuarter", "WaningCrescent"
  ]
};

/** Fallback labels used when generating or padding name lists. */
export const DEFAULT_MONTH_NAMES = [
  "Firstfall", "Deepwinter", "Thawtide", "Dawnmarch", "Emberwake", "Highsun",
  "Goldreap", "Duskfall", "Stormhold", "Ashfen", "Longnight", "Yearsend"
];

export const DEFAULT_WEEKDAY_NAMES = [
  "Moonday", "Towerday", "Starday", "Forgeday", "Riverday", "Sunday", "Restday"
];

/** The calendar payload written on first configuration. */
export const DEFAULT_CALENDAR_DATA = {
  schemaVersion: SCHEMA_VERSION,
  calendar: {
    monthsPerYear: 12,
    daysPerMonth: 30,
    monthNames: [...DEFAULT_MONTH_NAMES],
    weekdayNames: [...DEFAULT_WEEKDAY_NAMES],
    currentDate: { year: 1, month: 1, day: 1 },
    currentTime: { hour: 0, minute: 0 },
    moons: []
  },
  ages: []
};

/** Default accent colour applied to Ages and events that define none. */
export const DEFAULT_COLOR = "#8f3d2e";

/** Default accent colour applied to moons that define none. */
export const DEFAULT_MOON_COLOR = "#c9d4e8";

/** Fallback names used when adding or normalising moons. */
export const DEFAULT_MOON_NAMES = [
  "Selene", "Verrick", "Ilmara", "Kethis", "Dunmoor",
  "Ashryn", "Torvald", "Nyx", "Calder", "Wisp"
];

/** Envelope identifiers for exported calendar files. */
export const EXPORT_FORMAT = "through-the-ages-calendar";
export const EXPORT_FORMAT_VERSION = 1;
