import { NextResponse } from "next/server"
import { z } from "zod"

import { POLL } from "@/lib/money/config"
import { createPoll, currentPoll, toPublic } from "@/lib/money/polls"
import { originOf, stripe } from "@/lib/money/server"

const Body = z.object({
  creator: z.string().trim().min(1).max(32),
  question: z.string().trim().min(3).max(POLL.questionChars),
  options: z
    .array(z.string().trim().min(1).max(POLL.optionChars))
    .min(POLL.minOptions)
    .max(POLL.maxOptions)
    .refine((o) => new Set(o.map((x) => x.toLowerCase())).size === o.length),
})

/** The poll on screen right now, with live tallies. */
export async function GET(req: Request) {
  const voter = new URL(req.url).searchParams.get("voter") ?? undefined
  const p = currentPoll()
  return NextResponse.json(p ? toPublic(p, voter) : null, { headers: { "cache-control": "no-store" } })
}

/** Starts a paid poll. Payment first; the poll is scheduled only once paid. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 })

  // TODO: same electoral-advocacy check as superchats, before payment.

  const p = createPoll(parsed.data)
  if (!stripe) return NextResponse.json({ id: p.id, demo: true })

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    redirect_on_completion: "never",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: POLL.price * 100,
          product_data: { name: `True Sight chat poll · ${POLL.seconds}s` },
        },
      },
    ],
    metadata: { kind: "poll", poll: p.id },
    return_url: `${originOf(req)}/?poll=${p.id}`,
  })
  p.sessionId = session.id
  return NextResponse.json({ id: p.id, clientSecret: session.client_secret })
}
