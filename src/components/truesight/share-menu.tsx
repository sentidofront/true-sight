"use client"

import { useState } from "react"
import { CopyIcon, DownloadIcon, ImageIcon, Share2Icon, ShareIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { Race } from "@/lib/elections/replay"
import { raceSlug, raceTitle, sharePath, shareText } from "@/lib/share"

/** X's mark isn't in lucide; this is the official glyph path. */
function XMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/**
 * Share window: the blue result card (the same image X shows as the link preview), ready to copy,
 * download or post. The moment is frozen when it opens, so the card doesn't change underneath you.
 */
export function ShareMenu({ race, t }: { race: Race; t: number }) {
  const [frozen, setFrozen] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  const at = frozen ?? t
  const path = sharePath(race, at)
  const imageUrl = `${path}/opengraph-image`
  const link = () => `${window.location.origin}${path}`
  const fileName = `truesight-${raceSlug(race)}.png`
  const blob = () => fetch(imageUrl).then((r) => r.blob())

  const copyImage = async () => {
    try {
      // The promise goes straight into ClipboardItem so Safari keeps the user gesture.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob() })])
      toast("Image copied")
    } catch {
      toast.error("This browser can't copy images. Use Download.")
    }
  }

  const nativeShare = async () => {
    const file = new File([await blob()], fileName, { type: "image/png" })
    const data = { files: [file], text: shareText(race), url: link() }
    if (navigator.canShare?.(data)) await navigator.share(data).catch(() => {})
    else await navigator.share({ text: shareText(race), url: link() }).catch(() => {})
  }

  // Phones get the system share sheet (it can also save the image); desktops get a plain download.
  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator && window.matchMedia("(pointer: coarse)").matches

  return (
    <Dialog
      onOpenChange={(open) => {
        setFrozen(open ? Math.floor(t) : null)
        setLoaded(false)
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Share" />}>
        <Share2Icon />
      </DialogTrigger>
      <DialogContent className="gap-4 rounded-sm bg-popover sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-extrabold">{raceTitle(race)}</DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-sm bg-navy">
          {!loaded && <Skeleton className="absolute inset-0 rounded-none bg-navy" />}
          {frozen !== null && (
            // eslint-disable-next-line @next/next/no-img-element -- generated card from our own route
            <img src={imageUrl} alt={shareText(race)} className="size-full" onLoad={() => setLoaded(true)} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button onClick={copyImage}>
            <ImageIcon />
            Copy image
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(link())
              toast("Link copied")
            }}
          >
            <CopyIcon />
            Copy link
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const intent = new URL("https://x.com/intent/post")
              intent.searchParams.set("text", shareText(race))
              intent.searchParams.set("url", link())
              window.open(intent, "_blank", "noopener,noreferrer")
            }}
          >
            <XMark />
            Post
          </Button>
          {canNativeShare ? (
            <Button variant="outline" onClick={nativeShare}>
              <ShareIcon />
              Share
            </Button>
          ) : (
            <Button variant="outline" nativeButton={false} render={<a href={imageUrl} download={fileName} />}>
              <DownloadIcon />
              Download
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
