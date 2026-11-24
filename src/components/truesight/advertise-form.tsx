"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { HaloDropzone } from "@/components/ui/halo-dropzone"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { AD, AD_MAX_BYTES, AD_TYPES, schedule, type AdSeat } from "@/lib/money/config"

const Schema = z.object({
  seat: z.string(),
  sponsor: z.string().trim().min(2, "Required"),
  email: z.email("Enter a valid email"),
  landing: z.url({ protocol: /^https$/, error: "Must start with https://" }),
  notPolitical: z.literal(true, "Required"),
  rights: z.literal(true, "Required"),
  outbid: z.literal(true, "Required"),
})
type Values = z.infer<typeof Schema>

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

function readSize(file: File) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = URL.createObjectURL(file)
  })
}

const DECLARATIONS = [
  ["notPolitical", "This ad is not political and isn't paid for by a candidate, party or PAC"],
  ["rights", "We own the rights to this image and link"],
  ["outbid", "Anyone can take this seat by paying double. No refund if that happens."],
] as const

export function AdvertiseForm() {
  const params = useSearchParams()
  const [seats, setSeats] = useState<AdSeat[] | null>(null)
  const [creative, setCreative] = useState<{ file: File; url: string } | null>(null)
  const [creativeError, setCreativeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      seat: params.get("seat") ?? "",
      sponsor: "",
      email: "",
      landing: "https://",
      notPolitical: false as true,
      rights: false as true,
      outbid: false as true,
    },
  })
  const seatId = useWatch({ control: form.control, name: "seat" })
  const sponsorName = useWatch({ control: form.control, name: "sponsor" })

  const load = () =>
    fetch("/api/ads")
      .then((r) => r.json())
      .then((d: { seats: AdSeat[] }) => {
        setSeats(d.seats)
        const current = form.getValues("seat")
        const pick = d.seats.find((s) => String(s.seat) === current && !s.held) ?? d.seats.find((s) => !s.held && !s.holder) ?? d.seats.find((s) => !s.held)
        if (pick) form.setValue("seat", String(pick.seat))
      })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const plan = seats ? schedule(seats) : []
  const cycle = plan.reduce((a, p) => a + p.seconds, 0)
  const share = (s: AdSeat) => {
    const p = plan.find((x) => x.seat.seat === s.seat)
    return p && cycle ? Math.round((p.seconds / cycle) * 100) : 0
  }
  const chosen = seats?.find((s) => String(s.seat) === seatId)

  const pickCreative = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setCreativeError(null)
    const dims = await readSize(file)
    if (!AD_TYPES.includes(file.type) || file.size > AD_MAX_BYTES) return setCreativeError("PNG, JPG or WebP, up to 300 KB")
    if (!dims || dims.width !== AD.width || dims.height !== AD.height) return setCreativeError(`Must be ${AD.width}×${AD.height}`)
    setCreative({ file, url: URL.createObjectURL(file) })
  }

  const submit = form.handleSubmit(async (v) => {
    if (!chosen) return
    if (!creative) return setCreativeError(`Add a ${AD.width}×${AD.height} image`)
    setBusy(true)
    const body = new FormData()
    body.set("seat", v.seat)
    body.set("price", String(chosen.next))
    body.set("sponsor", v.sponsor)
    body.set("email", v.email)
    body.set("landing", v.landing)
    for (const [name] of DECLARATIONS) body.set(name, "on")
    body.set("creative", creative.file)
    const res = await fetch("/api/ads/checkout", { method: "POST", body })
    if (!res.ok) {
      setBusy(false)
      const { error } = await res.json().catch(() => ({ error: "" }))
      if (error === "price changed" || error === "held") {
        load()
        return toast.error(error === "held" ? "Someone is buying that seat" : "That seat just changed hands")
      }
      return toast.error(error === "size" ? `Image must be ${AD.width}×${AD.height}` : "Check the form")
    }
    const { url } = (await res.json()) as { url: string }
    window.location.assign(url)
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <Controller
        control={form.control}
        name="seat"
        render={({ field }) => (
          <FieldSet>
            <FieldLegend className="tag">Seat</FieldLegend>
            {!seats ? (
              <Skeleton className="h-36 w-full" />
            ) : (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {seats.map((s) => (
                  <FieldLabel key={s.seat} htmlFor={`seat-${s.seat}`} className="block">
                    <Card className="relative h-full w-full gap-2 overflow-hidden rounded-sm bg-mist p-4 shadow-none ring-0 transition-colors has-data-checked:bg-navy has-data-checked:text-white has-data-disabled:opacity-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{s.held ? "Held" : (s.holder?.sponsor ?? "Open")}</span>
                        <RadioGroupItem id={`seat-${s.seat}`} value={String(s.seat)} disabled={s.held} className="sr-only" />
                      </div>
                      {s.holder && <span className="text-xs">{share(s)}% of the time</span>}
                      <span className="numeric mt-auto text-2xl font-semibold">{usd(s.next)}</span>
                    </Card>
                  </FieldLabel>
                ))}
              </RadioGroup>
            )}
          </FieldSet>
        )}
      />

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!form.formState.errors.sponsor}>
          <FieldLabel htmlFor="sponsor">Company legal name</FieldLabel>
          <Input id="sponsor" autoComplete="organization" {...form.register("sponsor")} />
          <FieldError errors={[form.formState.errors.sponsor]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel htmlFor="email">Billing email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.landing} className="sm:col-span-2">
          <FieldLabel htmlFor="landing">Link</FieldLabel>
          <Input id="landing" type="url" inputMode="url" {...form.register("landing")} />
          <FieldError errors={[form.formState.errors.landing]} />
        </Field>
      </FieldGroup>

      <Field data-invalid={!!creativeError}>
        <FieldLabel>Creative</FieldLabel>
        <HaloDropzone
          translucent={false}
          accept={AD_TYPES.join(",")}
          onFiles={pickCreative}
          emptyLabel="Drop image"
          formatHint={`${AD.width}×${AD.height} · PNG, JPG, WebP · 300 KB`}
          showSuccessThumbnails={false}
          successResetMs={0}
        />
        {creativeError && <FieldError>{creativeError}</FieldError>}
        {creative && (
          <div className="flex flex-col gap-1">
            <div className="max-w-full overflow-hidden rounded-[2px]" style={{ width: AD.width, aspectRatio: `${AD.width} / ${AD.height}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
              <img src={creative.url} alt="" className="size-full object-cover" />
            </div>
            <span className="tag text-[10px]">Ad · {sponsorName || "Company"}</span>
          </div>
        )}
      </Field>

      <FieldGroup className="gap-3">
        {DECLARATIONS.map(([name, label]) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <Checkbox id={name} checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                <FieldLabel htmlFor={name} className="font-normal">
                  {label}
                </FieldLabel>
              </Field>
            )}
          />
        ))}
      </FieldGroup>

      <div className="flex items-center gap-4 pt-2">
        {chosen && (
          <span className="numeric text-3xl font-semibold">{usd(chosen.next)}</span>
        )}
        <Button type="submit" size="lg" className="ml-auto" disabled={busy || !chosen}>
          Pay
        </Button>
      </div>
    </form>
  )
}
