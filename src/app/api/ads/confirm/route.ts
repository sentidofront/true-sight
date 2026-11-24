import { NextResponse } from "next/server"

import { takeSeat } from "@/lib/money/inventory"
import { db, stripe } from "@/lib/money/server"

/** Puts a paid order on its seat. No pre-review: the live monitor and takedown handle breaches. */
export async function POST(req: Request) {
  const { order, sessionId } = (await req.json().catch(() => ({}))) as { order?: string; sessionId?: string }
  const o = order ? db.ads.get(order) : undefined
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 })

  if (o.status === "pending") {
    if (stripe) {
      if (!sessionId) return NextResponse.json({ error: "unpaid" }, { status: 402 })
      const s = await stripe.checkout.sessions.retrieve(sessionId)
      if (s.payment_status !== "paid" || s.metadata?.order !== o.id) {
        return NextResponse.json({ error: "unpaid" }, { status: 402 })
      }
    }
    // TODO: decide what an outbid sponsor gets back (nothing, pro-rata, full). Nothing is refunded today.
    takeSeat(o)
  }
  return NextResponse.json({ id: o.id, seat: o.seat, price: o.price, sponsor: o.sponsor, status: o.status })
}
