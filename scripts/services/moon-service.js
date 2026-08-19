/**
 * Pure moon logic: phase arithmetic, ordering, and normalisation.
 *
 * Moons are plain objects:
 * `{ id, name, cycleLength, offset, phaseCount, color, showInGrid, playerVisible, sortOrder }`
 *
 * A moon's cycle is measured in calendar days, need not be a whole number, and
 * is independent of the month length, so phases drift across months exactly as
 * they do in nature.
 * `offset` is how many days into its cycle a moon already is on Year 1,
 * Month 1, Day 1, which is what lets a GM place several moons out of step.
 *
 * Nothing here touches Foundry globals: every function takes explicit data so
 * the rules stay deterministic and unit testable.
 */

import {
  DEFAULT_MOON_COLOR,
  DEFAULT_MOON_NAMES,
  DEFAULT_MOON_PHASE_COUNT,
  LIMITS,
  MOON_CYCLE_DECIMALS,
  MOON_PHASE_COUNTS,
  MOON_PHASE_KEYS
} from "../constants.js";

/** Clamp a cycle length to the supported range and precision. */
export function clampCycleLength(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return LIMITS.MOON_CYCLE_MIN;
  const bounded = Math.min(Math.max(n, LIMITS.MOON_CYCLE_MIN), LIMITS.MOON_CYCLE_MAX);
  return Number(bounded.toFixed(MOON_CYCLE_DECIMALS));
}

/** Clamp a value to the allowed named-phase counts. */
export function clampPhaseCount(value) {
  const n = Math.trunc(Number(value));
  return MOON_PHASE_COUNTS.includes(n) ? n : DEFAULT_MOON_PHASE_COUNT;
}

/** Normalise a moon record, filling in derived and defaulted fields. */
export function normalizeMoon(moon, index = 0) {
  const cycleLength = clampCycleLength(moon?.cycleLength);

  // The offset stays a whole number of days: it answers "how far into its cycle
  // was this moon on day one", which is only ever read against whole days.
  const rawOffset = Math.trunc(Number(moon?.offset));
  const offset = Number.isFinite(rawOffset)
    ? ((rawOffset % Math.ceil(cycleLength)) + Math.ceil(cycleLength)) % Math.ceil(cycleLength)
    : 0;

  return {
    id: moon?.id ?? `moon-${index}`,
    name: String(moon?.name ?? "").trim() || DEFAULT_MOON_NAMES[index] || `Moon ${index + 1}`,
    cycleLength,
    offset,
    phaseCount: clampPhaseCount(moon?.phaseCount),
    color: moon?.color || DEFAULT_MOON_COLOR,
    showInGrid: moon?.showInGrid !== false,
    playerVisible: moon?.playerVisible !== false,
    sortOrder: Number.isFinite(Number(moon?.sortOrder)) ? Number(moon.sortOrder) : index
  };
}

/** Moons ordered by explicit sort order, then by name. */
export function sortMoons(moons = []) {
  return [...moons].sort((a, b) => {
    const orderA = Number.isFinite(Number(a?.sortOrder)) ? Number(a.sortOrder) : 0;
    const orderB = Number.isFinite(Number(b?.sortOrder)) ? Number(b.sortOrder) : 0;
    return (orderA - orderB) || String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
  });
}

/** Moons a given user may see. GMs see everything. */
export function visibleMoons(moons = [], isGM = false) {
  return sortMoons(moons).filter(moon => isGM || moon.playerVisible !== false);
}

/**
 * How far through its cycle a moon is on an absolute day index.
 * @returns {number} `0` at the new moon, rising to just under `1`
 */
export function phaseFraction(moon, absoluteDay) {
  const cycle = clampCycleLength(moon.cycleLength);
  const day = Math.trunc(Number(absoluteDay)) - Number(moon.offset ?? 0);
  return (((day % cycle) + cycle) % cycle) / cycle;
}

/**
 * Zero-based index into the moon's named phases, where `0` is the new moon.
 * Phases are centred on their exact point in the cycle, so a moon reads as
 * "Full" on the day nearest to the true midpoint rather than after it.
 */
export function phaseIndex(moon, absoluteDay) {
  const count = clampPhaseCount(moon.phaseCount);
  return Math.round(phaseFraction(moon, absoluteDay) * count) % count;
}

