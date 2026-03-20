import {
  TrendingUp,
  AlertTriangle,
  XCircle,
  Sparkles,
  Lightbulb,
  ThumbsUp,
  HeartCrack,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSpendingInsights, type Insight, type InsightSeverity } from "@/lib/actions/insights"
import { getRegretStats } from "@/lib/actions/regret"

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  {
    icon: React.ElementType
    containerClass: string
    iconClass: string
    badgeClass: string
  }
> = {
  danger: {
    icon: XCircle,
    containerClass: "border-rose-500/30 bg-rose-500/8",
    iconClass: "text-rose-500",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "border-amber-500/30 bg-amber-500/8",
    iconClass: "text-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: TrendingUp,
    containerClass: "border-blue-500/30 bg-blue-500/8",
    iconClass: "text-blue-500",
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  success: {
    icon: ThumbsUp,
    containerClass: "border-emerald-500/30 bg-emerald-500/8",
    iconClass: "text-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
}

function InsightCard({ insight }: { insight: Insight }) {
  const config = SEVERITY_CONFIG[insight.severity]
  const Icon = config.icon

  return (
    <div
      className={`rounded-xl border p-4 space-y-2 transition-colors ${config.containerClass}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${config.iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.message}
          </p>
        </div>
      </div>

      {insight.suggestion && (
        <div className="flex items-start gap-2 pt-1 pl-7">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground italic">
            {insight.suggestion}
          </p>
        </div>
      )}
    </div>
  )
}

export async function SpendingInsights() {
  const [{ insights, hasEnoughData }, { data: regretStats }] = await Promise.all([
    getSpendingInsights(),
    getRegretStats(),
  ])

  const hasRegretData = regretStats && regretStats.length > 0

  return (
    <Card className="rounded-xl shadow-sm border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base sm:text-lg">Spending Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>

        {/* ── Regret Analysis ───────────────────────────── */}
        {hasRegretData && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center gap-2 pb-1">
              <HeartCrack className="h-3.5 w-3.5 text-violet-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Regret Analysis
              </p>
            </div>
            <div className="space-y-2">
              {regretStats!.map((stat) => (
                <div key={stat.category} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{stat.category}</span>
                      <span
                        className={`shrink-0 ml-2 font-semibold ${
                          stat.regretPercentage >= 60
                            ? "text-rose-500"
                            : stat.regretPercentage >= 30
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {stat.regretPercentage}% regret
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          stat.regretPercentage >= 60
                            ? "bg-rose-500"
                            : stat.regretPercentage >= 30
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${stat.regretPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/70 italic pt-1">
              Based on your purchase reflections. Respond to prompts on the dashboard to build this data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
