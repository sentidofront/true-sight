import { toneFor } from "./superchat-tones"

const initials = (name: string) =>
  (name || "You")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")

/**
 * A superchat card in its tier's solid color: light blues at $2–5, brand blues at $10–20,
 * gold at $50 and near-black with gold type at $100.
 * `left` (0–1) draws the pin countdown along the bottom edge.
 */
export function PinnedBubble({ name, text, amount, left }: { name: string; text: string; amount: number; left?: number }) {
  const tone = toneFor(amount)

  return (
    <div className="overflow-hidden rounded-sm" style={{ background: tone.bg, color: tone.fg }}>

      <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: tone.fg, color: tone.bg }}
        >
          {initials(name)}
        </span>
        <span className="min-w-0 truncate text-sm font-semibold">{name || "You"}</span>
        <span className="display ml-auto text-2xl leading-none font-black" style={{ color: tone.accent }}>
          ${amount}
        </span>
      </div>

      {text && <p className="px-3 pb-3 text-[15px] leading-snug font-medium text-pretty break-words">{text}</p>}

      {left !== undefined && (
        <div className="h-1" style={{ background: tone.sub }}>
          <div
            className="h-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.max(0, Math.min(1, left)) * 100}%`, background: tone.accent }}
          />
        </div>
      )}
    </div>
  )
}
