/**
 * Greyhawk — the Common Year calendar of the Flanaess.
 *
 * Twelve months of twenty-eight days with four seven-day festivals set between
 * them: 364 days, exactly fifty-two weeks, so every date keeps its weekday
 * forever. The festivals are ordinary short months here.
 */

export const GREYHAWK = {
  id: "greyhawk",
  yearLength: 364,
  calendar: {
    monthsPerYear: 16,
    daysPerMonth: 28,
    monthNames: [
      "Needfest", "Fireseek", "Readying", "Coldeven", "Growfest", "Planting",
      "Flocktime", "Wealsun", "Richfest", "Reaping", "Goodmonth", "Harvester",
      "Brewfest", "Patchwall", "Ready'reat", "Sunsebb"
    ],
    monthLengths: [7, 28, 28, 28, 7, 28, 28, 28, 7, 28, 28, 28, 7, 28, 28, 28],
    weekdayNames: ["Starday", "Sunday", "Moonday", "Godsday", "Waterday", "Earthday", "Freeday"],
    weekdayAnchor: { date: { year: 591, month: 1, day: 1 }, weekday: 0 },
    currentDate: { year: 591, month: 1, day: 1 },
    currentTime: { hour: 8, minute: 0 },
    yearPrefix: "",
    yearSuffix: "CY",
    moons: [
      {
        name: "Luna",
        cycleLength: 28,
        phaseCount: 8,
        color: "#eceff5",
        showInGrid: true,
        playerVisible: true,
        // Anchored to the Richfest conjunction. A 28-day cycle cannot also be
        // full at the other three festivals, which stand 91 days apart, so the
        // midsummer night both moons share is the one kept exact.
        anchor: { date: { year: 591, month: 9, day: 4 }, phase: "full" }
      },
      {
        name: "Celene",
        cycleLength: 91,
        phaseCount: 8,
        color: "#7fffd4",
        showInGrid: true,
        playerVisible: true,
        // Four cycles to the year lands the Handmaiden full at the middle day of
        // every festival, Richfest included.
        anchor: { date: { year: 591, month: 9, day: 4 }, phase: "full" }
      }
    ]
  },
  /** Where this preset knowingly departs from the setting, shown when it loads. */
  caveats: [
    "TTA.Presets.greyhawk.Caveat.Luna"
  ],
  ages: [
    {
      name: "The Common Year",
      startYear: 1,
      durationYears: 581,
      description: "<p>Dated from the crowning of the first Overking of the Great Kingdom of"
        + " Aerdy, the reckoning the states of the Flanaess still share.</p>",
      color: "#6d7f4a"
    },
    {
      name: "The Greyhawk Wars",
      startYear: 582,
      durationYears: 3,
      description: "<p>Iuz and the Horned Society break the north while Ivid's Great Kingdom"
        + " turns on itself. The Pact of Greyhawk ends the fighting and settles nothing.</p>",
      color: "#8f3d2e"
    },
    {
      name: "The Aftermath",
      startYear: 585,
      durationYears: 100,
      description: "<p>Borders redrawn and old powers hollowed out. The Flanaess rebuilds under"
        + " the shadow of the Old One.</p>",
      color: "#3f6fa8"
    }
  ],
  holidays: [
    {
      month: 1, day: 4, days: 1, title: "Midwinter Night",
      content: "<p>The heart of Needfest, kept indoors with feasting and gift-giving through the"
        + " longest nights of the year, with Celene full overhead.</p>"
    },
    {
      month: 5, day: 4, days: 1, title: "Spring Equinox",
      content: "<p>The middle day of Growfest, when the planting is blessed and the year's"
        + " contracts and apprenticeships are struck.</p>"
    },
    {
      month: 9, day: 4, days: 1, title: "Midsummer Night",
      content: "<p>The middle day of Richfest, and the night both Luna and Celene are full"
        + " together. Held sacred by druids, and lucky for anything begun under it.</p>"
    },
    {
      month: 13, day: 4, days: 1, title: "Autumn Equinox",
      content: "<p>The middle day of Brewfest, when the harvest is in, the year's brewing is"
        + " broached, and the roads empty before winter.</p>"
    }
  ]
};
