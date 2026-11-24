import { NextResponse } from "next/server"
import { z } from "zod"

import { getPoll, toPublic, vote } from "@/lib/money/polls"

const Body = z.object({ voter: z.string().min(8).max(64), option: z.string().max(4) })

/** One vote per voter. Refused votes (late, repeat, unknown option) are still written to the audit. */
export async function POST(req: Request, ctx: RouteContext<"/api/poll/[id]/vote">) {
  const { id } = await ctx.params
  const p = getPoll(id)
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!p || p.status === "pending" || !parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 })
  const refused = vote(p, parsed.data.voter, parsed.data.option)
  if (refused) return NextResponse.json({ error: refused, poll: toPublic(p, parsed.data.voter) }, { status: 409 })
  return NextResponse.json(toPublic(p, parsed.data.voter))
}