/** Localisation key suffix for a moon's phase, e.g. `WaxingGibbous`. */
export function phaseKey(moon, absoluteDay) {
  const count = clampPhaseCount(moon.phaseCount);
  return MOON_PHASE_KEYS[count][phaseIndex(moon, absoluteDay)];
}

/** Lit fraction of the moon's disc, from `0` (new) to `1` (full). */
export function illumination(moon, absoluteDay) {
  return (1 - Math.cos(2 * Math.PI * phaseFraction(moon, absoluteDay))) / 2;
}

/** True while the moon is growing towards full. */
export function isWaxing(moon, absoluteDay) {
  return phaseFraction(moon, absoluteDay) < 0.5;
}

/** True on the day a moon reads as full. */
export function isFullMoon(moon, absoluteDay) {
  const count = clampPhaseCount(moon.phaseCount);
  return phaseIndex(moon, absoluteDay) === count / 2;
}

/** True on the day a moon reads as new. */
export function isNewMoon(moon, absoluteDay) {
  return phaseIndex(moon, absoluteDay) === 0;
}

/**
 * True on the first day a moon reads as a different named phase than it did
 * the day before. The grid marks only these days, so a moon appears when its
 * phase turns over rather than on every day of the month.
 */
export function isPhaseChange(moon, absoluteDay) {
  const day = Math.trunc(Number(absoluteDay));
  return phaseIndex(moon, day) !== phaseIndex(moon, day - 1);
}

/**
 * The `offset` a moon needs in order to read as `targetIndex` on a given day —
 * the inverse of {@link phaseIndex}, used to anchor a moon to a known event
 * such as "Selune is full on Midsummer".
 *
 * Offsets are whole days while cycles need not be, so there is rarely an exact
 * answer: every legal offset is tried and the one landing closest to the wanted
 * point in the cycle wins. Cycles are capped at 1000 days, so this stays cheap.
 */
export function offsetForPhaseOnDay(moon, absoluteDay, targetIndex = 0) {
  const cycle = clampCycleLength(moon.cycleLength);
  const count = clampPhaseCount(moon.phaseCount);
  const target = ((Math.trunc(Number(targetIndex)) % count) + count) % count;
  const wanted = target / count;
  const day = Math.trunc(Number(absoluteDay));

  let best = 0;
  let bestDistance = Infinity;
  for (let offset = 0; offset < Math.ceil(cycle); offset++) {
    const fraction = phaseFraction({ cycleLength: cycle, offset }, day);
    // Circular distance: phase 0.99 is a hair before phase 0, not far after it.
    const raw = Math.abs(fraction - wanted);
    const distance = Math.min(raw, 1 - raw);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = offset;
    }
  }
  return best;
}

/**
 * Whole days from `absoluteDay` until the moon next reaches a named phase.
 * Returns `0` when the moon is already in that phase today.
 */
export function daysUntilPhase(moon, absoluteDay, targetIndex) {
  const count = clampPhaseCount(moon.phaseCount);
  const target = ((Math.trunc(Number(targetIndex)) % count) + count) % count;
  const start = Math.trunc(Number(absoluteDay));
  for (let i = 0; i < Math.ceil(clampCycleLength(moon.cycleLength)); i++) {
    if (phaseIndex(moon, start + i) === target) return i;
  }
  return 0;
}

/**
 * A render-ready description of one moon on one absolute day.
 *
 * `terminator` and `gibbous` describe the shadow line as CSS-ready values so
 * the templates can draw any phase with a plain ellipse overlay: `terminator`
 * is the shadow's relative width (`1` at new and full, `0` at the quarters)
 * and `gibbous` says whether that ellipse is lit or dark.
 */
export function describePhase(moon, absoluteDay) {
  const lit = illumination(moon, absoluteDay);
  return {
    id: moon.id,
    name: moon.name,
    color: moon.color,
    showInGrid: moon.showInGrid !== false,
    phaseKey: phaseKey(moon, absoluteDay),
    phaseIndex: phaseIndex(moon, absoluteDay),
    illumination: lit,
    terminator: Math.abs((2 * lit) - 1),
    gibbous: lit > 0.5,
    waxing: isWaxing(moon, absoluteDay),
    isFull: isFullMoon(moon, absoluteDay),
    isNew: isNewMoon(moon, absoluteDay),
    isPhaseChange: isPhaseChange(moon, absoluteDay)
  };
}
