# Changelog

All notable changes to Through the Ages are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2026-08-19

### Fixed

- Browsing the timeline no longer rebuilds the whole window. Stepping to another
  span, jumping to an Age, returning to today and changing the filter each
  re-rendered the mode pills, toolbar and Age bands along with the event list, and
  because event descriptions are enriched asynchronously the repaint landed a tick
  after the click: the window blanked, the body lost its scroll position, the band
  row lost its horizontal scroll and the clicked control lost focus. Only the event
  region is repainted now, each pass abandoning its result if a later one has
  started. Switching mode and deleting an event still render in full, since both
  change world state.
- Age bands kept the generic button wash under the pointer instead of their own
  colour, and the band being viewed lost its gradient entirely, because
  `.tta button:hover` outweighed the band's own single-class rules.
- Calendar day cells lost their paint: writing the header-control exclusion as a
  bare `:not(.header-control)` raised the generic button rule's specificity, so it
  began overriding `.tta-day-button` and its siblings.

## [1.0.7] - 2026-08-19

### Fixed

- The window header's close and controls-toggle buttons rendered their glyphs as
  tofu boxes inside a module-styled border. The module's blanket button rule set a
  font-family that outranked Font Awesome's class on those buttons; the header is
  now left to Foundry. Module-owned buttons are unaffected, their icons living in
  child elements.

## [1.0.6] - 2026-08-19

### Fixed

- Selecting a day no longer repaints the entire calendar. The full render rebuilt
  the header and month grid for a change that reaches only the detail panel, and
  landed a tick late because note bodies are enriched asynchronously, so the grid
  flashed, scrolled back to the top and dropped focus on the clicked day. Only the
  detail panel is rendered now and the selection marks move in place. Rapid clicks
  cannot leave the panel describing one day while the grid marks another, and a
  failed repaint leaves the previous panel on screen and is logged rather than
  escaping as an unhandled rejection. Month and year navigation still render in
  full.
- The timeline's tick spine was built from its own queries rather than the filtered
  events listed below it, so with a filter active it could mark events that had no
  row in the list. The spine is now a direct read of what is listed.

## [1.0.5] - 2026-08-18

### Changed

- **The calendar is opened from the Journal sidebar, not the scene controls.** A
  **Calendar** button now sits at the top of the sidebar's Journal tab, where the
  calendar's own notes are stored. The `getSceneControlButtons` registration and its
  left-hand icon are gone.

- **Interface redesign.** Every window is repainted from the Nocturne design system:
  a dark indigo ground, the blurple accent with its full tonal ramp, outlined buttons
  that tint rather than fill, tabular figures on every date and count, and 4/8/14px
  radii throughout. The calendar header now carries the campaign date, clock, moon
  chips and the GM time controls on one row; the month grid draws note and event
  counts as dots instead of icons and labels; the detail panel lists notes as compact
  rows marked by authorship, each showing its canonical date key. The timeline gains a
  proportional row of Age bands and a tick spine above the event list. The calendar
  window states its first-time setup case explicitly, and the world-time drift notice
  is an amber strip across the top of the window.
- **Timeline lists only years that hold events.** Expanded mode previously printed
  every year of an Age, including empty ones. A year now appears once something is
  recorded in it, and each event row carries its full date.
- The Age header in the timeline was replaced by the band row, so the
  `partials/age-header.hbs` template was removed.

### Added

- A **Journals ▸ Calendar Notes** link in the calendar's legend row, which reveals the
  notes folder in Foundry's journal directory.
- The event editor offers four colour swatches beside the colour input, and picks its
  icon from a grid of the ten choices rather than a dropdown.
- The detail panel states the two player-facing refusals rather than hiding them:
  player notes switched off by the GM, and no GM online to relay a write to.

### Fixed

- **Content is always reachable.** Every window now lays out as a flex column with
  one scrolling region, and the content host scrolls as a last resort, so nothing
  can be clipped out of reach when a window is small or its content long: the
  configuration body scrolls under a fixed Save footer, the month grid scrolls
  sideways rather than crushing its cells in a world with many weekdays, the Age
  band row scrolls past a readable floor, and the detail panel, timeline body and
  long note bodies each carry their own scrollbar. Scrollbars are painted from the
  module's palette rather than inheriting Foundry's.
- Age bands were sized by the wrong element: the proportional `flex` was set on the
  band button while its wrapping list item — the actual flex child of the row —
  sized to its content, so every Age drew at roughly the same width regardless of
  duration.
