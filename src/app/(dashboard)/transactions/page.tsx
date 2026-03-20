import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { getTransactions, getCategories } from "@/lib/actions/transactions"
import { TrendingUp, TrendingDown, Scale, History, Calendar } from "lucide-react"
import { FilterBar } from "@/components/transactions/filter-bar"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TransactionsPage({ searchParams }: Props) {
  const params = await searchParams
  
  const categoryIds = typeof params.categoryIds === 'string' 
    ? [params.categoryIds] 
    : Array.isArray(params.categoryIds) 
      ? params.categoryIds 
      : []

  const [{ data }, { data: categories }] = await Promise.all([
    getTransactions({
      search: params.search as string,
      categoryIds: categoryIds,
      type: params.type as 'income' | 'expense' | 'all',
      startDate: params.startDate as string,
      endDate: params.endDate as string,
    }),
    getCategories()
  ])

  // Destructure transactions and stats
  const { transactions, stats } = (data as any) || { transactions: [], stats: { totalCount: 0, totalSpent: 0, totalIncome: 0, netBalance: 0, peakDay: "", timeInsight: "" } }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <FilterBar categories={categories || []} />
          </div>
          <AddTransactionModal />
        </div>
      </div>

      {/* Quick Stats (Top of List - Minimal Injection) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-muted/15 border border-muted p-2.5 rounded-lg flex flex-col gap-0.5">
           <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
             <History className="h-3 w-3" />
             Total
           </div>
           <div className="text-base sm:text-lg font-bold">{stats.totalCount} active</div>
        </div>
        <div className="bg-muted/15 border border-muted p-2.5 rounded-lg flex flex-col gap-0.5">
           <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-rose-500 font-semibold uppercase tracking-wider">
             <TrendingDown className="h-3 w-3" />
             Spent
           </div>
           <div className="text-base sm:text-lg font-bold text-rose-500">₹{stats.totalSpent.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-muted/15 border border-muted p-2.5 rounded-lg flex flex-col gap-0.5">
           <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-500 font-semibold uppercase tracking-wider">
             <TrendingUp className="h-3 w-3" />
             Income
           </div>
           <div className="text-base sm:text-lg font-bold text-emerald-500">₹{stats.totalIncome.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-muted/15 border border-muted p-2.5 rounded-lg flex flex-col gap-0.5">
           <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-primary font-semibold uppercase tracking-wider">
             <Scale className="h-3 w-3" />
             Net
           </div>
           <div className={`text-base sm:text-lg font-bold ${stats.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              ₹{stats.netBalance.toLocaleString('en-IN')}
           </div>
        </div>
      </div>
      
      {/* Time-based Behavior Insights (Small Injection) */}
      {stats.totalCount > 0 && (
          <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-semibold px-1 text-muted-foreground/80">
            <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border/50">
              <Calendar className="h-3 w-3" />
              Peak Day: {stats.peakDay}
            </div>
            {stats.timeInsight && (
               <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border/50">
                 <History className="h-3 w-3" />
                 {stats.timeInsight}
               </div>
            )}
          </div>
      )}

      <Card className="rounded-xl shadow-sm border-muted">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions History</CardTitle>
              <CardDescription>
                View and manage your behavioral spending patterns.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={transactions || []} />
        </CardContent>
      </Card>
    </div>
  )
}
