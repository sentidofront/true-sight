import { NextResponse } from "next/server"

import { seats } from "@/lib/money/inventory"

/** The five seats with their holders and take-over prices, plus server time so every viewer rotates in sync. */
export async function GET() {
  return NextResponse.json({ seats: seats(), now: Date.now() }, { headers: { "cache-control": "no-store" } })
}
