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
import { Target } from "lucide-react"

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
            
            return (
              <Card key={goal.id} className="rounded-xl shadow-sm border-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Target className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-base truncate">{goal.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="text-2xl font-bold">
                      ₹{goal.current_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      of ₹{goal.target_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Progress value={percentage} className="h-2" />
                    <div className="flex justify-between text-xs mt-2">
                      <span className="font-medium">
                        {percentage.toFixed(1)}%
                      </span>
                      {goal.deadline && (
                        <span className="text-muted-foreground truncate ml-4 text-right">
                          <span className="hidden sm:inline">Target: </span>{format(new Date(goal.deadline), "MMM d, yyyy")}
                        </span>
                      )}
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
