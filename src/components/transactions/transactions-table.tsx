"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as LucideIcons from "lucide-react"

type Transaction = {
  id: string
  amount: number
  type: string
  date: string
  notes: string | null
  category: {
    name: string
    icon: string
    color: string
  }[] | {
    name: string
    icon: string
    color: string
  } | null
}

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

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground border border-dashed rounded-lg">
        No transactions found.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
                    style={{ 
                      backgroundColor: (Array.isArray(transaction.category) ? transaction.category[0]?.color : transaction.category?.color) ? `${(Array.isArray(transaction.category) ? transaction.category[0]?.color : transaction.category?.color)}20` : undefined,
                      color: (Array.isArray(transaction.category) ? transaction.category[0]?.color : transaction.category?.color) || "var(--muted-foreground)"
                    }}
                  >
                    <DynamicIcon name={Array.isArray(transaction.category) ? transaction.category[0]?.icon : transaction.category?.icon} className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">
                    {(Array.isArray(transaction.category) ? transaction.category[0]?.name : transaction.category?.name) || "Uncategorized"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(transaction.date).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm hidden md:table-cell">
                {transaction.notes || "-"}
              </TableCell>
              <TableCell className={`text-right font-medium ${transaction.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {transaction.type === 'expense' ? '-' : '+'}₹{Math.abs(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
