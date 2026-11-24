import "server-only"

import Stripe from "stripe"

/** Null until STRIPE_SECRET_KEY is set: the app then runs payments in demo mode. */
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

export type Superchat = { id: string; name: string; text: string; amount: number; paid: boolean }

export type AdOrder = {
  id: string
  seat: number
  /** What this buyer paid for the seat (USD). Sets the next take-over price and the screen-time share. */
  price: number
  sponsor: string
  email: string
  landing: string
  image: { type: string; bytes: Uint8Array }
  /** outbid = someone paid double and took the seat. */
  status: "pending" | "live" | "outbid" | "removed"
  createdAt: number
}

// In-memory until Supabase is wired. Kept on globalThis so dev hot reloads don't wipe it.
type Store = { superchats: Map<string, Superchat>; ads: Map<string, AdOrder> }
const g = globalThis as unknown as { __truesight?: Store }
export const db: Store = (g.__truesight ??= { superchats: new Map(), ads: new Map() })

export const newId = () => crypto.randomUUID()

export function originOf(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
}
