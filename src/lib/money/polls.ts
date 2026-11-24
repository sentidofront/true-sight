import "server-only"

import { createHash } from "node:crypto"
import { POLL, type PollPublic } from "./config"
import { newId } from "./server"

export type AuditKind = "created" | "paid" | "vote" | "rejected" | "closed"

/** One audit line. `hash` = sha256(prev + the line's own fields), so editing any line breaks every hash after it. */
export type AuditEntry = {
  seq: number
  at: number
  kind: AuditKind
  detail: Record<string, string | number>
  prev: string
  hash: string
}

export type Poll = {
  id: string
  creator: string
  question: string
  options: { id: string; label: string }[]
  amount: number
  sessionId?: string
  status: "pending" | "scheduled" | "live" | "closed"
  startsAt: number
  endsAt: number
  votes: Map<string, string>
  audit: AuditEntry[]
}

const g = globalThis as unknown as { __truesightPolls?: Map<string, Poll> }
const polls: Map<string, Poll> = (g.__truesightPolls ??= new Map())

const sha = (s: string) => createHash("sha256").update(s).digest("hex")
const GENESIS = "0".repeat(64)
const MAX_REJECTED = 500

function append(p: Poll, kind: AuditKind, detail: AuditEntry["detail"], at = Date.now()) {
  const prev = p.audit.at(-1)?.hash ?? GENESIS
  const seq = p.audit.length
  const hash = sha(prev + JSON.stringify({ seq, at, kind, detail }))
  p.audit.push({ seq, at, kind, detail, prev, hash })
}

/** Voters are stored as a per-poll hash: the audit can show one-vote-per-voter without exposing who. */
const voterKey = (pollId: string, voter: string) => sha(`${pollId}:${voter}`).slice(0, 16)

export function createPoll(input: { creator: string; question: string; options: string[] }) {
  const id = newId()
  const p: Poll = {
    id,
    creator: input.creator,
    question: input.question,
    options: input.options.map((label, i) => ({ id: String.fromCharCode(97 + i), label })),
    amount: POLL.price,
    status: "pending",
    startsAt: 0,
    endsAt: 0,
    votes: new Map(),
    audit: [],
  }
  append(p, "created", {
    creator: p.creator,
    question: p.question,
    options: p.options.map((o) => `${o.id}:${o.label}`).join(" | "),
    price: p.amount,
  })
  polls.set(id, p)
  return p
}

export const getPoll = (id: string) => polls.get(id)

/** Paid: schedule right after whatever poll is running now. */
export function openPoll(p: Poll, paymentRef: string) {
  if (p.status !== "pending") return p
  const lastEnd = Math.max(0, ...[...polls.values()].filter((x) => x.status !== "pending").map((x) => x.endsAt))
  p.startsAt = Math.max(Date.now(), lastEnd)
  p.endsAt = p.startsAt + POLL.seconds * 1000
  p.status = "scheduled"
  append(p, "paid", { payment: paymentRef, amount: p.amount, startsAt: p.startsAt, endsAt: p.endsAt })
  return p
}

function tick(p: Poll, now = Date.now()) {
  if ((p.status === "scheduled" || p.status === "live") && now >= p.startsAt) p.status = "live"
  if (p.status === "live" && now >= p.endsAt) {
    p.status = "closed"
    const t = tally(p)
    append(p, "closed", { total: p.votes.size, ...Object.fromEntries(Object.entries(t).map(([k, v]) => [`option_${k}`, v])) }, p.endsAt)
  }
}

function tally(p: Poll) {
  const t: Record<string, number> = Object.fromEntries(p.options.map((o) => [o.id, 0]))
  for (const o of p.votes.values()) t[o]++
  return t
}

export function vote(p: Poll, voter: string, option: string) {
  const now = Date.now()
  tick(p, now)
  const key = voterKey(p.id, voter)
  const reason =
    p.status !== "live" ? (now < p.startsAt ? "not open" : "closed") :
    !p.options.some((o) => o.id === option) ? "bad option" :
    p.votes.has(key) ? "already voted" : null
  if (reason) {
    // Cap logged refusals so spam can't bloat the record.
    if (p.audit.filter((e) => e.kind === "rejected").length < MAX_REJECTED) {
      append(p, "rejected", { voter: key, option: option.slice(0, 4), reason }, now)
    }
    return reason
  }
  p.votes.set(key, option)
  append(p, "vote", { voter: key, option }, now)
  return null
}

export function toPublic(p: Poll, voter?: string): PollPublic {
  tick(p)
  return {
    id: p.id,
    creator: p.creator,
    question: p.question,
    options: p.options,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    status: p.status === "pending" ? "scheduled" : p.status,
    votes: tally(p),
    voted: voter ? p.votes.get(voterKey(p.id, voter)) : undefined,
    now: Date.now(),
  }
}

/** The poll on screen: the live one, else the next scheduled, else the last closed for 30s. */
export function currentPoll() {
  const now = Date.now()
  const all = [...polls.values()].filter((p) => p.status !== "pending")
  all.forEach((p) => tick(p, now))
  return (
    all.find((p) => p.status === "live") ??
    all.filter((p) => p.status === "scheduled").sort((a, b) => a.startsAt - b.startsAt)[0] ??
    all.filter((p) => p.status === "closed" && now - p.endsAt < 30_000).sort((a, b) => b.endsAt - a.endsAt)[0]
  )
}

/** Recomputes every hash from the start. True only if no line was changed, removed or reordered. */
export function verifyAudit(p: Poll) {
  let prev = GENESIS
  for (const e of p.audit) {
    const { seq, at, kind, detail } = e
    if (e.prev !== prev || e.hash !== sha(prev + JSON.stringify({ seq, at, kind, detail }))) return false
    prev = e.hash
  }
  return true
}

export function auditOf(p: Poll) {
  tick(p)
  return {
    poll: toPublic(p),
    amount: p.amount,
    entries: p.audit,
    head: p.audit.at(-1)?.hash ?? GENESIS,
    valid: verifyAudit(p),
  }
}
