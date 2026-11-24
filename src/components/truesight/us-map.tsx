"use client"

import { useEffect, useMemo, useState } from "react"
import DeckGL from "@deck.gl/react"
import { LinearInterpolator, OrthographicView, type OrthographicViewState, type PickingInfo } from "@deck.gl/core"
import { GeoJsonLayer } from "@deck.gl/layers"
import { geoPath } from "d3-geo"
import { feature, mesh } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"
import type { Feature, Geometry, MultiLineString } from "geojson"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { countyRGB, delegationRGB, dim, GROUND_LINE, GROUND_LINE_SOFT, NOT_UP_RGB, raceRGB, type RGBA } from "@/lib/elections/colors-gl"
import { countyResults, type CountyResult, type Office, type Race } from "@/lib/elections/replay"
import { STATE_BY_FIPS } from "@/lib/elections/states"
import { useLive } from "@/lib/store"
import { AdSlot } from "./ad-slot"
import { RacePanel } from "./race-panel"
import { StatePicker } from "./state-picker"

// us-atlas ships pre-projected (Albers USA) at 975×610, y down: drawn as-is in an orthographic view.
const W = 975
const H = 610
const bounds = geoPath().bounds

type StateProps = { abbr: string; name: string }
type CountyProps = { id: string; name: string; state: string }

type Geo = {
  states: Feature<Geometry, StateProps>[]
  counties: Feature<Geometry, CountyProps>[]
  borders: Feature<MultiLineString>
  /** County border network for the whole country (null) or one state's FIPS code; cached. */
  countyMesh: (stateFips: string | null) => Feature<MultiLineString>
}

/** Offices whose national map is drawn county by county. */
const BY_COUNTY: Office[] = ["senate"]

/** Panel geometry the zoom leaves room for: a 340px side panel on desktop, ~half the map for the bottom card. */
const SIDE_PANEL_PX = 352
/** Height of the ad overlay plus its margin, kept clear when zooming into a state on desktop. */
const AD_STRIP_PX = 96

const easeOut = (t: number) => 1 - (1 - t) ** 3
const fly = new LinearInterpolator(["target", "zoom"])

async function loadGeo(): Promise<Geo> {
  const topo = (await fetch("/geo/counties-albers-10m.json").then((r) => r.json())) as Topology<{
    states: GeometryCollection<{ name: string }>
    counties: GeometryCollection<{ name: string }>
  }>
  const states = feature(topo, topo.objects.states)
    .features.filter((f) => STATE_BY_FIPS.has(String(f.id)))
    .map((f) => ({ ...f, properties: { abbr: STATE_BY_FIPS.get(String(f.id))!.abbr, name: f.properties?.name ?? "" } }))
  const counties = feature(topo, topo.objects.counties)
    .features.map((f) => ({ f, st: STATE_BY_FIPS.get(String(f.id).slice(0, 2)) }))
    .filter((x) => x.st)
    .map(({ f, st }) => ({ ...f, properties: { id: String(f.id), name: f.properties?.name ?? "", state: st!.abbr } }))
  const asFeature = (geometry: MultiLineString): Feature<MultiLineString> => ({ type: "Feature", properties: {}, geometry })
  const borders = asFeature(mesh(topo, topo.objects.states, (a, b) => a !== b))
  const meshCache = new Map<string, Feature<MultiLineString>>()
  const countyMesh = (fips: string | null) => {
    const key = fips ?? "all"
    if (!meshCache.has(key)) {
      meshCache.set(
        key,
        asFeature(
          mesh(topo, topo.objects.counties, (a, b) =>
            a !== b && (!fips || (String(a.id).startsWith(fips) && String(b.id).startsWith(fips)))
          )
        )
      )
    }
    return meshCache.get(key)!
  }
  return { states: states as Geo["states"], counties: counties as Geo["counties"], borders, countyMesh }
}

