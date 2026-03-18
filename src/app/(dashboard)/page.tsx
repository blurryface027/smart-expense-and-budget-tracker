import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowUpIcon, Wallet } from "lucide-react"
import { getDashboardStats } from "@/lib/actions/dashboard"
import { getTransactions } from "@/lib/actions/transactions"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { SpendingInsights } from "@/components/dashboard/spending-insights"
import { DailySpendingCard } from "@/components/dashboard/daily-spending-card"
import { RegretPrompt } from "@/components/dashboard/regret-prompt"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const [{ data: stats }, { data: txData }, supabase] = await Promise.all([
    getDashboardStats(),
    getTransactions(),
    createClient(),
  ])
  const transactions = (txData as any)?.transactions || []

  const { data: { user } } = await supabase.auth.getUser()
  const userName: string =
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there"

  // Time-aware greeting using IST (Asia/Kolkata, UTC+5:30)
  const nowIST = new Date()
  const hourIST = parseInt(
    nowIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }),
    10
  )
  // 5-12: morning | 12-17: afternoon | 17-21: evening | 21-24 & 0-5: night
  const greeting =
    hourIST >= 5 && hourIST < 12 ? "Good morning" :
    hourIST >= 12 && hourIST < 17 ? "Good afternoon" :
    hourIST >= 17 && hourIST < 21 ? "Good evening" :
    "Good night"

  const recentTransactions = transactions?.slice(0, 5) || []

  return (
    <div className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* Personalized Welcome Header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-muted-foreground font-medium">{greeting},</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {userName}! 👋
        </h2>
      </div>
      
      {/* Stats Cards — 1 col on mobile, 3 on large */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats?.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.balanceChangePercent && stats.balanceChangePercent > 0 ? "+" : ""}
              {stats?.balanceChangePercent ? stats.balanceChangePercent.toFixed(1) : "0"}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ₹{stats?.currentMonthIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total income this month
            </p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm border-muted sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">
              ₹{stats?.currentMonthExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total expenses this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Spending Card */}
      <DailySpendingCard />

      {/* Regret Prompts for eligible transactions */}
      <RegretPrompt />

      {/* Spending Insights */}
      <SpendingInsights />

      {/* Charts & Recent — stacked on mobile, side-by-side on lg */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 rounded-xl shadow-sm border-muted">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Spending Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 pr-2 sm:pl-4">
            <DashboardCharts data={stats?.chartData || []} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-xl shadow-sm border-muted">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No recent transactions
                </div>
              ) : (
                transactions.slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                       <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-none truncate">
                         {Array.isArray(t.category) ? t.category[0]?.name : (t.category as any)?.name || "Uncategorized"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(t.date).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold shrink-0 ${t.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {t.type === 'expense' ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
