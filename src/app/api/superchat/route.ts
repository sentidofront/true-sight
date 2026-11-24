import { NextResponse } from "next/server"
import { z } from "zod"

import { tierFor } from "@/lib/money/config"
import { db, newId, originOf, stripe } from "@/lib/money/server"

const Body = z.object({
  name: z.string().trim().min(1).max(32),
  text: z.string().trim().min(1).max(300),
  amount: z.number().int(),
})

/** Starts a superchat payment. Returns an Embedded Checkout client secret, or a demo id without Stripe keys. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 })
  const { name, text, amount } = parsed.data
  const tier = tierFor(amount)
  if (!tier || text.length > tier.chars) return NextResponse.json({ error: "invalid" }, { status: 400 })

  // TODO: electoral-advocacy check (Haiku) goes here, before any payment is taken.

  if (!stripe) {
    const id = `demo_${newId()}`
    db.superchats.set(id, { id, name, text, amount, paid: false })
    return NextResponse.json({ id, demo: true })
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    redirect_on_completion: "never",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount * 100,
          product_data: { name: `True Sight superchat · $${amount}` },
        },
      },
    ],
    metadata: { kind: "superchat", name, text, amount: String(amount) },
    return_url: `${originOf(req)}/?superchat={CHECKOUT_SESSION_ID}`,
  })
  return NextResponse.json({ id: session.id, clientSecret: session.client_secret })
}
