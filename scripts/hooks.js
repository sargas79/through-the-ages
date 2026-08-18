/**
 * Hook wiring: the single Calendar scene control and the document listeners
 * that keep open windows in sync.
 */

import { log, rerenderModuleApps } from "./compat.js";
import { FLAGS, MODULE_ID } from "./constants.js";
import { CalendarApp } from "./applications/calendar-app.js";

/** Open (or focus) the calendar window. */
export function openCalendar() {
  const existing = foundry.applications.instances?.get("tta-calendar");
  if (existing?.rendered) {
    existing.bringToFront?.();
    return existing;
  }
  return new CalendarApp().render({ force: true });
}

/**
 * Register the module's only scene control.
 *
 * Foundry v13 changed `controls` from an array to a record; both shapes are
 * handled so the control appears regardless of the exact build.
 */
function onGetSceneControlButtons(controls) {
  const tool = {
    name: "calendar",
    order: 1,
    title: "TTA.Calendar.ControlTool",
    icon: "fa-solid fa-calendar-days",
    button: true,
    visible: true,
    onChange: () => openCalendar(),
    onClick: () => openCalendar()
  };

  const control = {
    name: MODULE_ID,
    order: 100,
    title: "TTA.Calendar.ControlGroup",
    icon: "fa-solid fa-calendar-days",
    visible: true,
    activeTool: "calendar",
    onChange: () => openCalendar(),
    tools: { calendar: tool }
  };

  if (Array.isArray(controls)) {
    controls.push({ ...control, layer: "controls", tools: [tool] });
  } else {
    controls[MODULE_ID] = control;
  }
}

/** True when a document belongs to the module's calendar note storage. */
function isCalendarDocument(document) {
  if (document?.documentName === "JournalEntry") return !!document.getFlag(MODULE_ID, FLAGS.ENTRY);
  if (document?.documentName === "JournalEntryPage") return !!document.getFlag(MODULE_ID, FLAGS.NOTE);
  return false;
}

function onDocumentChanged(document) {
  if (!isCalendarDocument(document)) return;
  rerenderModuleApps();
}

export function registerHooks() {
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);

  for (const event of ["createJournalEntry", "updateJournalEntry", "deleteJournalEntry"]) {
    Hooks.on(event, onDocumentChanged);
  }
  for (const event of ["createJournalEntryPage", "updateJournalEntryPage", "deleteJournalEntryPage"]) {
    Hooks.on(event, onDocumentChanged);
  }

  // A GM disconnecting or connecting changes whether player writes can be relayed.
  Hooks.on("userConnected", () => rerenderModuleApps());

  log("debug", "Hooks registered");
}
