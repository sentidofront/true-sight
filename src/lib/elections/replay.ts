/**
 * Demo replay: a deterministic fake election night, as a pure function of time.
 * t = minutes after 6:00 pm ET. Same t always gives the same numbers.
 * Replaced by the results provider's snapshots once the feed is signed.
 */
import {
  CONTROL,
  GOVERNOR_UP,
  SENATE_NOT_UP,
  SENATE_UP,
  STATES,
  type Party,
  type StateInfo,
} from "./states"

export type Office = "senate" | "house" | "governor"
export type Status = "pending" | "counting" | "called"

export type Candidate = {
  id: string
  name: string
  party: Party
  votes: number
  pct: number
  photo?: string
}

export type Race = {
  id: string
  office: Office
  state: StateInfo
  district?: number
  status: Status
  counted: number
  candidates: Candidate[]
  leader: Party | null
  winner: Party | null
  holder?: Party
  flip: boolean
}

export type Totals = {
  calledD: number
  calledR: number
  leadD: number
  leadR: number
  baseD: number
  baseR: number
  seats: number
  control?: number
}

export type Snapshot = {
  t: number
  races: Record<Office, Race[]>
  totals: Record<Office, Totals>
}

/** Demo midterm environment, points toward D. */
const ENV = -3
const SLOW_COUNT = new Set(["CA", "AZ", "NV", "AK", "OR", "WA", "UT"])

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function seeded(key: string) {
  let a = hash(key)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = ["Maria", "James", "Elena", "Robert", "Grace", "Daniel", "Sofia", "Marcus", "Hannah", "Victor", "Laura", "Thomas", "Nadia", "Paul", "Irene", "Caleb", "Rosa", "Henry", "Julia", "Owen"]
const LAST = ["Alvarez", "Brennan", "Carter", "Delgado", "Ellison", "Foster", "Garrett", "Hayes", "Ibarra", "Jensen", "Keller", "Lawson", "Mercer", "Navarro", "Okafor", "Price", "Quinlan", "Ramsey", "Sutton", "Whitaker"]

type Params = {
  id: string
  office: Office
  state: StateInfo
  district?: number
  holder?: Party
  close: number
  tau: number
  margin: number
  drift: number
  turnout: number
  other: number
  callAt: number
  names: Record<Party, string>
}

function params(office: Office, state: StateInfo, district?: number, holder?: Party): Params {
  const id = district ? `${state.abbr}-${district}` : `${state.abbr}-${office}`
  const r = seeded(id)
  const spread = office === "house" ? 22 : 7
  const margin = state.lean + ENV + (r() + r() + r() - 1.5) * spread
  const abs = Math.abs(margin)
  const pick = (arr: string[]) => arr[Math.floor(r() * arr.length)]
  return {
    id,
    office,
    state,
    district,
    holder,
    close: (state.close - 18) * 60,
    tau: SLOW_COUNT.has(state.abbr) ? 260 + r() * 120 : 40 + r() * 70,
    margin,
    drift: (r() * 2 - 1) * 8,
    turnout:
      office === "house"
        ? 230_000 + r() * 90_000
        : Math.max(1, state.house) * (240_000 + r() * 60_000),
    other: 0.012 + r() * 0.025,
    callAt: abs > 20 ? 0 : abs > 10 ? 0.25 : abs > 5 ? 0.55 : abs > 2 ? 0.8 : 0.95,
    names: { D: `${pick(FIRST)} ${pick(LAST)}`, R: `${pick(FIRST)} ${pick(LAST)}` },
  }
}

function shares(margin: number, other: number) {
  const r = (1 - other) * (0.5 + margin / 200)
  return { R: r, D: 1 - other - r }
}

function candidates(p: Params, votes: number, margin: number): Candidate[] {
  const s = shares(margin, p.other)
  return (["D", "R"] as Party[])
    .map((party) => ({
      id: `${p.id}-${party}`,
      name: p.names[party],
      party,
      votes: Math.round(votes * s[party]),
      pct: s[party] * 100,
    }))
    .sort((a, b) => b.votes - a.votes)
}

function counted(p: Params, t: number) {
  const dt = t - p.close
  return dt < 0 ? 0 : Math.min(0.995, 1 - Math.exp(-dt / p.tau))
}

function evaluate(p: Params, t: number): Race {
  const c = counted(p, t)
  const winnerParty: Party = p.margin > 0 ? "R" : "D"
  const live = t >= p.close
  const called = live && c >= p.callAt
  const margin = p.margin + p.drift * (1 - c)
  return {
    id: p.id,
    office: p.office,
    state: p.state,
    district: p.district,
    holder: p.holder,
    status: !live ? "pending" : called ? "called" : "counting",
    counted: c,
    candidates: candidates(p, p.turnout * c, margin),
    leader: c > 0 ? (margin > 0 ? "R" : "D") : null,
    winner: called ? winnerParty : null,
    flip: called && !!p.holder && p.holder !== winnerParty,
  }
}

const PARAMS: Record<Office, Params[]> = {
  senate: STATES.filter((s) => SENATE_UP[s.abbr]).map((s) =>
    params("senate", s, undefined, SENATE_UP[s.abbr])
  ),
  governor: STATES.filter((s) => GOVERNOR_UP[s.abbr]).map((s) =>
    params("governor", s, undefined, GOVERNOR_UP[s.abbr])
  ),
  house: STATES.flatMap((s) =>
    Array.from({ length: s.house }, (_, i) => params("house", s, i + 1))
  ),
}

const PARAMS_BY_ID = new Map(Object.values(PARAMS).flat().map((p) => [p.id, p]))

function tally(races: Race[], seats: number, base = { D: 0, R: 0 }, control?: number): Totals {
  const t: Totals = { calledD: 0, calledR: 0, leadD: 0, leadR: 0, baseD: base.D, baseR: base.R, seats, control }
  for (const r of races) {
    if (r.winner === "D") t.calledD++
    else if (r.winner === "R") t.calledR++
    else if (r.leader === "D") t.leadD++
    else if (r.leader === "R") t.leadR++
  }
  return t
}

export function snapshot(t: number): Snapshot {
  const races = {
    senate: PARAMS.senate.map((p) => evaluate(p, t)),
    governor: PARAMS.governor.map((p) => evaluate(p, t)),
    house: PARAMS.house.map((p) => evaluate(p, t)),
  }
  return {
    t,
    races,
    totals: {
      senate: tally(races.senate, 100, SENATE_NOT_UP, CONTROL.senate),
      house: tally(races.house, 435, undefined, CONTROL.house),
      governor: tally(races.governor, races.governor.length),
    },
  }
}

export type CountyResult = {
  fips: string
  counted: number
  leader: Party | null
  margin: number
  candidates: Candidate[]
}

/** County split of a statewide race. Weighted county margins average back to the state margin. */
export function countyResults(raceId: string, countyFips: string[], t: number): Map<string, CountyResult> {
  const p = PARAMS_BY_ID.get(raceId)
  const out = new Map<string, CountyResult>()
  if (!p || countyFips.length === 0) return out
  const c = counted(p, t)
  const stateMargin = p.margin + p.drift * (1 - c)
  const raw = countyFips.map((f) => {
    const r = seeded(`${raceId}:${f}`)
    return {
      f,
      w: 0.2 + r() ** 2 * 6,
      off: (r() * 2 - 1) * 32,
      pace: 0.55 + r() * 0.9,
      // Early vote vs late vote: the first ballots counted lean one way and the lead fades as the rest arrive,
      // so close counties really change hands during the night.
      swing: (r() * 2 - 1) * 18,
    }
  })
  const sumW = raw.reduce((a, x) => a + x.w, 0)
  const meanOff = raw.reduce((a, x) => a + x.w * x.off, 0) / sumW
  for (const x of raw) {
    const cc = Math.min(1, c * x.pace)
    const m = Math.max(-90, Math.min(90, stateMargin + x.off - meanOff + x.swing * (1 - cc) ** 1.5))
    out.set(x.f, {
      fips: x.f,
      counted: cc,
      leader: cc > 0 ? (m > 0 ? "R" : "D") : null,
      margin: m,
      candidates: candidates(p, (p.turnout * x.w * cc) / sumW, m),
    })
  }
  return out
}

/** Minutes after 6 pm ET → "9:41 PM". */
export function formatET(t: number) {
  const total = Math.floor(18 * 60 + t)
  const h24 = Math.floor(total / 60) % 24
  const m = total % 60
  const h = h24 % 12 || 12
  return `${h}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`
}
