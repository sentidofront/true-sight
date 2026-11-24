export type Party = "D" | "R"

export type StateInfo = {
  fips: string
  abbr: string
  name: string
  house: number
  /** Last poll close, hours ET on election night (25 = 1 am). Replace with provider data. */
  close: number
  /** Demo seed only: rough R margin (points). Not a forecast. */
  lean: number
}

// prettier-ignore
export const STATES: StateInfo[] = [
  { fips: "01", abbr: "AL", name: "Alabama", house: 7, close: 20, lean: 30 },
  { fips: "02", abbr: "AK", name: "Alaska", house: 1, close: 25, lean: 13 },
  { fips: "04", abbr: "AZ", name: "Arizona", house: 9, close: 21, lean: 5.5 },
  { fips: "05", abbr: "AR", name: "Arkansas", house: 4, close: 20.5, lean: 31 },
  { fips: "06", abbr: "CA", name: "California", house: 52, close: 23, lean: -20 },
  { fips: "08", abbr: "CO", name: "Colorado", house: 8, close: 21, lean: -11 },
  { fips: "09", abbr: "CT", name: "Connecticut", house: 5, close: 20, lean: -14.5 },
  { fips: "10", abbr: "DE", name: "Delaware", house: 1, close: 20, lean: -14.7 },
  { fips: "11", abbr: "DC", name: "District of Columbia", house: 0, close: 20, lean: -84 },
  { fips: "12", abbr: "FL", name: "Florida", house: 28, close: 20, lean: 13 },
  { fips: "13", abbr: "GA", name: "Georgia", house: 14, close: 19, lean: 2.2 },
  { fips: "15", abbr: "HI", name: "Hawaii", house: 2, close: 24, lean: -23 },
  { fips: "16", abbr: "ID", name: "Idaho", house: 2, close: 23, lean: 36.5 },
  { fips: "17", abbr: "IL", name: "Illinois", house: 17, close: 20, lean: -11 },
  { fips: "18", abbr: "IN", name: "Indiana", house: 9, close: 19, lean: 19 },
  { fips: "19", abbr: "IA", name: "Iowa", house: 4, close: 21, lean: 13 },
  { fips: "20", abbr: "KS", name: "Kansas", house: 4, close: 21, lean: 16 },
  { fips: "21", abbr: "KY", name: "Kentucky", house: 6, close: 19, lean: 30.5 },
  { fips: "22", abbr: "LA", name: "Louisiana", house: 6, close: 21, lean: 22 },
  { fips: "23", abbr: "ME", name: "Maine", house: 2, close: 20, lean: -7 },
  { fips: "24", abbr: "MD", name: "Maryland", house: 8, close: 20, lean: -28.5 },
  { fips: "25", abbr: "MA", name: "Massachusetts", house: 9, close: 20, lean: -25 },
  { fips: "26", abbr: "MI", name: "Michigan", house: 13, close: 21, lean: 1.4 },
  { fips: "27", abbr: "MN", name: "Minnesota", house: 8, close: 21, lean: -4.2 },
  { fips: "28", abbr: "MS", name: "Mississippi", house: 4, close: 20, lean: 23 },
  { fips: "29", abbr: "MO", name: "Missouri", house: 8, close: 20, lean: 18 },
  { fips: "30", abbr: "MT", name: "Montana", house: 2, close: 22, lean: 20 },
  { fips: "31", abbr: "NE", name: "Nebraska", house: 3, close: 21, lean: 20.5 },
  { fips: "32", abbr: "NV", name: "Nevada", house: 4, close: 22, lean: 3.1 },
  { fips: "33", abbr: "NH", name: "New Hampshire", house: 2, close: 20, lean: -2.8 },
  { fips: "34", abbr: "NJ", name: "New Jersey", house: 12, close: 20, lean: -5.9 },
  { fips: "35", abbr: "NM", name: "New Mexico", house: 3, close: 21, lean: -6 },
  { fips: "36", abbr: "NY", name: "New York", house: 26, close: 21, lean: -12.6 },
  { fips: "37", abbr: "NC", name: "North Carolina", house: 14, close: 19.5, lean: 3.2 },
  { fips: "38", abbr: "ND", name: "North Dakota", house: 1, close: 22, lean: 36 },
  { fips: "39", abbr: "OH", name: "Ohio", house: 15, close: 19.5, lean: 11 },
  { fips: "40", abbr: "OK", name: "Oklahoma", house: 5, close: 20, lean: 34 },
  { fips: "41", abbr: "OR", name: "Oregon", house: 6, close: 23, lean: -14.3 },
  { fips: "42", abbr: "PA", name: "Pennsylvania", house: 17, close: 20, lean: 1.7 },
  { fips: "44", abbr: "RI", name: "Rhode Island", house: 2, close: 20, lean: -13.8 },
  { fips: "45", abbr: "SC", name: "South Carolina", house: 7, close: 19, lean: 18 },
  { fips: "46", abbr: "SD", name: "South Dakota", house: 1, close: 21, lean: 29 },
  { fips: "47", abbr: "TN", name: "Tennessee", house: 9, close: 20, lean: 29.7 },
  { fips: "48", abbr: "TX", name: "Texas", house: 38, close: 21, lean: 13.7 },
  { fips: "49", abbr: "UT", name: "Utah", house: 4, close: 22, lean: 21.6 },
  { fips: "50", abbr: "VT", name: "Vermont", house: 1, close: 19, lean: -32 },
  { fips: "51", abbr: "VA", name: "Virginia", house: 11, close: 19, lean: -5.8 },
  { fips: "53", abbr: "WA", name: "Washington", house: 10, close: 23, lean: -18 },
  { fips: "54", abbr: "WV", name: "West Virginia", house: 2, close: 19.5, lean: 41.9 },
  { fips: "55", abbr: "WI", name: "Wisconsin", house: 8, close: 21, lean: 0.9 },
  { fips: "56", abbr: "WY", name: "Wyoming", house: 1, close: 21, lean: 45.8 },
]

