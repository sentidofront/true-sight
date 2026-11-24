"use client"

import { MessageSquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatET, type Office } from "@/lib/elections/replay"
import { useLive } from "@/lib/store"

export function TopBar() {
  const tab = useLive((s) => s.tab)
  const setTab = useLive((s) => s.setTab)
  const t = useLive((s) => s.snap.t)
  const chatOpen = useLive((s) => s.chatOpen)
  const setChatOpen = useLive((s) => s.setChatOpen)

  return (
    <header className="flex h-11 shrink-0 items-center gap-4 px-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Office)} className="hidden md:flex">
        <TabsList variant="line">
          <TabsTrigger value="senate">Senate</TabsTrigger>
          <TabsTrigger value="house">House</TabsTrigger>
          <TabsTrigger value="governor">Governor</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="ml-auto flex items-center gap-3">
        <span className="numeric hidden text-sm text-muted-foreground sm:inline">{formatET(t)} ET</span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-rep" />
          Live
        </span>
        <Button
          variant={chatOpen ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setChatOpen(!chatOpen)}
          aria-label={chatOpen ? "Close chat" : "Open chat"}
          aria-pressed={chatOpen}
        >
          <MessageSquareIcon />
        </Button>
      </div>
    </header>
  )
}

/** Office tabs move under the balance bar on phones. */
export function MobileTabs() {
  const tab = useLive((s) => s.tab)
  const setTab = useLive((s) => s.setTab)
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Office)} className="px-2 md:hidden">
      <TabsList variant="line" className="w-full">
        <TabsTrigger value="senate">Senate</TabsTrigger>
        <TabsTrigger value="house">House</TabsTrigger>
        <TabsTrigger value="governor">Governor</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
