/**
 * Dark Sun — the calendar of Athas, dated in Free Years.
 *
 * Twelve months of thirty days with three five-day "sun weeks" between them,
 * for a 375-day year. The sun weeks are ordinary short months here.
 *
 * Athas also names each year from a repeating cycle of seventy-six — Ral's
 * Fury, Friend's Contemplation, and so on — which this module cannot express.
 * The preset's caveats say so.
 */

export const DARK_SUN = {
  id: "darksun",
  yearLength: 375,
  calendar: {
    monthsPerYear: 15,
    daysPerMonth: 30,
    monthNames: [
      "Scorch", "Morrow", "Rest", "Gather", "Cooling Sun",
      "Breeze", "Mist", "Bloom", "Haze", "Soaring Sun",
      "Hoard", "Wind", "Sorrow", "Smolder", "Highest Sun"
    ],
    monthLengths: [30, 30, 30, 30, 5, 30, 30, 30, 30, 5, 30, 30, 30, 30, 5],
    weekdayNames: ["1 Day", "2 Day", "3 Day", "4 Day", "5 Day", "6 Day"],
    weekdayAnchor: { date: { year: 1, month: 1, day: 1 }, weekday: 0 },
    currentDate: { year: 1, month: 1, day: 1 },
    currentTime: { hour: 6, minute: 0 },
    yearPrefix: "",
    yearSuffix: "FY",
    moons: [
      {
        name: "Ral",
        cycleLength: 34,
        phaseCount: 8,
        color: "#7ace57",
        showInGrid: true,
        playerVisible: true,
        anchor: { date: { year: 1, month: 1, day: 13 }, phase: "new" }
      },
      {
        name: "Guthay",
        cycleLength: 125,
        phaseCount: 8,
        color: "#ffd920",
        showInGrid: true,
        playerVisible: true,
        anchor: { date: { year: 1, month: 2, day: 2 }, phase: "new" }
      }
    ]
  },
  /** Where this preset knowingly departs from the setting, shown when it loads. */
  caveats: [
    "TTA.Presets.darksun.Caveat.YearNames"
  ],
  ages: [
    {
      name: "The Free Years",
      startYear: 1,
      durationYears: 100,
      description: "<p>Reckoned from the death of Kalak of Tyr. A single city has thrown down its"
        + " sorcerer-king, and every other throne in the Tablelands has noticed.</p>",
      color: "#c2703a"
    }
  ],
  holidays: [
    {
      month: 5, day: 1, days: 5, title: "Cooling Sun",
      content: "<p>Five days between Gather and Breeze, when the worst of the heat breaks. Water"
        + " rations are re-drawn and the caravans move again.</p>"
    },
    {
      month: 10, day: 1, days: 5, title: "Soaring Sun",
      content: "<p>Five days at the height of the growing season, and the safest travelling of the"
        + " year across the Tablelands.</p>"
    },
    {
      month: 15, day: 1, days: 5, title: "Highest Sun",
      content: "<p>Five days of killing heat that close the year. Nothing moves in the open, and"
        + " the cities give themselves over to the games.</p>"
    }
  ]
};
