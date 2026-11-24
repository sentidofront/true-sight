import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

import { formatET } from "@/lib/elections/replay"
import { findRace, OFFICE_LABEL, raceStatus } from "@/lib/share"

export const alt = "Race result on True Sight"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const font = (file: string) =>
  readFile(join(process.cwd(), "node_modules/@fontsource/schibsted-grotesk/files", `schibsted-grotesk-latin-${file}-normal.woff`))
const [regular, semibold, black] = await Promise.all([font("400"), font("600"), font("900")])

/** Printed on the card so a copied image still says where it came from. */
const DOMAIN = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3210").host

// Brandbook palette on its blue side: navy to electric, light blue for secondary text
const NAVY = "#0b1757"
const ELECTRIC = "#2747e6"
const SKY = "#9fb2ff"
const PARTY = { D: "#2e9bff", R: "#f2223a" } as const

/** Brandbook "pixels": square modules that thin out away from the top-right corner. */
const MODULE = 42
const PIXELS = Array.from({ length: 8 }, (_, row) =>
  Array.from({ length: 10 }, (_, col) => ({ row, col, d: row + col }))
)
  .flat()
  .filter((p) => p.d < 9 && (p.d < 4 || (p.row * 7 + p.col * 3) % 5 < 4 - (p.d - 4) / 2))

export default async function Image({ params }: { params: Promise<{ race: string; t: string }> }) {
  const { race, t } = await params
  const r = findRace(race, Number(t))
  const lead = r?.winner ?? r?.leader

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: NAVY,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(135deg, ${NAVY} 0%, #14258f 55%, ${ELECTRIC} 100%)`,
          backgroundSize: `${MODULE}px ${MODULE}px, ${MODULE}px ${MODULE}px, 100% 100%`,
          color: "#ffffff",
          fontFamily: "Schibsted",
        }}
      >
        {PIXELS.map((p) => (
          <div
            key={`${p.row}-${p.col}`}
            style={{
              position: "absolute",
              top: p.row * MODULE,
              right: p.col * MODULE,
              width: MODULE,
              height: MODULE,
              background: p.d < 2 && lead ? PARTY[lead] : SKY,
              opacity: 1 - p.d / 9,
            }}
          />
        ))}

        <div style={{ display: "flex", flexDirection: "column", padding: "52px 64px", width: "100%", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 34 }}>True Sight</span>
            <span style={{ fontWeight: 600, fontSize: 22, color: SKY }}>2026 Midterms</span>
          </div>

          {!r ? (
            <span style={{ marginTop: 120, fontWeight: 900, fontSize: 96 }}>Live results</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
              <span style={{ fontWeight: 600, fontSize: 28, color: SKY }}>
                {r.office === "house" ? `${r.state.abbr} District ${r.district}` : OFFICE_LABEL[r.office]}
              </span>
              <span style={{ fontWeight: 900, fontSize: 104, lineHeight: 1, marginTop: 4 }}>{r.state.name}</span>

              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 34, width: 720 }}>
                {r.status === "pending" ? (
                  <span style={{ fontWeight: 600, fontSize: 44 }}>Polls close {formatET((r.state.close - 18) * 60)} ET</span>
                ) : (
                  r.candidates.slice(0, 2).map((c) => (
                    <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 18, height: 18, background: PARTY[c.party] }} />
                        <span style={{ fontWeight: 600, fontSize: 40 }}>{c.name}</span>
                        <span style={{ fontWeight: 600, fontSize: 26, color: SKY }}>{c.party}</span>
                        <span style={{ marginLeft: "auto", fontWeight: 900, fontSize: 64, opacity: c.party === lead ? 1 : 0.75 }}>
                          {c.pct.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: "flex", height: 10, background: "rgba(255,255,255,0.16)" }}>
                        <div style={{ width: `${c.pct}%`, background: PARTY[c.party] }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div style={{ display: "flex", marginTop: "auto", paddingTop: 20, alignItems: "center", gap: 20, fontSize: 24, color: SKY }}>
            {r && <span style={{ fontWeight: 600, color: "#ffffff" }}>{raceStatus(r)}</span>}
            <span>{formatET(Number(t) || 0)} ET</span>
            <span style={{ marginLeft: "auto", fontWeight: 600, color: "#ffffff", fontSize: 26 }}>{DOMAIN}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Schibsted", data: regular, style: "normal", weight: 400 },
        { name: "Schibsted", data: semibold, style: "normal", weight: 600 },
        { name: "Schibsted", data: black, style: "normal", weight: 900 },
      ],
    }
  )
}
