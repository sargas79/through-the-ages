/**
 * Thin wrappers around Foundry APIs that were relocated into namespaces during
 * the v12 -> v14 transition. Using them keeps the rest of the module free of
 * version probing and avoids deprecation warnings on v14.
 */

import { MODULE_ID, MODULE_TITLE, SETTINGS } from "./constants.js";

/** Resolve the active TextEditor implementation. */
function textEditor() {
  return foundry?.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
}

/** Render a Handlebars template by path. */
export function renderTemplate(path, data) {
  const fn = foundry?.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  return fn(path, data);
}

/** Pre-load and cache Handlebars templates and partials. */
export function loadTemplates(paths) {
  const fn = foundry?.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  return fn(paths);
}

/** Enrich stored HTML for display (links, rolls, secrets). */
export async function enrichHTML(html, options = {}) {
  if (!html) return "";
  try {
    return await textEditor().enrichHTML(html, { secrets: false, ...options });
  } catch (error) {
    log("error", "Failed to enrich HTML", error);
    return foundry.utils.escapeHTML?.(String(html)) ?? "";
  }
}

/** Generate a stable random identifier. */
export function randomID() {
  return foundry.utils.randomID();
}

/** Localise a key, optionally with interpolation data. */
export function t(key, data) {
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

/** Confirmation dialog. Resolves true only on an explicit confirmation. */
export async function confirmDialog({ title, content, yesLabel, noLabel, yesIcon = "fa-solid fa-check" }) {
  const DialogV2 = foundry.applications.api.DialogV2;
  return DialogV2.confirm({
    window: { title, icon: "fa-solid fa-triangle-exclamation" },
    content,
    yes: { label: yesLabel ?? t("TTA.Common.Confirm"), icon: yesIcon },
    no: { label: noLabel ?? t("TTA.Common.Cancel") },
    rejectClose: false,
    modal: true
  });
}

/**
 * Build a rich-text input element, falling back to a plain textarea if the
 * ProseMirror element is unavailable for any reason.
 */
export function createRichTextInput({ name, value = "", height = 260 }) {
  try {
    const element = foundry.applications.elements.HTMLProseMirrorElement.create({
      name,
      value,
      toggled: false,
      height
    });
    element.classList.add("tta-richtext");
    return element;
  } catch (error) {
    log("warn", "ProseMirror editor unavailable, falling back to a textarea", error);
    const textarea = document.createElement("textarea");
    textarea.name = name;
    textarea.value = value;
    textarea.classList.add("tta-richtext-fallback");
    textarea.style.minHeight = `${height}px`;
    return textarea;
  }
}

/** Whether verbose diagnostics are enabled. */
export function isDebug() {
  try {
    return game.settings.get(MODULE_ID, SETTINGS.DEBUG) === true;
  } catch {
    return false;
  }
}

/**
 * Namespaced logging. `debug` messages are suppressed unless debug logging is
 * enabled; warnings and errors always surface.
 */
export function log(level, ...args) {
  if (level === "debug" && !isDebug()) return;
  const prefix = `${MODULE_TITLE} |`;
  const fn = console[level] ?? console.log;
  fn.call(console, prefix, ...args);
}

/**
 * Re-render every open Through the Ages application.
 *
 * Used after any shared-state change (time, configuration, notes, events) so
 * connected clients update without a reload.
 */
export function rerenderModuleApps() {
  const instances = foundry?.applications?.instances;
  if (!instances) return;
  for (const app of instances.values()) {
    if (!app?.id?.startsWith("tta-")) continue;
    if (app.rendered) app.render({ force: false });
  }
}

/**
 * Show a small modal form and resolve with its values, or null if dismissed.
 * @param {{title:string, content:string, okLabel?:string, okIcon?:string}} config
 */
export async function promptForm({ title, content, okLabel, okIcon = "fa-solid fa-check" }) {
  const DialogV2 = foundry.applications.api.DialogV2;
  try {
    return await DialogV2.prompt({
      window: { title },
      content,
      modal: true,
      rejectClose: false,
      ok: {
        label: okLabel ?? t("TTA.Common.Apply"),
        icon: okIcon,
        callback: (event, button, dialog) => {
          const form = button.form ?? dialog?.element?.querySelector("form");
          if (!form) return {};
          const FDE = foundry?.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
          return new FDE(form).object;
        }
      }
    });
  } catch (error) {
    log("debug", "Prompt dismissed", error);
    return null;
  }
}
