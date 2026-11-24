"use client"

import { useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { ListChecksIcon, PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { useLocalStorage } from "usehooks-ts"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { POLL } from "@/lib/money/config"

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = pk ? loadStripe(pk) : null

type Step = { kind: "compose" } | { kind: "pay"; id: string; clientSecret?: string }

export function PollDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>({ kind: "compose" })
  const [name, setName] = useLocalStorage("ts-name", "", { initializeWithValue: false })
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [busy, setBusy] = useState(false)

  const filled = options.map((o) => o.trim()).filter(Boolean)
  const unique = new Set(filled.map((o) => o.toLowerCase())).size === filled.length
  const ready = name.trim() && question.trim().length >= 3 && filled.length >= POLL.minOptions && unique

  const reset = (o: boolean) => {
    setOpen(o)
    if (!o) {
      setStep({ kind: "compose" })
      setBusy(false)
    }
  }

  const start = async () => {
    setBusy(true)
    const res = await fetch("/api/poll", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creator: name, question, options: filled }),
    })
    setBusy(false)
    if (!res.ok) return toast.error("Check the poll")
    const data = (await res.json()) as { id: string; clientSecret?: string }
    setStep({ kind: "pay", id: data.id, clientSecret: data.clientSecret })
  }

  const confirm = async (id: string) => {
    setBusy(true)
    const res = await fetch(`/api/poll/${id}/confirm`, { method: "POST" })
    if (!res.ok) {
      setBusy(false)
      return toast.error("Payment not confirmed")
    }
    setQuestion("")
    setOptions(["", ""])
    reset(false)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Start a poll" />}>
        <ListChecksIcon />
      </DialogTrigger>
      <DialogContent className="gap-5 rounded-sm bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2 font-heading text-lg font-semibold">
            Poll
            <span className="tag numeric">
              ${POLL.price} · {POLL.seconds}s
            </span>
          </DialogTitle>
        </DialogHeader>

        {step.kind === "compose" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (ready) start()
            }}
          >
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="poll-name">Name</FieldLabel>
                <Input id="poll-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
              </Field>
              <Field>
                <div className="flex items-baseline">
                  <FieldLabel htmlFor="poll-q">Question</FieldLabel>
                  <span className="tag numeric ml-auto">
                    {question.length}/{POLL.questionChars}
                  </span>
                </div>
                <Input
                  id="poll-q"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, POLL.questionChars))}
                />
              </Field>
              <Field>
                <FieldLabel>Options</FieldLabel>
                <div className="flex flex-col gap-2">
                  {options.map((o, i) => (
                    <div key={i} className="flex gap-1.5">
                      <Input
                        value={o}
                        aria-label={`Option ${i + 1}`}
                        maxLength={POLL.optionChars}
                        onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                      {options.length > POLL.minOptions && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove option ${i + 1}`}
                          onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        >
                          <XIcon />
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < POLL.maxOptions && (
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setOptions([...options, ""])}>
                      <PlusIcon />
                      Option
                    </Button>
                  )}
                </div>
              </Field>
            </FieldGroup>
            <Button type="submit" size="lg" disabled={busy || !ready}>
              Start poll · ${POLL.price}
            </Button>
          </form>
        ) : step.clientSecret && stripePromise ? (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret: step.clientSecret, onComplete: () => confirm(step.id) }}
          >
            <EmbeddedCheckout className="max-h-[70dvh] overflow-y-auto rounded-lg" />
          </EmbeddedCheckoutProvider>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-sm font-semibold">{question}</p>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {filled.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <p className="tag">Test mode: no money moves.</p>
            <Button size="lg" disabled={busy} onClick={() => confirm(step.id)}>
              Pay ${POLL.price}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
