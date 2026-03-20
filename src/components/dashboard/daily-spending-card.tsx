import { getDailySpendingLimit } from "@/lib/actions/daily-limit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ShieldCheck, AlertTriangle, XOctagon } from "lucide-react"

export async function DailySpendingCard() {
  const { data } = await getDailySpendingLimit()

  // Don't render the card at all if no budgets are configured
  if (!data) return null

  const { dailyLimit, todaySpent, todayRemaining, remainingDays, status } = data

  const statusConfig = {
    safe: {
      icon: ShieldCheck,
      iconClass: "text-emerald-500",
      badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      barClass: "bg-emerald-500",
      label: "Safe",
      containerClass: "",
    },
    risky: {
      icon: AlertTriangle,
      iconClass: "text-amber-500",
      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      barClass: "bg-amber-500",
      label: "Risky",
      containerClass: "",
    },
    overspent: {
      icon: XOctagon,
      iconClass: "text-rose-500",
      badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
      barClass: "bg-rose-500",
      label: "Over limit",
      containerClass: "",
    },
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  // Bar fill: capped at 100%
  const fillPct = dailyLimit > 0 ? Math.min(100, (todaySpent / dailyLimit) * 100) : 0

  return (
    <Card className="rounded-xl shadow-sm border-muted">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <CardTitle className="text-base sm:text-lg">Today's Spending Limit</CardTitle>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
          >
            <StatusIcon className={`h-3 w-3 ${config.iconClass}`} />
            {config.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">You can spend today</p>
            <p className="text-xl sm:text-2xl font-bold truncate">
              ₹{dailyLimit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right ml-auto min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Spent today</p>
            <p className={`text-sm font-semibold truncate ${status === "overspent" ? "text-rose-500" : status === "risky" ? "text-amber-500" : "text-foreground"}`}>
              ₹{todaySpent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${config.barClass}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {status === "overspent"
                ? `Over by ₹${Math.abs(todayRemaining - 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`
                : `₹${todayRemaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining`}
            </span>
            <span>{remainingDays} day{remainingDays !== 1 ? "s" : ""} left this month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