- The calendar could refuse to reopen after being closed. A closed application can
  linger in Foundry's instance registry under its id; `openCalendar` now re-renders
  that instance instead of constructing a second one with the same id, which orphaned
  the first and left the window unopenable until the world was reloaded.

## [1.0.4] - 2026-08-18

### Added

- **Moons.** Up to ten optional moons can be added to the calendar, each with its own
  cycle length in whole days, starting offset, phase count (2, 4 or 8), colour, and
  per-moon toggles for month-grid display and player visibility. Phases appear beside
  the current date, in the selected day's detail panel, and as small discs in the month
  grid. The default remains no moons, so existing worlds are unchanged.
- **Calendar export and import.** The configuration window can write the calendar
  structure, its moons, the Ages and optionally the timeline events to a JSON file, and
  load one back. Imports are staged in the configuration editor for review and are
  applied only when the GM saves; nothing is written to the world before that.
- API additions: `getMoons`, `getVisibleMoons`, `getMoonPhases`, `exportCalendar`,
  `downloadCalendarExport`, `parseCalendarImport`, `importCalendar`, and the pure
  helpers `utils.phaseIndex`, `utils.phaseKey`, `utils.illumination` and
  `utils.daysUntilPhase`.

### Changed

- Stored data schema raised to version 3. The migration is additive: worlds without
  moons gain an empty moon list on first load and are otherwise untouched.

### Fixed

- Saving the calendar configuration no longer resets the campaign clock to 00:00. The
  configuration form did not carry the current time through, so migration refilled it
  with the default.

## [1.0.3] - 2026-08-18

### Fixed

- Reopening the calendar now creates a new window when the previously registered
  calendar application has already closed, rather than attempting to focus its
  detached element.
- Removed the deprecated scene-control `onClick` callback in favour of Foundry VTT
  v14's `onChange` callback.

## [1.0.2] - 2026-08-18

### Added

- A shared 24-hour campaign clock and GM preset controls for one minute, ten minutes,
  one hour, ten hours, one day, next adventure day at 07:00, one week, and one custom
  calendar month.
- System-neutral synchronization of module-controlled advances to Foundry world time
  through the public API, allowing game systems and modules to process their own
  duration behaviour without Through the Ages modifying their data.
- A confirmation-aware Set Date and Time workflow, plus an external-world-time
  warning and acknowledgement control.

### Changed

- Existing calendar data migrates to schema version 2 with a default clock time of
  00:00, preserving the world's existing Foundry world time.

## [1.0.1] - 2026-08-18

### Fixed

- Restored the Foundry VTT installation manifest and package for the v14 compatibility
  release.
- Made each ApplicationV2 form template part render a single root element, as required
  by Foundry VTT v14.

## [1.0.0] - 2026-08-18

Initial release, targeting Foundry VTT v14 build 366.

### Added

- Custom world calendar: configurable months per year, days per month, month names
  and weekday names, with validation bounds and duplicate-name detection.
- One authoritative campaign date with GM-only controls: previous/next day, advance
  or rewind any number of days, set an exact date, and jump back to the current date.
  Day, month and year rollover is handled in both directions and the date can never
  precede Year 1, Month 1, Day 1.
- Calendar window built on ApplicationV2, with a month grid that adapts to any
  weekday count and month length, note and event indicators per day, and a day and
  month detail panel.
- Journal-backed notes stored in a managed `Calendar Notes` folder, one entry per
  canonical date key (`YYYY-MM-DD`, or `YYYY-MM-00` for month notes) and one page
  per note.
- Player notes, private to their author and to GMs by default, gated by world
  settings for whether players may create notes and which scopes they may use.
- GM note management with filters for GM notes, player notes, a specific player,
  day notes, month notes, and promoted notes.
- Ages: named eras with a start year and duration, derived end year, description,
  colour, player visibility and ordering, with overlap validation and gap warnings.
- Timeline window with expanded, current-year and current-month display modes, a
  shared GM-controlled mode, event filters, and local browsing that never changes
  campaign time.
- GM promotion of a player note into a timeline event, prefilled from the note,
  linked back to its source, and leaving the original note untouched.
- Administrative rebuild of the calendar notes folder.
- Full English localisation and a versioned, idempotent data-migration framework.
- Public API at `game.modules.get("through-the-ages").api`.

[1.0.8]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.8
[1.0.7]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.7
[1.0.6]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.6
[1.0.5]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.5
[1.0.4]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.4
[1.0.3]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.3
[1.0.2]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.2
[1.0.1]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.1
[1.0.0]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.0
