"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ChoicePoll } from "@/components/ui/choice-poll";
import { Progress } from "@/components/ui/progress";
import type { PollPublic } from "@/lib/money/config";
import { voterId } from "@/lib/voter";

const votesLabel = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

/** The paid poll on screen. Polls the server every second while it runs, so every viewer sees the same count. */
export function LivePoll() {
  const [poll, setPoll] = useState<PollPublic | null>(null);
  const [now, setNow] = useState(0);
  const [skew, setSkew] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const load = async () => {
      const res = await fetch(`/api/poll?voter=${voterId()}`, {
        cache: "no-store",
      }).catch(() => null);
      const p = res?.ok ? ((await res.json()) as PollPublic | null) : null;
      if (!alive) return;
      if (p) setSkew(p.now - Date.now());
      setPoll(p);
      timer = window.setTimeout(load, p && p.status !== "closed" ? 1000 : 4000);
    };
    load();
    const clock = window.setInterval(() => setNow(Date.now()), 200);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearInterval(clock);
    };
  }, []);

  if (!poll || !now) return null;

  const serverNow = now + skew;
  const live = poll.status === "live" && serverNow < poll.endsAt;
  const closed = poll.status === "closed" || serverNow >= poll.endsAt;
  const remaining = Math.max(0, poll.endsAt - serverNow);
  const total = poll.endsAt - poll.startsAt;
  const voted = !!poll.voted;

  const cast = async (option: string | string[]) => {
    const o = Array.isArray(option) ? option[0] : option;
    if (!o || !live || voted) return;
    setPoll({
      ...poll,
      voted: o,
      votes: { ...poll.votes, [o]: (poll.votes[o] ?? 0) + 1 },
    });
    const res = await fetch(`/api/poll/${poll.id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voter: voterId(), option: o }),
    });
    const data = await res.json();
    setPoll(res.ok ? data : data.poll);
  };

  return (
    <Card size="sm" className="gap-3 rounded-sm px-3 py-3 shadow-none ring-0">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 truncate text-sm text-muted-foreground">Poll by {poll.creator}</span>
        <span className="numeric ml-auto text-sm font-semibold">
          {closed
            ? "Closed"
            : poll.status === "scheduled" && serverNow < poll.startsAt
              ? "Next"
              : `${Math.ceil(remaining / 1000)}s`}
        </span>
      </div>
      {live && (
        <Progress className="h-0.5"           value={(remaining / total) * 100}
          aria-label="Time left"
        />
      )}

      <ChoicePoll.Root
        value={poll.voted}
        onValueChange={cast}
        votes={poll.votes}
        showResults={voted || closed}
        hasVoted={voted || closed}
        disabled={!live}
        className="gap-2"
      >
        <ChoicePoll.Header>
          <ChoicePoll.Title className="text-sm font-semibold text-pretty">
            {poll.question}
          </ChoicePoll.Title>
        </ChoicePoll.Header>
        <ChoicePoll.Options className="gap-1.5">
          {poll.options.map((o) => (
            <ChoicePoll.Option key={o.id} value={o.id} className="py-2 text-sm">
              <ChoicePoll.Indicator />
              <ChoicePoll.Label>{o.label}</ChoicePoll.Label>
              <ChoicePoll.Progress />
              <ChoicePoll.Percentage className="numeric" />
            </ChoicePoll.Option>
          ))}
        </ChoicePoll.Options>
        <ChoicePoll.Footer className="text-xs">
          <span className="numeric">
            {votesLabel(Object.values(poll.votes).reduce((a, b) => a + b, 0))}
          </span>
          {closed && (
            <Link
              href={`/poll/${poll.id}`}
              className="flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <ShieldCheckIcon className="size-3.5" />
              Audit
            </Link>
          )}
        </ChoicePoll.Footer>
      </ChoicePoll.Root>
    </Card>
  );
}
