"use client"

import NumberFlow from "@number-flow/react"

import { partyColor, tint } from "@/lib/elections/colors"
import { useLive } from "@/lib/store"

const PARTY_NAME = { D: "Democrats", R: "Republicans" } as const

/** Seats held or won in the party color, seats only leading in one lighter shade, the rest neutral. */
export function BalanceBar() {
  const tab = useLive((s) => s.tab)
  const totals = useLive((s) => s.snap.totals[tab])
  const { seats, control } = totals
  const d = totals.baseD + totals.calledD
  const r = totals.baseR + totals.calledR

  const seg = (n: number) => `${(n / seats) * 100}%`
  const segments = [
    { n: d, fill: partyColor("D") },
    { n: totals.leadD, fill: tint("D", 55) },
    { n: seats - d - r - totals.leadD - totals.leadR, fill: "#2a3570" },
    { n: totals.leadR, fill: tint("R", 55) },
    { n: r, fill: partyColor("R") },
  ]

  return (
    <section className="flex items-center gap-4 px-4 pt-0.5 pb-3 sm:gap-6">
      <Count party="D" value={d} />
      <div className="relative flex-1">
        <div className="relative flex h-2.5 overflow-hidden rounded-full">
          {segments.map((s, i) => (
            <div
              key={i}
              className="h-full transition-[width] duration-700 ease-fl-decelerate"
              style={{ width: seg(s.n), background: s.fill }}
            />
          ))}
        </div>
        {control && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-[-5px] left-1/2 w-0.5 -translate-x-1/2 bg-white" />
            <span className="numeric absolute top-full left-1/2 mt-1 -translate-x-1/2 text-xs text-white">{control}</span>
          </>
        )}
      </div>
      <Count party="R" value={r} />
    </section>
  )
}

function Count({ party, value }: { party: "D" | "R"; value: number }) {
  return (
    <span aria-label={`${PARTY_NAME[party]} ${value}`} style={{ color: partyColor(party) }}>
      <NumberFlow locales="en-US" className="display text-3xl leading-none font-black sm:text-4xl" value={value} />
    </span>
  )
}
