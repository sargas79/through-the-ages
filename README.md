# Through the Ages

A world-calendar and campaign-history module for **Foundry VTT v14 (build 366)**.

Through the Ages gives a world one shared, fully custom calendar; stores campaign
notes as real Journal Entries; and adds a separate visual timeline of **Ages** and
historical **events**. Everything is reachable from a single **Calendar** icon in
the left-hand scene controls.

The module is system-agnostic — it adds no game mechanics and works in any v14 world.

---

## Features

- A custom calendar: months per year, days per month, month names, weekday names.
- One authoritative campaign date, controlled only by GMs and synchronised to every
  connected client without a reload.
- A shared 24-hour campaign clock with GM time presets that advance Foundry world
   time through its public API, so installed systems and modules can process their
   own time-based behaviour.
- Journal-backed calendar notes, stored in a managed **Calendar Notes** folder using
  canonical numeric names (`YYYY-MM-DD`, and `YYYY-MM-00` for month notes).
- Player notes that are private to their author and the GMs by default.
- **Ages**: named eras spanning a contiguous range of years, with overlap validation.
- A timeline window with three display densities: expanded, current year, current month.
- GM promotion of any player note into a timeline event, without altering the note.
- Full localisation; no player-facing string is hard-coded.

### Not in 1.0

No real-world calendar conversion, moons, seasons, weather, holidays, recurring
events, reminders, scene automation, third-party calendar integrations, or a
separate sidebar tab.

---

## Installation

**From a manifest URL** — in Foundry, go to *Add-on Modules → Install Module* and paste:

```
https://github.com/sargas79/through-the-ages/releases/latest/download/module.json
```

**Manually** — download the release archive and extract it so the module lives at
`Data/modules/through-the-ages/`. The folder name must match the package id exactly.

Then enable **Through the Ages** in *Game Settings → Manage Modules*.

---

## First-time setup

1. Enable the module. Nothing is created in your world until you save a configuration.
2. Open **Game Settings → Configure Settings → Through the Ages → Configure Calendar**.
   (The same window is reachable from the gear button inside the calendar itself.)
3. Set the months per year, days per month, and the number of weekdays. Every month
   uses the same number of days in 1.0.
4. Name the months and weekdays.
5. Set the starting campaign date.
6. Optionally add **Ages**. Ages may not overlap; gaps are allowed but warned about.
7. Save. The module creates the **Calendar Notes** journal folder at this point.

The **Calendar** tool then appears in the left-hand scene controls for everyone.

---

## GM workflows

### Changing campaign time

The calendar header shows the shared campaign date and 24-hour time. Its GM-only
time menu advances by **1 minute**, **10 minutes**, **1 hour**, **10 hours**, **1 day
(24 hours)**, **next adventure day (07:00 on the following calendar day)**, **1
week**, or **1 configured calendar month**. Previous/next day controls remain
available for corrections. Advancing rolls time, day, month, and year correctly, and
the campaign can never move earlier than Year 1, Month 1, Day 1 at 00:00.

Every module-controlled advance also calls Foundry's public world-time API with the
same elapsed seconds. Through the Ages does not inspect or modify actor, item, or
effect data: the active game system and other modules remain responsible for their
own duration expiry and time-based automation. The **Set Date** form includes a time
and confirms that moving time may affect those external systems.

On upgrade, existing calendars gain a `00:00` clock while their current Foundry world
time is preserved. If another source changes Foundry world time, Through the Ages
keeps its calendar unchanged and warns GMs. Use **Use current Foundry time** to
acknowledge that change before using its time controls again; this only establishes a
new synchronization checkpoint and does not alter calendar data.

Browsing months and years with the navigation arrows never changes the campaign date.

### Notes

*Add day note* and *Add month note* create notes on the selected day or the viewed
month. GM notes default to **GM only**; change the visibility selector to share one
with players. The filter dropdown narrows the note list to GM notes, player notes,
a specific player, day or month notes, or notes already promoted to the timeline.

### Ages and events

Open the timeline with **Open Timeline**. *Add event* creates an event on an exact
date, with a title, description, colour, icon, and player visibility. The three mode
buttons switch the shared display density; only a GM can change it.

### Promoting a player note

