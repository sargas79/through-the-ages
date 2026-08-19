/**
 * The real-world Gregorian calendar, for campaigns set on Earth.
 *
 * Twelve months of the familiar lengths and a seven-day week. The leap day is
 * not modelled — this module has no leap years — so the calendar runs 365 days
 * every year and slips one day against reality every four years. Both anchors
 * below are therefore exact on 1 January 2026 and drift slowly from there.
 */

export const GREGORIAN = {
  id: "gregorian",
  yearLength: 365,
  calendar: {
    monthsPerYear: 12,
    daysPerMonth: 31,
    monthNames: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ],
    monthLengths: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    weekdayNames: [
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ],
    // 1 January 2026 is a Thursday.
    weekdayAnchor: { date: { year: 2026, month: 1, day: 1 }, weekday: 3 },
    currentDate: { year: 2026, month: 1, day: 1 },
    currentTime: { hour: 8, minute: 0 },
    yearPrefix: "",
    yearSuffix: "",
    moons: [
      {
        name: "The Moon",
        cycleLength: 29.5306,
        phaseCount: 8,
        color: "#f2f3f5",
        showInGrid: true,
        playerVisible: true,
        // The new moon of 18 January 2026.
        anchor: { date: { year: 2026, month: 1, day: 18 }, phase: "new" }
      }
    ]
  },
  /** Where this preset knowingly departs from the setting, shown when it loads. */
  caveats: [
    "TTA.Presets.gregorian.Caveat.LeapDay"
  ],
  ages: [
    {
      name: "The Common Era",
      startYear: 1,
      durationYears: 2100,
      description: "<p>Years counted from the traditional start of the Common Era.</p>",
      color: "#3f6fa8"
    }
  ],
  /**
   * No holidays ship with this preset: which days matter depends entirely on
   * where and when a campaign is set. Add your own from the calendar window.
   */
  holidays: []
};
