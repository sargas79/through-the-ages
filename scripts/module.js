/**
 * Through the Ages - module entry point.
 *
 * Lifecycle:
 *   init  - settings, Handlebars helpers and partials, hook registration
 *   setup - public API
 *   ready - migration, journal folder verification, socket wiring
 */

import { buildApi } from "./api.js";
import { loadTemplates, log } from "./compat.js";
import { MODULE_ID, MODULE_TITLE } from "./constants.js";
import { registerHooks } from "./hooks.js";
import { registerSettings } from "./settings.js";
import { onCalendarDataChanged, runMigrationIfNeeded } from "./services/calendar-service.js";
import { ensureFolder } from "./services/journal-service.js";
import { registerSocketHandlers } from "./services/note-service.js";
import { isGM } from "./services/permission-service.js";
import { registerSocket } from "./services/socket-service.js";

const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates`;

const PARTIALS = [
  `${TEMPLATE_ROOT}/partials/calendar-day.hbs`,
  `${TEMPLATE_ROOT}/partials/note-list.hbs`,
  `${TEMPLATE_ROOT}/partials/timeline-event.hbs`,
  `${TEMPLATE_ROOT}/partials/age-header.hbs`
];

/** Handlebars helpers used by the module templates. */
function registerHandlebarsHelpers() {
  Handlebars.registerHelper("ttaEq", (a, b) => a === b);
  Handlebars.registerHelper("ttaNot", value => !value);
  Handlebars.registerHelper("ttaPad2", value => String(value ?? "").padStart(2, "0"));
  Handlebars.registerHelper("ttaOr", (...args) => args.slice(0, -1).some(Boolean));
  Handlebars.registerHelper("ttaAnd", (...args) => args.slice(0, -1).every(Boolean));
}

Hooks.once("init", () => {
  log("info", `Initialising ${MODULE_TITLE}`);
  registerSettings();
  registerHandlebarsHelpers();
  registerHooks();
});

Hooks.once("setup", () => {
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = buildApi();
  loadTemplates(PARTIALS).catch(error => log("error", "Failed to preload templates", error));
});

Hooks.once("ready", async () => {
  registerSocket();

  if (isGM()) {
    registerSocketHandlers();
    try {
      await runMigrationIfNeeded();
      await ensureFolder();
    } catch (error) {
      log("error", "Startup tasks failed", error);
      ui.notifications.error(game.i18n.localize("TTA.Errors.StartupFailed"));
    }
  }

  onCalendarDataChanged();
  log("info", `${MODULE_TITLE} ready`);
});
