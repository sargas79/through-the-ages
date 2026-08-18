# Changelog

All notable changes to Through the Ages are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/sargas79/through-the-ages/releases/tag/v1.0.0
