import { NextResponse } from "next/server"

import { db, stripe } from "@/lib/money/server"

/** Returns the superchat to post only once its payment is confirmed. Posting twice is refused. */
export async function POST(req: Request) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string }
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 })

  const existing = db.superchats.get(id)
  if (existing?.paid) return NextResponse.json({ error: "used" }, { status: 409 })

  if (id.startsWith("demo_")) {
    if (!existing || stripe) return NextResponse.json({ error: "not found" }, { status: 404 })
    existing.paid = true
    return NextResponse.json(existing)
  }

  if (!stripe) return NextResponse.json({ error: "not found" }, { status: 404 })
  const s = await stripe.checkout.sessions.retrieve(id)
  if (s.payment_status !== "paid" || s.metadata?.kind !== "superchat") {
    return NextResponse.json({ error: "unpaid" }, { status: 402 })
  }
  const chat = {
    id,
    name: s.metadata.name,
    text: s.metadata.text,
    amount: Number(s.metadata.amount),
    paid: true,
  }
  db.superchats.set(id, chat)
  return NextResponse.json(chat)
}
