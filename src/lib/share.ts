import { snapshot, type Office, type Race } from "@/lib/elections/replay"

export const OFFICE_LABEL: Record<Office, string> = { senate: "Senate", governor: "Governor", house: "House" }

/** "pa-senate", "pa-governor", "tx-7" */
export const raceSlug = (r: Race) => r.id.toLowerCase()

/** Share path, frozen at minute `t` of the night so the card and the page show the same numbers. */
export const sharePath = (r: Race, t: number) => `/r/${raceSlug(r)}/${Math.floor(t)}`

export function findRace(slug: string, t: number) {
  const snap = snapshot(Math.max(0, Math.min(600, t)))
  const all = [...snap.races.senate, ...snap.races.governor, ...snap.races.house]
  return all.find((r) => raceSlug(r) === slug.toLowerCase())
}

export function raceTitle(r: Race) {
  if (r.office !== "house") return `${r.state.name} ${OFFICE_LABEL[r.office]}`
  return r.state.house === 1 ? `${r.state.name} at-large` : `${r.state.abbr}-${String(r.district).padStart(2, "0")}`
}

const pct = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function raceStatus(r: Race) {
  if (r.status === "pending") return "Polls open"
  if (r.status === "called") return r.flip ? "Called · Flip" : "Called"
  return `${Math.round(r.counted * 100)}% counted`
}

/** One line for a post: "Pennsylvania Governor: Alvarez (D) 50.2%, Quinlan (R) 48.3% · 74% counted" */
export function shareText(r: Race) {
  const line = r.candidates
    .slice(0, 2)
    .map((c) => `${c.name.split(" ").at(-1)} (${c.party}) ${pct(c.pct)}%`)
    .join(", ")
  return `${raceTitle(r)}: ${r.status === "pending" ? "polls still open" : line} · ${raceStatus(r)}`
}
