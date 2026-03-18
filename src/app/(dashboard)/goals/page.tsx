import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getGoals } from "@/lib/actions/goals"
import { AddGoalModal } from "@/components/goals/add-goal-modal"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { Target, TrendingUp, TrendingDown, Star, AlertCircle, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default async function GoalsPage() {
  const { data: goals, error } = await getGoals()

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Savings Goals</h2>
        <AddGoalModal />
      </div>
      
      {!goals || goals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
            <CardDescription>
              Track your progress towards your financial goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
              No goals set yet. Click the button above to create one.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal: any) => {
            const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
            const { smartData } = goal
            
            const healthConfig = {
              poor: { label: "Poor", class: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
              moderate: { label: "Moderate", class: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
              good: { label: "Good", class: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
              "on-track": { label: "On Track", class: "bg-primary/15 text-primary border-primary/30" },
            }
            const health = healthConfig[smartData.health as keyof typeof healthConfig]

            return (
              <Card key={goal.id} className="rounded-xl shadow-sm border-muted flex flex-col h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Target className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base truncate">{goal.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-1.5 py-0 h-5", health.class)}>
                      {health.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  {/* Progress Header */}
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-bold">
                      ₹{goal.current_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      target: ₹{goal.target_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  {/* Progress Bar Area */}
                  <div className="space-y-1">
                    <Progress value={percentage} className="h-2" />
                    <div className="flex justify-between text-[11px] mt-2">
                      <div className="flex items-center gap-1 font-semibold">
                        {percentage.toFixed(1)}%
                        {smartData.pace === "ahead" ? (
                          <span className="text-primary flex items-center ml-1"><TrendingUp className="h-3 w-3 inline mr-0.5" /> Ahead of schedule</span>
                        ) : smartData.pace === "behind" ? (
                          <span className="text-rose-500 flex items-center ml-1"><TrendingDown className="h-3 w-3 inline mr-0.5" /> Behind by ₹{Math.round(smartData.behindAmount).toLocaleString()}</span>
                        ) : (
                           <span className="text-muted-foreground flex items-center ml-1 opacity-70">On track</span>
                        )}
                      </div>
                      {goal.deadline && (
                        <span className="text-muted-foreground truncate ml-4 text-right">
                          <span className="hidden sm:inline">Target: </span>{format(new Date(goal.deadline), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Smart Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="bg-muted/30 rounded-lg p-2">
                       <p className="text-[10px] text-muted-foreground uppercase font-medium">Daily Need</p>
                       <p className="text-sm font-bold">
                         {smartData.requiredDaily ? `₹${Math.round(smartData.requiredDaily).toLocaleString()}` : "N/A"}
                       </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                       <p className="text-[10px] text-muted-foreground uppercase font-medium">Monthly Need</p>
                       <p className="text-sm font-bold">
                         {smartData.requiredMonthly ? `₹${Math.round(smartData.requiredMonthly).toLocaleString()}` : "N/A"}
                       </p>
                    </div>
                  </div>

                  {/* Intelligence & Alerts Section */}
                  <div className="space-y-3 pt-3 mt-auto">
                    {smartData.riskMessage && (
                      <div className="flex gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <p className="leading-snug">{smartData.riskMessage}</p>
                      </div>
                    )}
                    
                    {percentage >= 90 && percentage < 100 && (
                      <div className="flex gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                        <Star className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <p className="leading-snug">So close! One final push to reach your target! 🎉</p>
                      </div>
                    )}

                    {smartData.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                           <Lightbulb className="h-3 w-3" />
                           Smart Suggestions
                        </div>
                        <div className="space-y-1.5">
                          {smartData.suggestions.map((s: string, i: number) => (
                            <div key={i} className="text-xs text-balance text-muted-foreground/80 flex items-start gap-2 leading-relaxed">
                               <div className="h-1 w-1 rounded-full bg-primary/30 mt-1.5 shrink-0" />
                               {s}
                            </div>
                          ))}
                          <div className="text-[11px] italic text-primary/70 flex items-start gap-2 pt-1">
                             <span>💡 Tip:</span>
                             {smartData.randomTip}
                          </div>
                        </div>
                      </div>
                    )}
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
