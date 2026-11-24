import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"

import { AdvertiseForm } from "@/components/truesight/advertise-form"

export const metadata: Metadata = { title: "Advertise · True Sight" }

export default function AdvertisePage() {
  return (
    <main className="h-dvh overflow-y-auto">
      <header className="on-navy flex h-12 items-center px-4">
        <Link href="/" className="font-heading text-xl font-semibold">
          True Sight
        </Link>
      </header>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
        <h1 className="display text-5xl font-black">Advertise on election night</h1>
        <Suspense>
          <AdvertiseForm />
        </Suspense>
      </div>
    </main>
  )
}
