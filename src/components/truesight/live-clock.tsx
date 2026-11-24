"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useLive } from "@/lib/store"
import type { Race } from "@/lib/elections/replay"

const OFFICE_LABEL = { senate: "Senate", governor: "Governor", house: "House" } as const

/** Drives the demo replay. ?at=21:30 starts at 9:30 pm ET, ?speed=2 doubles it; `start` (minutes) wins over ?at. */
export function LiveClock({ start: startAt }: { start?: number }) {
  const setT = useLive((s) => s.setT)
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const [h, m] = (q.get("at") ?? "18:50").split(":").map(Number)
    const start = startAt ?? (h < 12 ? h + 24 : h) * 60 + (m || 0) - 18 * 60
    const speed = Number(q.get("speed") ?? 1)
    const origin = performance.now()

    const tick = () => {
      const t = Math.min(start + ((performance.now() - origin) / 1000) * speed, 600)
      setT(t)
      const snap = useLive.getState().snap
      const called = [...snap.races.senate, ...snap.races.governor].filter(
        (r) => r.status === "called"
      )
      if (!seen.current) {
        seen.current = new Set(called.map((r) => r.id))
        return
      }
      const fresh = called.filter((r) => !seen.current!.has(r.id))
      fresh.forEach((r) => seen.current!.add(r.id))
      fresh.slice(0, 3).forEach(announce)
      if (fresh.length > 3) toast(`+${fresh.length - 3} more calls`)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [setT, startAt])

  return null
}

function announce(r: Race) {
  const w = r.candidates.find((c) => c.party === r.winner)
  if (!w) return
  toast(`${r.state.abbr} ${OFFICE_LABEL[r.office]}${r.flip ? " · Flip" : ""}`, {
    description: `${w.name} (${w.party})`,
  })
}
