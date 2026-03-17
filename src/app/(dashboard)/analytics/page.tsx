import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getAnalyticsData } from "@/lib/actions/analytics"
import { getDashboardStats } from "@/lib/actions/dashboard"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { CategoryPieChart } from "@/components/analytics/category-pie-chart"

export default async function AnalyticsPage() {
  const { data: analytics } = await getAnalyticsData()
  const { data: stats } = await getDashboardStats()

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h2>
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm border-muted">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Spending Trend (Last 6 Months)</CardTitle>
            <CardDescription>
              Your expense history over time.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 pr-2 sm:pl-4">
            <DashboardCharts data={stats?.chartData || []} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-muted">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Category Breakdown</CardTitle>
            <CardDescription>
              Where your money went this month.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <CategoryPieChart data={analytics?.categoryData || []} />
          </CardContent>
        </Card>
      </div>
    </div>

  )
}
