"use client"

import { useState } from "react"
import NumberFlow from "@number-flow/react"
import { CheckIcon, XIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { partyColor } from "@/lib/elections/colors"
import { countyResults, formatET, type Candidate, type Office, type Race } from "@/lib/elections/replay"
import { useLive } from "@/lib/store"
import { fluent } from "@/lib/fluent"
import { ShareMenu } from "./share-menu"

const OFFICES: { value: Office; label: string }[] = [
  { value: "senate", label: "Senate" },
  { value: "governor", label: "Governor" },
  { value: "house", label: "House" },
]

const PARTY_NAME = { D: "Democrat", R: "Republican" } as const

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")

const pct = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Docked, non-modal: the map stays live and clickable while this is open. */
export function RacePanel({ docked }: { docked: "side" | "bottom" }) {
  const selection = useLive((s) => s.selection)
  const select = useLive((s) => s.select)
  const tab = useLive((s) => s.tab)
  const snap = useLive((s) => s.snap)

  const abbr = selection?.state
  const available = OFFICES.filter((o) => snap.races[o.value].some((r) => r.state.abbr === abbr))
  // Opens on the map's office when this state has that race; a tab picked here sticks for this state.
  const [picked, setPicked] = useState<{ abbr: string; office: Office } | null>(null)
  const office: Office =
    picked && picked.abbr === abbr
      ? picked.office
      : available.some((o) => o.value === tab)
        ? tab
        : (available[0]?.value ?? tab)

  const races = abbr ? snap.races[office].filter((r) => r.state.abbr === abbr) : []
  const title = selection?.county ? `${selection.county.name}, ${abbr}` : (races[0]?.state.name ?? abbr)

  const motionFrom = docked === "side" ? { x: 24, opacity: 0 } : { y: 24, opacity: 0 }
  const ease = [0, 0, 0, 1] as const // Fluent curveDecelerateMid

  return (
    <AnimatePresence>
      {selection && (
        <motion.div
          key="race-panel"
          initial={motionFrom}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={motionFrom}
          transition={{ duration: parseFloat(fluent.durationNormal) / 1000, ease }}
          className={
            docked === "side"
              ? "pointer-events-none absolute top-3 right-3 bottom-3 z-10 flex w-[340px] flex-col *:pointer-events-auto"
              : "pointer-events-none absolute inset-x-2 bottom-2 z-10 flex max-h-[48%] flex-col *:pointer-events-auto"
          }
        >
          <div className="flex min-h-0 flex-col rounded-sm bg-background">
            <div className="flex items-center gap-2 pt-3 pr-2 pl-4">
              <h2 className="min-w-0 flex-1 truncate font-heading text-2xl font-extrabold">{title}</h2>
              {races[0] && office !== "house" && <ShareMenu race={races[0]} t={snap.t} />}
              <Button variant="ghost" size="icon-sm" onClick={() => select(null)} aria-label="Close">
                <XIcon />
              </Button>
            </div>
            {available.length > 1 && (
              <Tabs value={office} onValueChange={(v) => abbr && setPicked({ abbr, office: v as Office })} className="px-3">
                <TabsList variant="line">
                  {available.map((o) => (
                    <TabsTrigger key={o.value} value={o.value}>
                      {o.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 pt-3 pb-4">
                {races.length === 0 ? null : office === "house" ? (
                  <HouseList races={races} />
                ) : (
                  <Statewide race={races[0]} county={selection.county?.fips} t={snap.t} />
                )}
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Statewide({ race, county, t }: { race: Race; county?: string; t: number }) {
  const local = county ? countyResults(race.id, [county], t).get(county) : undefined
  const candidates = local?.candidates ?? race.candidates
  const counted = local?.counted ?? race.counted

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {candidates.map((c) => (
          <CandidateRow key={c.id} c={c} won={!county && race.winner === c.party} />
        ))}
      </ul>
      <p className="tag">{statusText(race, counted, !!county)}</p>
    </div>
  )
}

/** One plain line: "Called · Flip · 93% counted", or the poll closing time. */
function statusText(race: Race, counted: number, county: boolean) {
  if (race.status === "pending") return `Polls close ${formatET((race.state.close - 18) * 60)} ET`
  const parts = [`${Math.round(counted * 100)}% counted`]
  if (!county && race.flip) parts.unshift("Flip")
  if (!county && race.status === "called") parts.unshift("Called")
  return parts.join(" · ")
}

function CandidateRow({ c, won }: { c: Candidate; won: boolean }) {
  const color = partyColor(c.party)
  return (
    <li className="flex items-center gap-3">
      <Avatar className="size-10" aria-label={PARTY_NAME[c.party]}>
        {c.photo && <AvatarImage src={c.photo} alt={c.name} />}
        <AvatarFallback className="text-sm font-semibold text-white" style={{ background: color }}>
          {initials(c.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{c.name}</span>
          {won && <CheckIcon className="size-4 shrink-0" strokeWidth={3} aria-label="Winner" />}
          <NumberFlow
            locales="en-US"
            className="numeric ml-auto text-2xl font-semibold"
            value={c.pct / 100}
            format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
          />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-mist">
          <div className="h-full transition-[width] duration-500 ease-fl-decelerate" style={{ width: `${c.pct}%`, background: color }} />
        </div>
      </div>
    </li>
  )
}

function HouseList({ races }: { races: Race[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {races.map((r) => {
        const lead = r.candidates[0]
        return (
          <li key={r.id} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-muted-foreground">
              {races.length === 1 ? "At large" : `District ${r.district}`}
            </span>
            {r.status === "pending" ? (
              <span className="tag">Polls close {formatET((r.state.close - 18) * 60)}</span>
            ) : (
              <>
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: partyColor(lead.party) }} />
                <span className="min-w-0 flex-1 truncate text-sm">{lead.name}</span>
                <span className="numeric text-sm font-semibold">{pct(lead.pct)}%</span>
                <span className="w-4">{r.winner && <CheckIcon className="size-4" strokeWidth={3} aria-label="Called" />}</span>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}
