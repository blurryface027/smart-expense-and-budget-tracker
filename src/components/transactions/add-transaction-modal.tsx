"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, Plus, AlertTriangle, XCircle, Info } from "lucide-react"
import * as LucideIcons from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

import { transactionSchema, type TransactionFormValues } from "@/lib/schemas/transaction.schema"
import { addTransaction, getCategories } from "@/lib/actions/transactions"
import { getBudgetStatus } from "@/lib/actions/budgets"

type BudgetMap = Record<string, {
  spent: number
  limit: number
  remaining: number
  isOver: boolean
  isNear: boolean
}>

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
  // @ts-expect-error
  const Icon = LucideIcons[pascalName] || LucideIcons.HelpCircle
  return <Icon className={className} />
}

export function AddTransactionModal() {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [budgetMap, setBudgetMap] = useState<BudgetMap>({})

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "" as any,
      type: "expense",
      categoryId: "",
      notes: "",
      date: new Date(),
    },
  })

  // Fetch categories + budget status when the modal opens
  useEffect(() => {
    if (!open) return
    async function fetchData() {
      const [catRes, budgetRes] = await Promise.all([
        getCategories(),
        getBudgetStatus(),
      ])
      if (catRes.data) setCategories(catRes.data)
      if (budgetRes.data) setBudgetMap(budgetRes.data)
    }
    fetchData()
  }, [open])

  const selectedType = form.watch("type")
  const selectedCategoryId = form.watch("categoryId")
  const enteredAmount = Number(form.watch("amount")) || 0

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  // Compute live budget state for the selected expense category
  const budgetInfo = selectedType === "expense" && selectedCategoryId
    ? budgetMap[selectedCategoryId] ?? null
    : null

  const projectedSpent = budgetInfo ? budgetInfo.spent + enteredAmount : 0
  const projectedOver = budgetInfo ? projectedSpent > budgetInfo.limit : false
  const wouldExceed = projectedOver && enteredAmount > 0

  // Block submission if already over budget (even before entering amount)
  const alreadyOver = budgetInfo?.isOver ?? false

  async function onSubmit(data: TransactionFormValues) {
    setLoading(true)
    const result = await addTransaction(data)
    setLoading(false)

    if (result.error) {
      toast.error(result.error, {
        description: (result as any).budgetExceeded
          ? "Adjust the amount or update your budget limit."
          : undefined,
        duration: 6000,
      })
    } else {
      toast.success("Transaction added successfully")
      form.reset()
      setOpen(false)
      // Re-fetch budget status to reflect latest spend
      getBudgetStatus().then(r => { if (r.data) setBudgetMap(r.data) })
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="w-full md:w-auto h-9"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" /> Add Transaction
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full sm:max-w-[425px] mx-auto">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Record a new income or expense to track your budget.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={(v) => {
                      field.onChange(v)
                      form.setValue("categoryId", "") // reset category on type switch
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type">
                            {field.value === "expense" ? "Expense" : field.value === "income" ? "Income" : "Select type"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === "" ? "" : Number(val))
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category">
                            {field.value && categories.length > 0
                              ? (categories.find(c => c.id === field.value)?.name || "Select a category")
                              : "Select a category"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">Loading...</div>
                        ) : (
                          filteredCategories.map((category) => {
                            const bs = budgetMap[category.id]
                            return (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2 w-full">
                                  <DynamicIcon name={category.icon} className="h-4 w-4 text-muted-foreground" />
                                  <span className="flex-1">{category.name}</span>
                                  {bs?.isOver && (
                                    <span className="ml-2 text-xs text-rose-500 font-medium">Over limit</span>
                                  )}
                                  {bs?.isNear && !bs.isOver && (
                                    <span className="ml-2 text-xs text-amber-500 font-medium">Near limit</span>
                                  )}
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Live budget feedback banner ────────────────────────────── */}
              {budgetInfo && (
                <>
                  {/* Already over budget — block entirely */}
                  {alreadyOver && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Budget limit reached</p>
                        <p className="text-xs mt-0.5 opacity-80">
                          You have exceeded the ₹{budgetInfo.limit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} limit for this category. No more expenses can be added.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Would exceed with this amount */}
                  {!alreadyOver && wouldExceed && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">This amount exceeds your budget</p>
                        <p className="text-xs mt-0.5 opacity-80">
                          Only ₹{budgetInfo.remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining. Reduce the amount to stay within budget.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Near limit warning (80%+) */}
                  {!alreadyOver && !wouldExceed && budgetInfo.isNear && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Approaching budget limit</p>
                        <p className="text-xs mt-0.5 opacity-80">
                          ₹{budgetInfo.remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining of ₹{budgetInfo.limit.toLocaleString("en-IN", { minimumFractionDigits: 2 })} limit.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Budget healthy info strip */}
                  {!alreadyOver && !wouldExceed && !budgetInfo.isNear && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Budget: ₹{budgetInfo.spent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} spent · ₹{budgetInfo.remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining
                      </span>
                    </div>
                  )}
                </>
              )}
              {/* ───────────────────────────────────────────────────────────── */}

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger className={cn(
                        "w-full pl-3 h-9 text-left font-normal border rounded-md flex items-center bg-background",
                        !field.value && "text-muted-foreground"
                      )}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto mr-3 h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Grocery shopping, salary, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading || alreadyOver || wouldExceed}
                variant={alreadyOver || wouldExceed ? "outline" : "default"}
              >
                {loading
                  ? "Adding..."
                  : alreadyOver
                  ? "Budget Limit Reached"
                  : wouldExceed
                  ? "Exceeds Budget Limit"
                  : "Add Transaction"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
