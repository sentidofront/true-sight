import { NextResponse } from "next/server"
import { imageSize } from "image-size"
import { z } from "zod"

import { AD, AD_MAX_BYTES, AD_TYPES, ROMAN } from "@/lib/money/config"
import { HOLD_MS, isHeld, takePrice } from "@/lib/money/inventory"
import { db, newId, originOf, stripe } from "@/lib/money/server"

const Fields = z.object({
  seat: z.coerce.number().int().min(0).max(AD.seats - 1),
  /** The price the buyer saw. Refused if the seat changed hands since. */
  price: z.coerce.number().int().positive(),
  sponsor: z.string().trim().min(2).max(120),
  email: z.email(),
  landing: z.url({ protocol: /^https$/ }),
  notPolitical: z.literal("on"),
  rights: z.literal("on"),
  outbid: z.literal("on"),
})

/** Creates a seat order and its payment. The creative is checked here, by code, not by a reviewer. */
export async function POST(req: Request) {
  const form = await req.formData()
  const parsed = Fields.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")))
  const file = form.get("creative")
  if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: "invalid" }, { status: 400 })
  const { seat, price, sponsor, email, landing } = parsed.data

  if (!AD_TYPES.includes(file.type) || file.size > AD_MAX_BYTES) {
    return NextResponse.json({ error: "creative" }, { status: 400 })
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const dims = (() => {
    try {
      return imageSize(bytes)
    } catch {
      return null
    }
  })()
  if (!dims || dims.width !== AD.width || dims.height !== AD.height) {
    return NextResponse.json({ error: "size" }, { status: 400 })
  }
  if (isHeld(seat)) return NextResponse.json({ error: "held" }, { status: 409 })
  if (takePrice(seat) !== price) return NextResponse.json({ error: "price changed", price: takePrice(seat) }, { status: 409 })

  const id = newId()
  db.ads.set(id, { id, seat, price, sponsor, email, landing, image: { type: file.type, bytes }, status: "pending", createdAt: Date.now() })

  if (!stripe) return NextResponse.json({ url: `/advertise/done?order=${id}` })

  const origin = originOf(req)
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    invoice_creation: { enabled: true },
    expires_at: Math.floor((Date.now() + HOLD_MS) / 1000),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: price * 100,
          product_data: { name: `True Sight ad · seat ${ROMAN[seat]}`, description: sponsor },
        },
      },
    ],
    metadata: { kind: "ad", order: id },
    success_url: `${origin}/advertise/done?order=${id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/advertise?seat=${seat}`,
  })
  return NextResponse.json({ url: session.url })
}
