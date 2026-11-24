import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LiveApp } from "@/components/truesight/live-app"
import { findRace, raceTitle, shareText } from "@/lib/share"

type Props = { params: Promise<{ race: string; t: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { race, t } = await params
  const r = findRace(race, Number(t))
  if (!r) return {}
  const title = `${raceTitle(r)} · True Sight`
  const description = shareText(r)
  return {
    title,
    description,
    openGraph: { title, description, type: "article", siteName: "True Sight" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default function SharedRacePage({ params }: Props) {
  return (
    <Suspense>
      <SharedRace params={params} />
    </Suspense>
  )
}

async function SharedRace({ params }: Props) {
  const { race, t } = await params
  const r = findRace(race, Number(t))
  if (!r) notFound()
  return <LiveApp initial={{ state: r.state.abbr, office: r.office, t: Number(t) }} />
}
