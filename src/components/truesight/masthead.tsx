"use client"

import { ShaderMount } from "@paper-design/shaders-react"
import { useReducedMotion } from "motion/react"

import { mastheadShader, mastheadUniforms } from "@/lib/fx/masthead-shader"

/** Top band: tabs and balance of power over a slow brand-blue shader with grain. */
export function Masthead({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <div className="on-navy relative isolate shrink-0 overflow-hidden">
      <ShaderMount
        className="absolute inset-0 -z-10"
        fragmentShader={mastheadShader}
        uniforms={mastheadUniforms}
        speed={reduce ? 0 : 1}
        maxPixelCount={1920 * 200}
      />
      {children}
    </div>
  )
}
