import { db } from "@/lib/money/server"

export async function GET(_req: Request, ctx: RouteContext<"/api/ads/[id]/image">) {
  const { id } = await ctx.params
  const order = db.ads.get(id)
  if (!order || order.status !== "live") return new Response(null, { status: 404 })
  return new Response(Buffer.from(order.image.bytes), {
    headers: { "content-type": order.image.type, "cache-control": "public, max-age=300" },
  })
}
