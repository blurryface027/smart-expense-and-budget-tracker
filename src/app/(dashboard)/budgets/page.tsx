import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBudgets } from "@/lib/actions/budgets"
import { AddBudgetModal } from "@/components/budgets/add-budget-modal"
import { Progress } from "@/components/ui/progress"
import * as LucideIcons from "lucide-react"
import { AlertTriangle, XCircle, CheckCircle2 } from "lucide-react"

const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  if (!name) return <LucideIcons.HelpCircle className={className} />
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
  // @ts-expect-error
  const Icon = LucideIcons[pascalName] || LucideIcons.HelpCircle
  return <Icon className={className} />
}

export default async function BudgetsPage() {
  const { data: budgets } = await getBudgets()

  // Count how many budgets are over limit — for the top banner
  const overBudgetCount = budgets?.filter((b: any) => b.spent > b.limit_amount).length ?? 0

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Budgets</h2>
        <AddBudgetModal />
      </div>

      {/* ── Global over-budget alert banner ─────────────────────────────── */}
      {overBudgetCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-700 dark:text-rose-400">
          <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {overBudgetCount === 1
                ? "1 budget has been exceeded"
                : `${overBudgetCount} budgets have been exceeded`}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              New expenses cannot be added to over-limit categories until next month or the limit is raised.
            </p>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {!budgets || budgets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Budget Management</CardTitle>
            <CardDescription>
              Set limits and track spending by category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
              No budgets set yet. Click the button above to create one.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget: any) => {
            const percentage = Math.min((budget.spent / budget.limit_amount) * 100, 100)
            const isOver = budget.spent >= budget.limit_amount
            const isNear = percentage >= 80 && !isOver

            return (
              <Card
                key={budget.id}
                className={`rounded-xl shadow-sm transition-colors ${
                  isOver
                    ? "border-rose-500/40 bg-rose-500/5"
                    : isNear
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-muted"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: `${budget.category?.color || "#64748b"}20`,
                          color: budget.category?.color || "#64748b",
                        }}
                      >
                        <DynamicIcon name={budget.category?.icon} className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{budget.category?.name || "Uncategorized"}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOver && <XCircle className="h-4 w-4 text-rose-500" />}
                      {isNear && !isOver && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {!isOver && !isNear && <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-60" />}
                      <div className="text-xs font-medium text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                        {budget.period}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between mt-2">
                    <div className={`text-2xl font-bold ${isOver ? "text-rose-500" : ""}`}>
                      ₹{budget.spent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of ₹{budget.limit_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress
                      value={percentage}
                      className={`h-2 ${isOver ? "[&>div]:bg-rose-500" : isNear ? "[&>div]:bg-amber-500" : ""}`}
                    />
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className={
                        isOver ? "text-rose-500 font-semibold" :
                        isNear ? "text-amber-500 font-semibold" :
                        "text-muted-foreground"
                      }>
                        {isOver ? `${percentage.toFixed(0)}% — Over limit` :
                         isNear ? `${percentage.toFixed(1)}% — Near limit` :
                         `${percentage.toFixed(1)}%`}
                      </span>
                      <span className={isOver ? "text-rose-500 font-medium" : "text-muted-foreground"}>
                        {isOver
                          ? `₹${(budget.spent - budget.limit_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeded`
                          : `₹${(budget.limit_amount - budget.spent).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Inline alert inside the card */}
                  {isOver && (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      Expenses blocked — budget limit reached
                    </div>
                  )}
                  {isNear && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Approaching limit — spend carefully
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
