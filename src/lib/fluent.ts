import { webDarkTheme } from "@fluentui/tokens"

// Fluent 2 tokens exposed as CSS variables (--fl-*), read straight from Microsoft's package.
const KEYS = [
  "borderRadiusSmall",
  "borderRadiusMedium",
  "borderRadiusLarge",
  "borderRadiusXLarge",
  "shadow4",
  "shadow8",
  "shadow16",
  "shadow28",
  "shadow64",
  "durationFast",
  "durationNormal",
  "durationSlow",
  "durationSlower",
  "curveDecelerateMid",
  "curveDecelerateMax",
  "curveEasyEase",
  "curveAccelerateMid",
  "fontFamilyBase",
  "fontFamilyNumeric",
] as const

const kebab = (s: string) => s.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`)

export const fluentCss = `:root{${KEYS.map(
  (k) => `--fl-${kebab(k)}:${webDarkTheme[k]};`
).join("")}}`

export const fluent = webDarkTheme
