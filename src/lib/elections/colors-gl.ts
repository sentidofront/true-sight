/**
 * Map colors as RGBA numbers for WebGL (deck.gl can't read CSS variables).
 * Called = full party color, leading = one tint, then two navy slates that sit on the deep-navy ground.
 */
import type { CountyResult, Race } from "./replay"
import type { Party } from "./states"

export type RGBA = [number, number, number, number]

const hex = (h: string): RGBA => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255) as RGBA

// Saturated party colors; must match --ts-blue / --ts-red in globals.css.
export const PARTY_RGB: Record<Party, RGBA> = { D: hex("#2e9bff"), R: hex("#f2223a") }
/** No race this year: a navy slate, one step up from the ground. */
export const NOT_UP_RGB = hex("#1d2558")
/** Polls still open: a lighter slate. */
export const PENDING_RGB = hex("#39437f")
const TIE_RGB = hex("#6b76b8")

/** The map ground's base navy. Borders use it so they read as clean gaps, not outlines. */
const GROUND = hex("#070c2e")
export const GROUND_LINE: RGBA = GROUND
export const GROUND_LINE_SOFT: RGBA = [GROUND[0], GROUND[1], GROUND[2], 170]

/** `pct` of the party color, the rest white: the same tints the panels use. */
export function tintRGB(p: Party, pct: number): RGBA {
  const [r, g, b] = PARTY_RGB[p]
  const k = pct / 100
  return [r * k + 255 * (1 - k), g * k + 255 * (1 - k), b * k + 255 * (1 - k), 255]
}

export function raceRGB(race?: Race): RGBA {
  if (!race) return NOT_UP_RGB
  if (race.winner) return PARTY_RGB[race.winner]
  if (race.leader) return tintRGB(race.leader, 70)
  return PENDING_RGB
}

export function delegationRGB(races: Race[]): RGBA {
  if (races.length === 0) return NOT_UP_RGB
  let d = 0
  let r = 0
  let open = 0
  for (const x of races) {
    const p = x.winner ?? x.leader
    if (p === "D") d++
    else if (p === "R") r++
    if (!x.winner) open++
  }
  if (d + r === 0) return PENDING_RGB
  if (d === r) return TIE_RGB
  const p: Party = d > r ? "D" : "R"
  return open === 0 ? PARTY_RGB[p] : tintRGB(p, 70)
}

/** Counties show who leads, in the plain party color: no margin shades. */
export function countyRGB(c?: CountyResult): RGBA {
  if (!c || !c.leader) return PENDING_RGB
  return PARTY_RGB[c.leader]
}

/** Fade a color toward the ground for states outside the one in focus. */
export const dim = ([r, g, b]: RGBA): RGBA => [
  r * 0.3 + GROUND[0] * 0.7,
  g * 0.3 + GROUND[1] * 0.7,
  b * 0.3 + GROUND[2] * 0.7,
  255,
]
