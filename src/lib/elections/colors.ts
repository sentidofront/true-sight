import type { Party } from "./states"

// CSS party colors for the interface (panels, bars, labels). The map itself uses colors-gl.ts.

export const partyColor = (p: Party) => (p === "D" ? "var(--ts-blue)" : "var(--ts-red)")

/** For party text on white: Dem blue is too light to read, so text uses a darker shade. */
export const partyInk = (p: Party) => (p === "D" ? "var(--ts-blue-ink)" : "var(--ts-red)")

export const tint = (p: Party, pct: number) => `color-mix(in oklab, ${partyColor(p)} ${pct}%, white)`
