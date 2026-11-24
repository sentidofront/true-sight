"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AD } from "@/lib/money/config"

type Order = { id: string; seat: number; price: number; sponsor: string; status: string }

export default function DonePage() {
  return (
    <main className="flex h-dvh items-center justify-center px-4">
      <Suspense fallback={<Skeleton className="h-40 w-full max-w-md" />}>
        <Done />
      </Suspense>
    </main>
  )
}

function Done() {
  const params = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/api/ads/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order: params.get("order"), sessionId: params.get("session_id") }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setOrder)
      .catch(() => setFailed(true))
  }, [params])

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-heading text-2xl font-semibold">Payment not confirmed</h1>
        <Button nativeButton={false} render={<Link href="/advertise" />}>Try again</Button>
      </div>
    )
  }
  if (!order) return <Skeleton className="h-40 w-full max-w-md" />

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <CheckIcon className="size-10" />
      <h1 className="display text-4xl font-black">You&apos;re live</h1>
      <div className="flex flex-col gap-1">
        <div className="max-w-full overflow-hidden rounded-sm" style={{ width: AD.width, aspectRatio: `${AD.width} / ${AD.height}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the buyer's own creative */}
          <img src={`/api/ads/${order.id}/image`} alt={order.sponsor} className="size-full object-cover" />
        </div>
        <span className="tag self-start text-[10px]">Ad · {order.sponsor}</span>
      </div>
      <Button nativeButton={false} render={<Link href="/" />} size="lg">
        See it on the map
      </Button>
    </div>
  )
}
