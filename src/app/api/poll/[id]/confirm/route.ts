import { NextResponse } from "next/server"

import { getPoll, openPoll, toPublic } from "@/lib/money/polls"
import { stripe } from "@/lib/money/server"

/** Schedules the poll once its payment is confirmed. */
export async function POST(_req: Request, ctx: RouteContext<"/api/poll/[id]/confirm">) {
  const { id } = await ctx.params
  const p = getPoll(id)
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (p.status !== "pending") return NextResponse.json(toPublic(p))

  let ref = "test"
  if (stripe) {
    if (!p.sessionId) return NextResponse.json({ error: "unpaid" }, { status: 402 })
    const s = await stripe.checkout.sessions.retrieve(p.sessionId)
    if (s.payment_status !== "paid" || s.metadata?.poll !== p.id) {
      return NextResponse.json({ error: "unpaid" }, { status: 402 })
    }
    ref = `…${s.id.slice(-8)}`
  }
  return NextResponse.json(toPublic(openPoll(p, ref)))
}
