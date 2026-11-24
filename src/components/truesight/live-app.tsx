"use client"

import { useEffect } from "react"
import { usePanelRef } from "react-resizable-panels"
import { useMediaQuery } from "usehooks-ts"

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { BalanceBar } from "@/components/truesight/balance-bar"
import { ChatPanel, DemoChatFeed } from "@/components/truesight/chat-panel"
import { LiveClock } from "@/components/truesight/live-clock"
import { Masthead } from "@/components/truesight/masthead"
import { MobileTabs, TopBar } from "@/components/truesight/top-bar"
import { UsMap } from "@/components/truesight/us-map"
import type { Office } from "@/lib/elections/replay"
import { useLive } from "@/lib/store"

export type Initial = { state: string; office: Office; t: number }

/** The whole live page. `initial` opens it on a shared race at the moment it was shared. */
export function LiveApp({ initial }: { initial?: Initial }) {
  const desktop = useMediaQuery("(min-width: 1024px)", { initializeWithValue: false })
  const setChatOpen = useLive((s) => s.setChatOpen)

  // Chat starts open beside the map on desktop, closed on phones.
  useEffect(() => setChatOpen(desktop), [desktop, setChatOpen])

  useEffect(() => {
    if (!initial) return
    const s = useLive.getState()
    s.setTab(initial.office)
    s.setFocus(initial.state)
    s.select({ state: initial.state })
  }, [initial])

  return (
    <main className="flex h-dvh flex-col">
      <LiveClock start={initial?.t} />
      <DemoChatFeed />
      <Masthead>
        <TopBar />
        <BalanceBar />
      </Masthead>
      <MobileTabs />
      <div className="min-h-0 flex-1">{desktop ? <DesktopBody /> : <MobileBody />}</div>
    </main>
  )
}

function DesktopBody() {
  const chatOpen = useLive((s) => s.chatOpen)
  const setChatOpen = useLive((s) => s.setChatOpen)
  const chat = usePanelRef()

  useEffect(() => {
    const p = chat.current
    if (!p) return
    if (chatOpen && p.isCollapsed()) p.expand()
    if (!chatOpen && !p.isCollapsed()) p.collapse()
  }, [chatOpen, chat])

  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel id="map" minSize="40%">
        <UsMap panel="side" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        id="chat"
        panelRef={chat}
        collapsible
        collapsedSize="0%"
        defaultSize="36%"
        minSize="26%"
        maxSize="55%"
        onResize={(size) => setChatOpen(size.asPercentage > 0)}
      >
        <ChatPanel onClose={() => setChatOpen(false)} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function MobileBody() {
  const chatOpen = useLive((s) => s.chatOpen)
  const setChatOpen = useLive((s) => s.setChatOpen)
  const selection = useLive((s) => s.selection)

  return (
    <>
      <UsMap panel="bottom" />
      <Drawer open={chatOpen && !selection} onOpenChange={setChatOpen}>
        <DrawerContent className="h-[90dvh]">
          <DrawerTitle className="sr-only">Live chat</DrawerTitle>
          <ChatPanel onClose={() => setChatOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  )
}
