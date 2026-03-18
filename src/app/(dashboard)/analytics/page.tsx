import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAnalyticsData, type AnalyticsRange } from "@/lib/actions/analytics"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { CategoryPieChart } from "@/components/analytics/category-pie-chart"
import { RangeFilter } from "@/components/analytics/range-filter"
import { ArrowDownIcon, ArrowUpIcon, Info, Sparkles, TrendingUp, TrendingDown, HeartCrack } from "lucide-react"
import { Suspense } from "react"

type Props = {
  searchParams: Promise<{ range?: string }>
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { range = 'monthly' } = await searchParams
  const { data: analytics } = await getAnalyticsData({ range: range as AnalyticsRange })

  if (!analytics) return null

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Understand your behavioral patterns</p>
        </div>

        {/* Financial Health Score (Minimal UI Impact) */}
        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Health Score</div>
          <div className={`text-xl font-bold ${analytics.healthScore >= 70 ? 'text-emerald-500' : analytics.healthScore >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
            {analytics.healthScore}
          </div>
        </div>
      </div>

      {/* Time-based Filtering (Logic Only) */}
      <Suspense fallback={<div className="h-9 w-full max-w-sm bg-muted animate-pulse rounded-lg" />}>
        <RangeFilter />
      </Suspense>

      {/* Overview Stats (Injected into existing style cards) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">₹{analytics.totalSpent.toLocaleString('en-IN')}</div>
            <div className={`flex items-center gap-1 text-xs mt-1 ${analytics.pctChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {analytics.pctChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(analytics.pctChange).toFixed(1)}% vs prev period
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Avg Daily Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">₹{Math.round(analytics.avgDailySpend).toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Based on {range} data</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate leading-tight">{analytics.mostExpensiveCategory}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Most expensive</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Highest Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">₹{analytics.highestDayAmt.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Single day peak</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Trend Card */}
        <Card className="lg:col-span-4 shadow-sm border-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">Spending Trend</CardTitle>
                <CardDescription>Daily breakdown for the selected range.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-2 pr-2 sm:pl-4">
            <DashboardCharts data={analytics.trendData} />
            
            {/* Smart Insights (Text Injection) */}
            {analytics.insights.length > 0 && (
              <div className="mt-6 space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" />
                  Behavioral Insights
                </div>
                <div className="grid gap-2">
                  {analytics.insights.map((insight, i) => (
                    <div key={i} className="flex gap-2 text-sm text-balance leading-relaxed">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakdown Card */}
        <Card className="lg:col-span-3 shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Category Breakdown</CardTitle>
            <CardDescription>Share of wallet per category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <CategoryPieChart data={analytics.categoryData} />

             {/* Budget vs Actual (Same UI) */}
             {analytics.budgetVsActual.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5" />
                    Budget vs Actual
                  </div>
                  <div className="space-y-2.5">
                    {analytics.budgetVsActual.slice(0, 3).map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{item.category}</span>
                          <span className={item.over ? 'text-rose-500 font-bold' : 'text-emerald-500'}>
                             {item.over ? 'Over' : 'Within'} Budget
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                           <div 
                             className={`h-full rounded-full ${item.over ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                             style={{ width: `${Math.min(100, (item.spent / item.budget) * 100)}%` }}
                           />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>₹{item.spent.toLocaleString()} spent</span>
                          <span>Budget: ₹{item.budget.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             )}

             {/* Saving Suggestions (Text Injection) */}
             {analytics.suggestions.length > 0 && (
                <div className="space-y-2 pt-4 border-t bg-emerald-500/5 -mx-4 px-4 py-3 rounded-b-xl border-t-emerald-500/20">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                    Saving Opportunities
                  </div>
                  <ul className="space-y-1">
                    {analytics.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span>•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Regret Analysis integrated into insights if applicable */}
    </div>
  )
}
