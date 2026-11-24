"use client"

import { create } from "zustand"
import { snapshot, type Office, type Snapshot } from "@/lib/elections/replay"

export type Selection = {
  state: string
  county?: { fips: string; name: string }
}

export type ChatMessage = {
  id: string
  user: string
  text: string
  at: number
  mine?: boolean
  tip?: number
}

type LiveState = {
  snap: Snapshot
  tab: Office
  focus: string | null
  selection: Selection | null
  chatOpen: boolean
  messages: ChatMessage[]
  setT: (t: number) => void
  setTab: (tab: Office) => void
  setFocus: (abbr: string | null) => void
  select: (s: Selection | null) => void
  setChatOpen: (open: boolean) => void
  post: (m: ChatMessage) => void
}

export const useLive = create<LiveState>((set) => ({
  snap: snapshot(50),
  tab: "senate",
  focus: null,
  selection: null,
  chatOpen: false,
  messages: [],
  setT: (t) => set({ snap: snapshot(t) }),
  setTab: (tab) => set({ tab }),
  setFocus: (focus) => set({ focus }),
  select: (selection) => set({ selection }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
  post: (m) => set((s) => ({ messages: [...s.messages.slice(-199), m] })),
}))
