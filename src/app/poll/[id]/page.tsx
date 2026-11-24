import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DownloadIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auditOf, getPoll } from "@/lib/money/polls";

const et = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });

export async function generateMetadata() {
  return { title: "Poll audit · True Sight" };
}

export default function PollAuditPage({ params }: PageProps<"/poll/[id]">) {
  return (
    <main className="h-dvh overflow-y-auto">
      <header className="on-navy flex h-12 items-center px-4">
        <Link href="/" className="font-heading text-xl font-semibold">
          True Sight
        </Link>
      </header>
      <Suspense
        fallback={<Skeleton className="mx-auto mt-10 h-64 max-w-4xl" />}
      >
        <PollAudit params={params} />
      </Suspense>
    </main>
  );
}

async function PollAudit({ params }: { params: Promise<{ id: string }> }) {
  // Live, in-memory record: always read at request time.
  await connection();
  const { id } = await params;
  const p = getPoll(id);
  if (!p || p.status === "pending") notFound();
  const a = auditOf(p);
  const total = Object.values(a.poll.votes).reduce((x, y) => x + y, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <section className="flex flex-col gap-2">
        <span className="tag">
          Poll · {a.poll.creator} · <span className="numeric">${a.amount}</span>{" "}
          ·{" "}
          <span className="numeric">
            {et(a.poll.startsAt)} – {et(a.poll.endsAt)} ET
          </span>
        </span>
        <h1 className="display text-3xl font-black text-pretty">
          {a.poll.question}
        </h1>
        <span className="text-sm text-muted-foreground">{a.poll.status === "closed"
            ? "Closed"
            : a.poll.status === "live"
              ? "Live"
              : "Scheduled"}</span>
      </section>

      <section className="flex flex-col gap-3">
        {a.poll.options.map((o) => {
          const n = a.poll.votes[o.id] ?? 0;
          const pct = total ? (n / total) * 100 : 0;
          return (
            <div key={o.id} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="tag w-4 !text-foreground">{o.id}</span>
                <span className="font-medium">{o.label}</span>
                <span className="numeric ml-auto font-semibold">{n}</span>
                <span className="numeric w-14 text-right text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <span className="tag numeric">
          {total} {total === 1 ? "vote" : "votes"}
        </span>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-sm bg-mist p-4">
        {a.valid ? (
          <ShieldCheckIcon className="size-5 shrink-0" />
        ) : (
          <ShieldAlertIcon className="size-5 shrink-0 text-destructive" />
        )}
        <span className="font-medium">
          {a.valid ? "Chain verified" : "Chain broken"}
        </span>
        <code
          className="numeric min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
          title={a.head}
        >
          {a.head}
        </code>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <a href={`/api/poll/${p.id}`} download={`poll-${p.id}.json`} />
          }
        >
          <DownloadIcon />
          JSON
        </Button>
      </section>

      <Table className="font-mono text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Time ET</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead className="text-right">Hash</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {a.entries.map((e) => (
            <TableRow
              key={e.seq}
              className={
                e.kind === "rejected" ? "text-muted-foreground" : undefined
              }
            >
              <TableCell className="numeric">{e.seq}</TableCell>
              <TableCell className="numeric whitespace-nowrap">
                {et(e.at)}
              </TableCell>
              <TableCell className="uppercase">{e.kind}</TableCell>
              <TableCell
                className="max-w-[320px] truncate"
                title={JSON.stringify(e.detail)}
              >
                {Object.entries(e.detail)
                  .filter(
                    ([k]) =>
                      !(
                        e.kind === "paid" &&
                        (k === "startsAt" || k === "endsAt")
                      ),
                  )
                  .map(([k, v]) => `${k}=${v}`)
                  .join("  ")}
              </TableCell>
              <TableCell className="text-right" title={e.hash}>
                {e.hash.slice(0, 12)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
