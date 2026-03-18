"use client"

import { useState, useEffect, useTransition } from "react"
import { ThumbsUp, ThumbsDown, Clock, X } from "lucide-react"
import { getPendingRegretPrompts, saveRegretFeedback } from "@/lib/actions/regret"
import { Button } from "@/components/ui/button"

type PendingTransaction = {
  id: string
  amount: number
  date: string
  notes?: string | null
  category: { name: string; icon: string } | { name: string; icon: string }[] | null
}

export function RegretPrompt() {
  const [pending, setPending] = useState<PendingTransaction | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getPendingRegretPrompts().then(({ data }) => {
      if (data && data.length > 0) {
        setPending(data[0] as PendingTransaction)
      }
    })
  }, [])

  if (!pending || dismissed) return null

  const catRaw = pending.category
  const categoryName =
    (Array.isArray(catRaw) ? catRaw[0]?.name : (catRaw as any)?.name) || "Uncategorized"

  const dateLabel = new Date(pending.date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  function respond(regretted: boolean) {
    if (!pending) return
    startTransition(async () => {
      await saveRegretFeedback(pending.id, regretted)
      setDismissed(true)
    })
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500 mt-0.5">
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">Was this purchase worth it?</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            ₹{Number(pending.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} on{" "}
            <span className="font-medium text-foreground/70">{categoryName}</span>
            {pending.notes ? ` · "${pending.notes}"` : ""} · {dateLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-12 sm:pl-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500"
          disabled={isPending}
          onClick={() => respond(false)}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500"
          disabled={isPending}
          onClick={() => respond(true)}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          No
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground"
          disabled={isPending}
          onClick={() => setDismissed(true)}
          title="Remind me later"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