export function UsMap({ panel }: { panel: "side" | "bottom" }) {
  const [geo, setGeo] = useState<Geo | null>(null)
  // deck.gl fills the wrapper and reports its own size; that drives the fit and the fly-to.
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })

  const snap = useLive((s) => s.snap)
  const tab = useLive((s) => s.tab)
  const focus = useLive((s) => s.focus)
  const setFocus = useLive((s) => s.setFocus)
  const select_ = useLive((s) => s.select)
  const selection = useLive((s) => s.selection)
  const panelOpen = !!selection

  const [viewState, setViewState] = useState<OrthographicViewState>({ target: [W / 2, H / 2, 0], zoom: 0 })

  useEffect(() => {
    loadGeo().then(setGeo)
  }, [])

  // Esc closes the panel first, then zooms back out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      const s = useLive.getState()
      if (s.selection) s.select(null)
      else s.setFocus(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const fitZoom = width && height ? Math.log2(Math.min(width / W, height / H) * 0.96) : 0

  // Fit the country, or fly to the focused state inside the part of the map the race panel leaves visible.
  // Recomputed during render whenever focus, panel or size changes (React's "adjust state on change" pattern).
  const flyKey = geo && width && height ? `${focus}|${panelOpen}|${panel}|${width}|${height}` : ""
  const [flownFor, setFlownFor] = useState("")
  if (flyKey && flyKey !== flownFor) {
    setFlownFor(flyKey)
    const shape = focus ? geo!.states.find((s) => s.properties.abbr === focus) : null
    let next: OrthographicViewState = { target: [W / 2, H / 2, 0], zoom: fitZoom }
    if (shape) {
      const padX = panelOpen && panel === "side" ? SIDE_PANEL_PX : 0
      // Bottom room: the race card on phones, or the ad strip (about 90px) on desktop.
      const padY = panelOpen && panel === "bottom" ? height * 0.5 : panel === "side" ? AD_STRIP_PX : 0
      const [[x0, y0], [x1, y1]] = bounds(shape)
      // While the layout settles the map can briefly be narrower than the panel: never fit into less than 40% of it.
      const visW = Math.max(width - padX, width * 0.4)
      const visH = Math.max(height - padY, height * 0.4)
      const k = Math.min(2 ** (fitZoom + 5), 0.82 * Math.min(visW / (x1 - x0), visH / (y1 - y0)))
      next = { target: [(x0 + x1) / 2 + padX / 2 / k, (y0 + y1) / 2 + padY / 2 / k, 0], zoom: Math.log2(k) }
    }
    setViewState({
      ...next,
      minZoom: fitZoom - 0.5,
      maxZoom: fitZoom + 6,
      transitionDuration: flownFor ? 700 : 0,
      transitionInterpolator: fly,
      transitionEasing: easeOut,
    })
  }

  const byState = useMemo(() => {
    const m = new Map<string, Race[]>()
    for (const r of snap.races[tab]) {
      if (!m.has(r.state.abbr)) m.set(r.state.abbr, [])
      m.get(r.state.abbr)!.push(r)
    }
    return m
  }, [snap, tab])

  const national = BY_COUNTY.includes(tab)
  const focusRace = focus && tab !== "house" ? byState.get(focus)?.[0] : undefined

  // County results for every county that is drawn: all of them nationally, or the focused state's otherwise.
  const countyData = useMemo(() => {
    if (!geo) return { features: [] as Geo["counties"], results: new Map<string, CountyResult>() }
    const features = national ? geo.counties : focusRace ? geo.counties.filter((c) => c.properties.state === focus) : []
    const results = new Map<string, CountyResult>()
    const ids = new Map<string, string[]>()
    for (const c of features) {
      if (!byState.has(c.properties.state)) continue
      if (!ids.has(c.properties.state)) ids.set(c.properties.state, [])
      ids.get(c.properties.state)!.push(c.properties.id)
    }
    for (const [abbr, list] of ids) {
      for (const [id, r] of countyResults(byState.get(abbr)![0].id, list, snap.t)) results.set(id, r)
    }
    return { features, results }
  }, [geo, national, focusRace, focus, byState, snap.t])

  const openState = (abbr: string) => {
    setFocus(abbr)
    select_({ state: abbr })
  }
  const clear = () => {
    select_(null)
    setFocus(null)
  }

  // Lines for whichever counties are drawn: the whole country, or just the focused state.
  const countyMesh = useMemo(() => {
    if (!geo) return null
    if (national) return geo.countyMesh(null)
    if (!focusRace || !focus) return null
    const fips = [...STATE_BY_FIPS.values()].find((s) => s.abbr === focus)?.fips
    return fips ? geo.countyMesh(fips) : null
  }, [geo, national, focusRace, focus])

  const selectedFeature = useMemo(() => {
    if (!geo || !selection) return null
    if (selection.county) return geo.counties.find((c) => c.properties.id === selection.county!.fips) ?? null
    return geo.states.find((s) => s.properties.abbr === selection.state) ?? null
  }, [geo, selection])

  if (!geo) {
    return (
      <div className="map-ground relative isolate size-full overflow-hidden" />
    )
  }

  // Colors change every tick; the trigger tells deck.gl to recompute them and fade to the new value.
  const colorKey = `${snap.t}|${tab}|${focus}`
  const withDim = (rgb: RGBA, abbr: string) => (focus && focus !== abbr ? dim(rgb) : rgb)

  const layers = [
    !national &&
      new GeoJsonLayer<StateProps>({
        id: "states",
        data: geo.states,
        filled: true,
        stroked: false,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 50],
        getFillColor: (f) => {
          const races = byState.get(f.properties.abbr) ?? []
          return withDim(tab === "house" ? delegationRGB(races) : raceRGB(races[0]), f.properties.abbr)
        },
        updateTriggers: { getFillColor: colorKey },
        transitions: { getFillColor: 600 },
      }),
    countyData.features.length > 0 &&
      new GeoJsonLayer<CountyProps>({
        id: "counties",
        data: countyData.features,
        filled: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        stroked: false,
        getFillColor: (f) =>
          withDim(byState.has(f.properties.state) ? countyRGB(countyData.results.get(f.properties.id)) : NOT_UP_RGB, f.properties.state),
        updateTriggers: { getFillColor: colorKey },
        transitions: { getFillColor: 600 },
      }),
    // County borders as one line network: each shared edge drawn once, so thin lines stay solid instead of dashed.
    countyMesh &&
      new GeoJsonLayer({
        id: "county-borders",
        data: [countyMesh],
        stroked: true,
        filled: false,
        getLineColor: GROUND_LINE_SOFT,
        getLineWidth: 0.75,
        lineWidthUnits: "pixels",
        lineJointRounded: true,
        lineCapRounded: true,
      }),
    // Borders in the ground color read as clean, even gaps between states.
    new GeoJsonLayer({
      id: "state-borders",
      data: [geo.borders],
      stroked: true,
      filled: false,
      getLineColor: GROUND_LINE,
      getLineWidth: 1.5,
      lineWidthUnits: "pixels",
      lineJointRounded: true,
      lineCapRounded: true,
    }),
    selectedFeature &&
      new GeoJsonLayer({
        id: "selected",
        data: [selectedFeature],
        stroked: true,
        filled: false,
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 2,
        lineWidthUnits: "pixels",
        lineJointRounded: true,
        lineCapRounded: true,
      }),
  ]

  // First click on a county opens its state; inside that state, a click opens the county.
  const onClick = (info: PickingInfo) => {
    const props = (info.object as Feature<Geometry, StateProps | CountyProps> | undefined)?.properties
    if (!props) return clear()
    if ("id" in props) {
      if (focus === props.state && byState.has(props.state)) select_({ state: props.state, county: { fips: props.id, name: props.name } })
      else openState(props.state)
    } else openState(props.abbr)
  }

  const getTooltip = (info: PickingInfo) => {
    const props = (info.object as Feature<Geometry, StateProps | CountyProps> | undefined)?.properties
    if (!props) return null
    let title: string
    let line = ""
    if ("id" in props) {
      title = `${props.name}, ${props.state}`
      const r = countyData.results.get(props.id)
      if (r?.leader) line = `${r.leader} +${Math.abs(r.margin).toFixed(1)} · ${Math.round(r.counted * 100)}% counted`
    } else {
      title = props.name
      const race = byState.get(props.abbr)?.[0]
      if (race?.leader && tab !== "house") line = `${race.winner ? "Called " : ""}${race.leader} · ${Math.round(race.counted * 100)}% counted`
    }
    return {
      html: `<div style="font-weight:700">${title}</div>${line ? `<div style="color:#4a5590;font-size:12px;margin-top:2px">${line}</div>` : ""}`,
      style: {
        background: "#ffffff",
        color: "#0b1757",
        borderRadius: "4px",
        padding: "6px 8px",
        fontFamily: "var(--font-schibsted), sans-serif",
        fontSize: "13px",
      },
    }
  }

  return (
    <div className="map-ground relative isolate size-full overflow-hidden">
      <DeckGL
        views={new OrthographicView({ id: "map", flipY: true })}
        viewState={viewState}
        onViewStateChange={({ viewState: v }) => setViewState(v as OrthographicViewState)}
        onResize={({ width: w, height: h }) => setSize({ width: w, height: h })}
        controller={{ doubleClickZoom: false, inertia: true }}
        layers={layers}
        onClick={onClick}
        getTooltip={getTooltip}
        getCursor={({ isHovering, isDragging }) => (isDragging ? "grabbing" : isHovering ? "pointer" : "grab")}
        style={{ position: "absolute", inset: "0" }}
      />

      <div className="absolute top-3 left-3 z-[5] flex items-center gap-2">
        {focus && (
          <Button variant="secondary" size="icon" className="bg-background" onClick={clear} aria-label="Back to national map">
            <ArrowLeftIcon />
          </Button>
        )}
        <StatePicker onPick={openState} />
      </div>

      {/*
        Desktop: bottom centre, in the band under the country.
        Tall phone screens: under the state picker, where the letterbox leaves room.
        Wide but narrow screens: bottom centre, or top-right while the bottom race card is open.
      */}
      <AdSlot
        className={
          panel === "side" || (height < width && !panelOpen)
            ? "absolute bottom-3 left-1/2 z-[5] max-w-[calc(100%-1.5rem)] -translate-x-1/2"
            : height >= width
              ? "absolute top-14 left-1/2 z-[5] max-w-[calc(100%-1.5rem)] -translate-x-1/2"
              : "absolute top-3 right-3 z-[5] max-w-[calc(100%-1.5rem)]"
        }
      />

      <RacePanel docked={panel} />
    </div>
  )
}
