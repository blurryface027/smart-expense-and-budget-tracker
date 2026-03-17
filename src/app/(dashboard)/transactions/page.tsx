import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { getTransactions } from "@/lib/actions/transactions"

export default async function TransactionsPage() {
  const { data: transactions } = await getTransactions()
  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h2>
        <AddTransactionModal />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transactions History</CardTitle>
          <CardDescription>
            View and manage all your past transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={transactions || []} />
        </CardContent>
      </Card>
    </div>
  )
}
