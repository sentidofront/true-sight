import { tierFor, type SuperchatTone } from "@/lib/money/config"

type Tone = {
  /** Card / chip background */
  bg: string
  /** Main text on that background */
  fg: string
  /** Countdown track */
  sub: string
  /** The amount and the countdown fill */
  accent: string
}

/** Solid colors only, rising in weight: light blues, brand blues, then gold and near-black for the top tiers. */
export const TONES: Record<SuperchatTone, Tone> = {
  // White, not mist: the chat column itself is mist, so a mist card would disappear into it.
  mist: { bg: "#ffffff", fg: "#0b1757", sub: "#dde1ec", accent: "#0b1757" },
  sky: { bg: "#9fb2ff", fg: "#0b1757", sub: "#c7d3ff", accent: "#0b1757" },
  electric: { bg: "#2747e6", fg: "#ffffff", sub: "#5c76ee", accent: "#ffffff" },
  navy: { bg: "#0b1757", fg: "#ffffff", sub: "#2a3570", accent: "#9fb2ff" },
  gold: { bg: "#d9a441", fg: "#0b1757", sub: "#e8c67f", accent: "#0b1757" },
  onyx: { bg: "#0a0a0f", fg: "#ffffff", sub: "#3a3020", accent: "#e8b547" },
}

export const toneFor = (amount: number) => TONES[tierFor(amount)?.tone ?? "mist"]
