"use client"

import { useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { CircleDollarSignIcon } from "lucide-react"
import { toast } from "sonner"
import { useLocalStorage } from "usehooks-ts"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SUPERCHAT_TIERS, tierFor } from "@/lib/money/config"
import { useLive } from "@/lib/store"
import { PinnedBubble } from "./pinned-bubble"

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = pk ? loadStripe(pk) : null

type Step = { kind: "compose" } | { kind: "pay"; id: string; clientSecret?: string }

const pinLabel = (s: number) => (s < 60 ? `Pinned ${s}s` : `Pinned ${s / 60} min`)

export function SuperchatDialog() {
  const post = useLive((s) => s.post)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>({ kind: "compose" })
  const [name, setName] = useLocalStorage("ts-name", "", { initializeWithValue: false })
  const [amount, setAmount] = useState(10)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const tier = tierFor(amount)!

  const reset = (o: boolean) => {
    setOpen(o)
    if (!o) {
      setStep({ kind: "compose" })
      setBusy(false)
    }
  }

  const start = async () => {
    setBusy(true)
    const res = await fetch("/api/superchat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, text, amount }),
    })
    setBusy(false)
    if (!res.ok) return toast.error("Couldn't start the payment")
    const data = (await res.json()) as { id: string; clientSecret?: string }
    setStep({ kind: "pay", id: data.id, clientSecret: data.clientSecret })
  }

  const confirm = async (id: string) => {
    setBusy(true)
    const res = await fetch("/api/superchat/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      setBusy(false)
      return toast.error("Payment not confirmed")
    }
    const s = (await res.json()) as { name: string; text: string; amount: number }
    post({ id, user: s.name, text: s.text, tip: s.amount, at: Date.now(), mine: true })
    setText("")
    reset(false)
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Superchat" />}>
        <CircleDollarSignIcon />
      </DialogTrigger>
      <DialogContent className="gap-5 rounded-sm bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-semibold">Superchat</DialogTitle>
        </DialogHeader>

        {step.kind === "compose" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              start()
            }}
          >
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="sc-name">Name</FieldLabel>
                <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} required />
              </Field>
              <Field>
                <FieldLabel>Amount</FieldLabel>
                <ToggleGroup
                  value={[String(amount)]}
                  onValueChange={(v) => v[0] && setAmount(Number(v[0]))}
                  variant="outline"
                  className="grid w-full grid-cols-6"
                  spacing={0}
                >
                  {SUPERCHAT_TIERS.map((t) => (
                    <ToggleGroupItem key={t.amount} value={String(t.amount)} className="numeric w-full">
                      ${t.amount}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <span className="tag">{pinLabel(tier.pinSeconds)}</span>
              </Field>
              <Field>
                <div className="flex items-baseline">
                  <FieldLabel htmlFor="sc-text">Message</FieldLabel>
                  <span className="tag numeric ml-auto">
                    {text.length}/{tier.chars}
                  </span>
                </div>
                <Textarea
                  id="sc-text"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, tier.chars))}
                  rows={3}
                  required
                />
              </Field>
            </FieldGroup>

            <PinnedBubble name={name} text={text} amount={amount} />

            <Button type="submit" size="lg" disabled={busy || !name.trim() || !text.trim()}>
              Send ${amount}
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
            <PinnedBubble name={name} text={text} amount={amount} />
            <p className="tag">Test mode: no money moves.</p>
            <Button size="lg" disabled={busy} onClick={() => confirm(step.id)}>
              Pay ${amount}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
