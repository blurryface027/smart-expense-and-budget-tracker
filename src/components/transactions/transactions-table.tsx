"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import * as LucideIcons from "lucide-react"
import { HeartCrack, Repeat, TrendingUp, Sparkles, MessageSquare, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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
  flags?: string[]
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
          <TableRow className="hover:bg-transparent">
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="hidden md:table-cell">Notes & Insights</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
             const cat = transaction.category as any;
             const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || "Uncategorized";
             const catIcon = (Array.isArray(cat) ? cat[0]?.icon : cat?.icon);
             const catColor = (Array.isArray(cat) ? cat[0]?.color : cat?.color);
             const isRegret = transaction.flags?.includes("Regretted purchase");

             return (
              <TableRow key={transaction.id} className={cn(isRegret && "bg-rose-500/5 hover:bg-rose-500/10 transition-colors")}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0"
                      style={{ 
                        backgroundColor: catColor ? `${catColor}20` : undefined,
                        color: catColor || "var(--muted-foreground)"
                      }}
                    >
                      <DynamicIcon name={catIcon} className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="font-medium text-sm truncate">
                        {catName}
                      </span>
                      {/* Mobile Insights (flags only visible on mobile here) */}
                      <div className="flex flex-wrap gap-1 md:hidden">
                        {transaction.flags?.slice(0, 1).map((f, i) => (
                           <span key={i} className="text-[9px] text-primary font-bold uppercase tracking-wider">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {new Date(transaction.date).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                  <div className="flex flex-col gap-1.5 max-w-[250px]">
                    <span className="truncate">{transaction.notes || "-"}</span>
                    
                    {/* Inline Insights (Data Flags) */}
                    <div className="flex flex-wrap gap-1.5">
                       {transaction.flags?.map((flag, i) => {
                          let Icon = Sparkles
                          let colorClass = "text-primary border-primary/20 bg-primary/5"
                          
                          if (flag === "Regretted purchase") {
                            Icon = HeartCrack
                            colorClass = "text-rose-500 border-rose-500/30 bg-rose-500/10"
                          } else if (flag === "Recurring pattern") {
                            Icon = Repeat
                            colorClass = "text-amber-500 border-amber-500/30 bg-amber-500/10"
                          } else if (flag === "Above average spend") {
                             Icon = TrendingUp
                             colorClass = "text-violet-500 border-violet-500/30 bg-violet-500/10"
                          } else if (flag.includes("Suggestion")) {
                             Icon = AlertCircle
                             colorClass = "text-sky-500 border-sky-500/30 bg-sky-500/10"
                          }

                          return (
                            <Badge variant="outline" key={i} className={cn("text-[9px] px-1.5 py-0 h-4 flex items-center gap-1 font-bold whitespace-nowrap", colorClass)}>
                               <Icon className="h-2.5 w-2.5" />
                               {flag}
                            </Badge>
                          )
                       })}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={`text-right font-medium whitespace-nowrap pt-3 ${transaction.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  <div className="flex flex-col items-end">
                    <span>{transaction.type === 'expense' ? '-' : '+'}₹{Math.abs(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {isRegret && (
                       <span className="text-[9px] text-rose-500/70 font-bold uppercase tracking-widest mt-0.5">Regret</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
             )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
