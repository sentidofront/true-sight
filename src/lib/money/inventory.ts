import "server-only"

import { AD, type AdSeat } from "./config"
import { db, type AdOrder } from "./server"

/** An unpaid order holds its seat this long. Also the Stripe session expiry, which must be over 30 min. */
export const HOLD_MS = 35 * 60 * 1000

const holderOf = (seat: number) =>
  [...db.ads.values()].find((o) => o.seat === seat && o.status === "live")

const heldBy = (seat: number, now = Date.now()) =>
  [...db.ads.values()].find((o) => o.seat === seat && o.status === "pending" && now - o.createdAt < HOLD_MS)

export const takePrice = (seat: number) => {
  const h = holderOf(seat)
  return h ? h.price * 2 : AD.basePrice
}

export const isHeld = (seat: number) => !!heldBy(seat)

export function seats(): AdSeat[] {
  return Array.from({ length: AD.seats }, (_, seat) => {
    const h = holderOf(seat)
    return {
      seat,
      holder: h
        ? { id: h.id, sponsor: h.sponsor, landing: h.landing, image: `/api/ads/${h.id}/image`, price: h.price }
        : null,
      next: takePrice(seat),
      held: isHeld(seat),
    }
  })
}

/** Paid: the buyer takes the seat and whoever held it is marked outbid. */
export function takeSeat(order: AdOrder) {
  const prev = holderOf(order.seat)
  if (prev && prev.id !== order.id) prev.status = "outbid"
  order.status = "live"
  return prev
}
