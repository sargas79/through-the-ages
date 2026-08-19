/**
 * Golarion — the Absalom Reckoning calendar of Pathfinder.
 *
 * Twelve months whose lengths mirror the Gregorian year, a seven-day week, and
 * 365 days. Absalom Reckoning tracks the real calendar closely enough that
 * 1 Abadius 4710 AR falls on the same weekday as 1 January 2010, which is what
 * the weekday anchor below pins down.
 *
 * Golarion's leap day in Calistril is not modelled: this module has no leap
 * years, so the calendar runs 365 days every year.
 */

export const GOLARION = {
  id: "golarion",
  yearLength: 365,
  calendar: {
    monthsPerYear: 12,
    daysPerMonth: 31,
    monthNames: [
      "Abadius", "Calistril", "Pharast", "Gozran", "Desnus", "Sarenith",
      "Erastus", "Arodus", "Rova", "Lamashan", "Neth", "Kuthona"
    ],
    monthLengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    weekdayNames: [
      "Moonday", "Toilday", "Wealday", "Oathday", "Fireday", "Starday", "Sunday"
    ],
    // 1 Abadius 4710 AR is a Fireday, matching Friday 1 January 2010.
    weekdayAnchor: { date: { year: 4710, month: 1, day: 1 }, weekday: 4 },
    currentDate: { year: 4710, month: 1, day: 1 },
    currentTime: { hour: 8, minute: 0 },
    yearPrefix: "",
    yearSuffix: "AR",
    moons: [
      {
        name: "Somal",
        cycleLength: 29.5,
        phaseCount: 8,
        color: "#eef1f6",
        showInGrid: true,
        playerVisible: true,
        anchor: { date: { year: 4710, month: 1, day: 7 }, phase: "new" }
      }
    ]
  },
  /** Where this preset knowingly departs from the setting, shown when it loads. */
  caveats: [
    "TTA.Presets.golarion.Caveat.LeapDay"
  ],
  ages: [
    {
      name: "The Age of Enthronement",
      startYear: 1,
      durationYears: 4605,
      description: "<p>Absalom Reckoning begins with the founding of Absalom by Aroden. Taldor"
        + " expands, Cheliax rises, and the Inner Sea takes the shape it holds today.</p>",
      color: "#6d7f4a"
    },
    {
      name: "The Age of Lost Omens",
      startYear: 4606,
      durationYears: 200,
      description: "<p>Aroden dies on the eve of his own prophesied return. Every prophecy fails"
        + " at once, the Worldwound opens, and no one can say what comes next.</p>",
      color: "#8f3d2e"
    }
  ],
  /**
   * No holidays ship with this preset. The source calendar carried none, and
   * Golarion's feast days are not fixed firmly enough across editions to state
   * dates for them here. Add your own from the calendar window.
   */
  holidays: []
};
