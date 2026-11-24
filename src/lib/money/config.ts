/** Prices and limits. Proposal values: change here, nowhere else. USD. */

/** Brand look per tier, rising in weight: see TONES in components/truesight/superchat-tones.ts. */
export type SuperchatTone = "mist" | "sky" | "electric" | "navy" | "gold" | "onyx"

export type SuperchatTier = { amount: number; pinSeconds: number; chars: number; tone: SuperchatTone }

// Brand blues and gold, never party red. Superchats live only in the chat column, away from the map's data.
export const SUPERCHAT_TIERS: SuperchatTier[] = [
  { amount: 2, pinSeconds: 20, chars: 60, tone: "mist" },
  { amount: 5, pinSeconds: 60, chars: 100, tone: "sky" },
  { amount: 10, pinSeconds: 120, chars: 150, tone: "electric" },
  { amount: 20, pinSeconds: 300, chars: 200, tone: "navy" },
  { amount: 50, pinSeconds: 600, chars: 250, tone: "gold" },
  { amount: 100, pinSeconds: 1200, chars: 300, tone: "onyx" },
]

export const tierFor = (amount: number) => SUPERCHAT_TIERS.find((t) => t.amount === amount)

/**
 * One ad placement, five seats. An open seat costs `basePrice`; an occupied seat costs double what its
 * holder paid, and the buyer takes it over. Screen time is split in proportion to what each holder paid.
 */
export const AD = {
  /** IAB mobile leaderboard: small enough to sit over the map without hiding states. */
  width: 320,
  height: 50,
  seats: 5,
  basePrice: 250,
  /** One full rotation through every live seat. */
  cycleSeconds: 60,
  /** Floor so a cheap seat still gets a readable turn. */
  minSeconds: 4,
} as const

export const AD_MAX_BYTES = 300 * 1024
export const AD_TYPES = ["image/png", "image/jpeg", "image/webp"]

export type AdHolder = { id: string; sponsor: string; landing: string; image: string; price: number }

export type AdSeat = {
  seat: number
  holder: AdHolder | null
  /** What the next buyer pays to take this seat. */
  next: number
  held: boolean
}

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

/** Seconds each live seat is on screen per rotation, proportional to price paid. */
export function schedule(seats: AdSeat[]) {
  const live = seats.filter((s) => s.holder)
  const total = live.reduce((a, s) => a + s.holder!.price, 0)
  return live.map((s) => ({
    seat: s,
    seconds: Math.max(AD.minSeconds, (AD.cycleSeconds * s.holder!.price) / total),
  }))
}

/** Paid chat poll: one at a time, queued if another is running. */
export const POLL = { price: 20, seconds: 10, minOptions: 2, maxOptions: 4, questionChars: 120, optionChars: 40 } as const

export type PollPublic = {
  id: string
  creator: string
  question: string
  options: { id: string; label: string }[]
  startsAt: number
  endsAt: number
  status: "scheduled" | "live" | "closed"
  votes: Record<string, number>
  voted?: string
  now: number
}
