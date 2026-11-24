"use client"

import { useEffect, useRef, useState } from "react"
import { SendHorizontalIcon, XIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { seeded } from "@/lib/elections/replay"
import { tierFor } from "@/lib/money/config"
import { useLive, type ChatMessage } from "@/lib/store"
import { LivePoll } from "./live-poll"
import { PinnedBubble } from "./pinned-bubble"
import { toneFor } from "./superchat-tones"
import { PollDialog } from "./poll-dialog"
import { SuperchatDialog } from "./superchat-dialog"

const pinMs = (m: ChatMessage) => (m.tip ? (tierFor(m.tip)?.pinSeconds ?? 0) * 1000 : 0)

/** Superchats still inside their pin time, biggest first, then newest. */
function activePins(messages: ChatMessage[], now: number) {
  if (!now) return []
  return messages
    .filter((m) => now - m.at < pinMs(m))
    .sort((a, b) => b.tip! - a.tip! || b.at - a.at)
}

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const messages = useLive((s) => s.messages)
  const post = useLive((s) => s.post)
  const [draft, setDraft] = useState("")
  const [now, setNow] = useState(0)
  const [openPin, setOpenPin] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const pins = activePins(messages, now)
  const pinned = pins.find((m) => m.id === openPin) ?? pins[0]

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim().slice(0, 300)
    if (!text) return
    post({ id: `me:${Date.now()}`, user: "You", text, mine: true, at: Date.now() })
    setDraft("")
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-mist">
      <div className="flex h-12 shrink-0 items-center gap-2 pr-2 pl-4">
        <span className="font-heading text-lg font-extrabold">Live chat</span>
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onClose} aria-label="Close chat">
          <XIcon />
        </Button>
      </div>

      <div className="shrink-0 px-3 pt-3 empty:hidden">
        <LivePoll />
      </div>

      {pinned && (
        <div className="flex shrink-0 flex-col gap-2 p-3 pb-0">
          {pins.length > 1 && (
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 pb-2">
                {pins.map((m) => {
                  const tone = toneFor(m.tip!)
                  const active = m.id === pinned.id
                  return (
                    <Button
                      key={m.id}
                      size="xs"
                      className="numeric shrink-0 rounded-full border-0 font-semibold"
                      style={{
                        background: tone.bg,
                        color: tone.fg,
                        boxShadow: active ? `0 0 0 2px var(--ts-mist), 0 0 0 3.5px ${tone.bg}` : undefined,
                      }}
                      onClick={() => setOpenPin(m.id)}
                    >
                      ${m.tip} · {m.user}
                    </Button>
                  )
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
          <PinnedBubble
            name={pinned.user}
            text={pinned.text}
            amount={pinned.tip!}
            left={1 - (now - pinned.at) / pinMs(pinned)}
          />
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-3 p-4">
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
        </ul>
        <div ref={endRef} />
      </ScrollArea>

      <form onSubmit={send} className="flex shrink-0 gap-1.5 p-3">
        <SuperchatDialog />
        <PollDialog />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={300}
          placeholder="Message"
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
          <SendHorizontalIcon />
        </Button>
      </form>
    </aside>
  )
}

function Message({ m }: { m: ChatMessage }) {
  if (m.tip) {
    // Superchats stay highlighted in the stream after their pin runs out, in their tier color.
    const tone = toneFor(m.tip)
    return (
      <li className="-mx-2 flex gap-2.5 rounded-sm px-2 py-1.5" style={{ background: tone.bg, color: tone.fg }}>
        <span className="display shrink-0 text-sm leading-snug font-black" style={{ color: tone.accent }}>
          ${m.tip}
        </span>
        <p className="min-w-0 text-[15px] leading-snug">
          <span className="font-semibold">{m.user}</span> <span className="break-words">{m.text}</span>
        </p>
      </li>
    )
  }
  return (
    <li className="flex gap-2.5">
      <Avatar className="size-7">
        <AvatarFallback className="text-[10px]">{m.user.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 text-[15px] leading-snug">
        <span className={m.mine ? "font-semibold text-foreground" : "font-semibold text-muted-foreground"}>
          {m.user}
        </span>
        {m.tip && <span className="numeric ml-1.5 text-sm font-bold text-foreground">${m.tip}</span>}{" "}
        <span className="break-words">{m.text}</span>
      </p>
    </li>
  )
}

// Demo traffic until Stream Chat is connected.
const USERS = ["kfoster", "mesa_dad", "jlin", "precinct9", "oldtimer", "dana.r", "swingvoter", "mapnerd", "tallyho", "rivera_88"]
const LINES = [
  "PA is going to be a long one",
  "Georgia numbers moving fast",
  "anyone watching Maine?",
  "that county just dumped a lot of votes",
  "Arizona won't be done tonight",
  "this map is clean",
  "turnout looks high in the suburbs",
  "waiting on the mail ballots",
  "Ohio called already?",
  "zoom into Michigan, the counties are wild",
  "coffee number 3",
  "Nevada takes days, relax",
]

export function DemoChatFeed() {
  const post = useLive((s) => s.post)
  useEffect(() => {
    const r = seeded(String(Date.now()))
    let timer = 0
    const next = () => {
      const tip = r() < 0.08 ? [2, 5, 10, 20, 50, 100][Math.floor(r() * 6)] : undefined
      post({
        id: `bot:${Date.now()}`,
        at: Date.now(),
        user: USERS[Math.floor(r() * USERS.length)],
        text: LINES[Math.floor(r() * LINES.length)],
        tip,
      })
      timer = window.setTimeout(next, 1200 + r() * 3000)
    }
    next()
    return () => window.clearTimeout(timer)
  }, [post])
  return null
}