On any day note, press **Create timeline event**. The form arrives prefilled with the
note's title, date, and a plain-text excerpt of its content. Choose the event's title,
description, visibility, and optionally tick *Also make the original note visible to
players*. The source note is never deleted or rewritten unless you tick that box, and
the event keeps working even if the note is later removed.

---

## Player workflows

Players can open the calendar, read the current date, browse months and years, and see
the current Age. If the GM has enabled player notes they can add their own day and/or
month notes, and edit or delete the notes they authored.

Players see only their own notes, notes a GM explicitly shared with everyone, and
timeline events marked player-visible. Players can never change the calendar
configuration, the campaign date, Ages, events, or the timeline display mode.

---

## Permissions

| Capability | GM | Player |
|---|---|---|
| Configure the calendar and Ages | yes | no |
| Set or advance the campaign date | yes | no |
| Browse dates | yes | yes |
| Create notes | yes | when enabled by the GM |
| Edit / delete own notes | yes | yes |
| Edit / delete anyone's notes | yes | no |
| Change a note's visibility | yes | no |
| See all notes | yes | no |
| Create / edit / delete timeline events | yes | no |
| Promote a note to an event | yes | no |
| Open the timeline | yes | when enabled by the GM |
| Change the shared timeline mode | yes | no |

Player note writes are relayed to a connected GM over the module socket and
re-validated there, so a player can only ever act on their own note. If no GM is
online the attempt is refused with a clear message rather than failing silently.

---

## How data is stored

| Data | Location |
|---|---|
| Calendar structure, current date, Ages | world setting `through-the-ages.calendarData` |
| Timeline events | world setting `through-the-ages.timelineEvents` |
| Note text | Journal Entry Pages in the **Calendar Notes** folder |
| Note metadata (date key, author, visibility) | page flags under `flags.through-the-ages` |
| Browsing position, filters | per-client, never shared |

One Journal Entry exists per date, named with the canonical key, and holds one page
per note:

```
Calendar Notes
└─ 0142-07-12
   ├─ The caravan reaches Toloraria
   ├─ Wrenn's private observation
   └─ GM — Ashfen Roadhouse rumour
```

Month notes live in an entry named `0142-07-00`. Month and day numbers are used as
identifiers, never the editable labels, so renaming a month never disturbs an existing
note. Page ownership carries the privacy: GM-only pages grant nothing by default,
author-private pages grant ownership to the author alone, and shared pages grant
observer rights to everyone. Note bodies the current user may not see are filtered out
before rendering and never reach the calendar's HTML.

---

## Reconfiguring an existing campaign

Changing the calendar after notes exist is allowed, and nothing is ever deleted. The
configuration window warns and asks for explicit confirmation when a change would:

- reduce the months per year below a month already used by a note or event,
- reduce the days per month below a day already used, or
- change the weekday count, which relabels the weekday shown for every historical date.

Dates are stored numerically, so shrinking the calendar leaves existing notes intact
and retrievable — they simply fall outside the browsable grid until the calendar is
grown again.

---

## Troubleshooting

**The Calendar icon does not appear.** Confirm the module is enabled and that the
folder is named exactly `through-the-ages`.

**A player cannot save a note.** Check *Allow player notes* and *Player note scope* in
the module settings, and make sure a GM is connected — player writes need a GM online.

**The Calendar Notes folder was renamed or moved.** The module tracks the folder by id,
so renaming it is harmless. If entries were dragged out of it, use *Rebuild notes
folder* in the configuration window to re-home them.

**Notes exist but do not appear.** Enable *Debug logging* in the module settings and
check the console; a note whose stored date key is unreadable is skipped rather than
crashing the view.

---

## Development

```bash
npm test
```

The pure services — date arithmetic, Ages, validation, migrations — carry unit tests
under `tests/` and run under `node --test` with no Foundry runtime. UI, journal, and
socket behaviour is verified manually against Foundry v14 build 366.

The public API is available at `game.modules.get("through-the-ages").api`.

---

## Compatibility

Foundry VTT v14, minimum and verified build **14.366**. System-agnostic: this module
uses only Foundry's public world-time API and has no game-system dependencies.

## Licence

MIT — see [LICENSE](LICENSE).
