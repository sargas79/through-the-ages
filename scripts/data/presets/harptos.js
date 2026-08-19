/**
 * Forgotten Realms — the Calendar of Harptos, dated in Dale Reckoning.
 *
 * Twelve months of thirty days with five festival days standing between them.
 * The festivals are ordinary one-day months here, which is what makes the
 * 365-day year come out exactly right.
 *
 * Shieldmeet is deliberately absent: it falls only in leap years, which this
 * module does not model.
 */

export const HARPTOS = {
  id: "harptos",
  yearLength: 365,
  calendar: {
    monthsPerYear: 17,
    daysPerMonth: 30,
    monthNames: [
      "Hammer", "Midwinter", "Alturiak", "Ches", "Tarsakh", "Greengrass",
      "Mirtul", "Kythorn", "Flamerule", "Midsummer", "Eleasis", "Eleint",
      "Higharvestide", "Marpenoth", "Uktar", "Feast of the Moon", "Nightal"
    ],
    monthLengths: [30, 1, 30, 30, 30, 1, 30, 30, 30, 1, 30, 30, 1, 30, 30, 1, 30],
    weekdayNames: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"],
    weekdayAnchor: { date: { year: 1495, month: 1, day: 1 }, weekday: 0 },
    currentDate: { year: 1495, month: 1, day: 1 },
    currentTime: { hour: 8, minute: 0 },
    yearPrefix: "",
    yearSuffix: "DR",
    moons: [
      {
        name: "Selûne",
        cycleLength: 30.45,
        phaseCount: 8,
        color: "#e6e9f2",
        showInGrid: true,
        playerVisible: true,
        // Canon holds Midsummer night under a full moon.
        anchor: { date: { year: 1495, month: 10, day: 1 }, phase: "full" }
      }
    ]
  },
  /** Where this preset knowingly departs from the setting, shown when it loads. */
  caveats: [
    "TTA.Presets.harptos.Caveat.Shieldmeet",
    "TTA.Presets.harptos.Caveat.Tenday"
  ],
  ages: [
    {
      name: "The Age of Humanity",
      startYear: 1,
      durationYears: 1357,
      description: "<p>Dale Reckoning begins with the pact struck between the elves of Cormanthor"
        + " and the first settlers of the Dalelands. Human realms rise across Faerûn.</p>",
      color: "#6d7f4a"
    },
    {
      name: "The Era of Upheaval",
      startYear: 1358,
      durationYears: 130,
      description: "<p>The Time of Troubles casts the gods down into Faerûn, and the"
        + " Spellplague that follows unmakes the Weave and redraws the world.</p>",
      color: "#8f3d2e"
    },
    {
      name: "The Sundered Era",
      startYear: 1488,
      durationYears: 113,
      description: "<p>The Second Sundering restores much of what was lost, and the Realms settle"
        + " into a shape their grandparents would recognise.</p>",
      color: "#3f6fa8"
    }
  ],
  holidays: [
    {
      month: 2, day: 1, days: 1, title: "Midwinter",
      content: "<p>Also called Deadwinter Day, marking the midpoint of winter. Lords hold feasts"
        + " and renew their alliances for the year to come.</p>"
    },
    { month: 4, day: 19, days: 1, title: "Spring Equinox", content: "" },
    {
      month: 6, day: 1, days: 1, title: "Greengrass",
      content: "<p>A festival welcoming the first day of spring, when flowers are brought out of"
        + " hothouses and strewn about in celebration.</p>"
    },
    { month: 9, day: 20, days: 1, title: "Summer Solstice", content: "" },
    {
      month: 10, day: 1, days: 1, title: "Midsummer",
      content: "<p>Midsummer Night is given over to love and music. Feasts run until dawn and"
        + " betrothals are traditionally announced beneath a full moon.</p>"
    },
    { month: 12, day: 21, days: 1, title: "Autumn Equinox", content: "" },
    {
      month: 13, day: 1, days: 1, title: "Higharvestide",
      content: "<p>The harvest feast. Travel begins the day after, as merchants and adventurers"
        + " set out before the roads close for winter.</p>"
    },
    {
      month: 16, day: 1, days: 1, title: "Feast of the Moon",
      content: "<p>The last festival of the year, honouring the dead. Graves are blessed, ancestors"
        + " are remembered, and the tales of the fallen are told again.</p>"
    },
    { month: 17, day: 20, days: 1, title: "Winter Solstice", content: "" }
  ]
};