export const STATE_BY_FIPS = new Map(STATES.map((s) => [s.fips, s]))

/** Senate 2026: 33 class II seats + Ohio and Florida specials, with the party holding each seat now. */
export const SENATE_UP: Record<string, Party> = {
  AL: "R", AK: "R", AR: "R", CO: "D", DE: "D", FL: "R", GA: "D", ID: "R",
  IL: "D", IA: "R", KS: "R", KY: "R", LA: "R", ME: "R", MA: "D", MI: "D",
  MN: "D", MS: "R", MT: "R", NE: "R", NH: "D", NJ: "D", NM: "D", NC: "R",
  OH: "R", OK: "R", OR: "D", RI: "D", SC: "R", SD: "R", TN: "R", TX: "R",
  VA: "D", WV: "R", WY: "R",
}

/** Seats not up in 2026 (Democrats include the two independents who caucus with them). */
export const SENATE_NOT_UP = { D: 34, R: 31 }

/** Governor 2026: 36 races, with the party holding the office now. */
export const GOVERNOR_UP: Record<string, Party> = {
  AL: "R", AK: "R", AZ: "D", AR: "R", CA: "D", CO: "D", CT: "D", FL: "R",
  GA: "R", HI: "D", ID: "R", IL: "D", IA: "R", KS: "D", ME: "D", MD: "D",
  MA: "D", MI: "D", MN: "D", NE: "R", NV: "R", NH: "R", NM: "D", NY: "D",
  OH: "R", OK: "R", OR: "D", PA: "D", RI: "D", SC: "R", SD: "R", TN: "R",
  TX: "R", VT: "R", WI: "D", WY: "R",
}

export const CONTROL = { senate: 51, house: 218 } as const
