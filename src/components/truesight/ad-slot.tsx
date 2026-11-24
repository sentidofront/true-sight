"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"

import { AD, schedule, type AdSeat } from "@/lib/money/config"
import { cn } from "@/lib/utils"

/** Which seat is on screen at server time `t`. Every viewer computes the same answer. */
function onScreen(seats: AdSeat[], t: number) {
  const plan = schedule(seats)
  const total = plan.reduce((a, p) => a + p.seconds, 0)
  if (!total) return null
  let x = (t / 1000) % total
  for (const p of plan) {
    if (x < p.seconds) return p.seat
    x -= p.seconds
  }
  return plan[0].seat
}

/** The one ad placement, laid over the map by the caller. A house ad sells the seats when all are open. */
export function AdSlot({ className }: { className?: string }) {
  const [seats, setSeats] = useState<AdSeat[]>([])
  const [skew, setSkew] = useState(0)
  const [now, setNow] = useState(0)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const res = await fetch("/api/ads", { cache: "no-store" }).catch(() => null)
      if (!res?.ok || !alive) return
      const data = (await res.json()) as { seats: AdSeat[]; now: number }
      setSeats(data.seats)
      setSkew(data.now - Date.now())
    }
    load()
    const poll = window.setInterval(load, 10_000)
    const clock = window.setInterval(() => setNow(Date.now()), 500)
    return () => {
      alive = false
      window.clearInterval(poll)
      window.clearInterval(clock)
    }
  }, [])

  const seat = onScreen(seats, now + skew)
  const ad = seat?.holder

  return (
    <div className={cn("pointer-events-auto rounded-sm bg-background p-1", className)} style={{ width: AD.width + 10 }}>
      <div className="flex max-w-full flex-col gap-1">
        <div
          className="relative w-full overflow-hidden rounded-[2px] bg-card"
          style={{ aspectRatio: `${AD.width} / ${AD.height}` }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {ad ? (
              <motion.a
                key={ad.id}
                href={ad.landing}
                target="_blank"
                rel="sponsored noopener"
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size sponsor creative from our own API */}
                <img src={ad.image} alt={ad.sponsor} className="size-full object-cover" />
              </motion.a>
            ) : (
              <motion.div key="house" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <Link
                  href="/advertise"
                  className="flex size-full items-center justify-center bg-mist transition-colors hover:bg-line"
                >
                  <span className="font-heading text-base font-bold">Advertise here</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-baseline gap-2 px-0.5">
          <span className="tag min-w-0 truncate text-[10px]">{ad ? `Ad · ${ad.sponsor}` : "Ad"}</span>
          {seat && (
            <Link
              href={`/advertise?seat=${seat.seat}`}
              className="tag ml-auto shrink-0 text-[10px] !text-electric underline-offset-2 hover:underline"
            >
              Buy this spot · <span className="numeric">${seat.next.toLocaleString("en-US")}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
