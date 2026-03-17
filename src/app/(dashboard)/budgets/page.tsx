import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBudgets } from "@/lib/actions/budgets"
import { AddBudgetModal } from "@/components/budgets/add-budget-modal"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import * as LucideIcons from "lucide-react"

const DynamicIcon = ({ name, className }: { name?: string, className?: string }) => {
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
  const { data: budgets, error } = await getBudgets()

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Budgets</h2>
        <AddBudgetModal />
      </div>
      
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
            const isOver = budget.spent > budget.limit_amount
            const isNear = percentage > 80 && !isOver
            
            return (
              <Card key={budget.id} className="rounded-xl shadow-sm border-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ 
                          backgroundColor: `${budget.category?.color || '#64748b'}20`, 
                          color: budget.category?.color || '#64748b' 
                        }}
                      >
                        <DynamicIcon name={budget.category?.icon} className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base">{budget.category?.name || "Uncategorized"}</CardTitle>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                      {budget.period}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-bold">
                      ₹{budget.spent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of ₹{budget.limit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Progress value={percentage} className="h-2">
                       {/* This component has a built-in track and indicator but we can optionally style it if we didn't use the standard component setup. The standard one is fine here. */}
                    </Progress>
                    <div className="flex justify-between text-xs mt-2">
                      <span className={`${isOver ? 'text-rose-500 font-medium' : isNear ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>
                        {isOver ? 'Over budget' : isNear ? 'Near limit' : `${percentage.toFixed(1)}%`}
                      </span>
                      <span className="text-muted-foreground">
                        {isOver 
                          ? `₹${(budget.spent - budget.limit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeded`
                          : `₹${(budget.limit_amount - budget.spent).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
