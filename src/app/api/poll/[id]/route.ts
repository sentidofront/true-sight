import { NextResponse } from "next/server"

import { auditOf, getPoll } from "@/lib/money/polls"

/** Public audit record: every event, hash-chained, plus a fresh verification of the chain. */
export async function GET(_req: Request, ctx: RouteContext<"/api/poll/[id]">) {
  const { id } = await ctx.params
  const p = getPoll(id)
  if (!p || p.status === "pending") return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(auditOf(p), { headers: { "cache-control": "no-store" } })
}
