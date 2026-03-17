"use client"

import { useState, useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Search } from "lucide-react"
import { toast } from "sonner"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { budgetSchema, type BudgetFormValues } from "@/lib/schemas/budget.schema"
import { addBudget } from "@/lib/actions/budgets"
import { getCategories } from "@/lib/actions/transactions"
import * as LucideIcons from "lucide-react"

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

export function AddBudgetModal() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState<any[]>([])
  const [categorySearch, setCategorySearch] = useState("")

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: "",
      limitAmount: "" as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
      period: "monthly",
    },
  })

  useEffect(() => {
    async function fetchCats() {
      const { data } = await getCategories()
      if (data) {
        // Already sorted alphabetically by the server query
        setCategories(data.filter(c => c.type === 'expense'))
      }
    }
    fetchCats()
  }, [])

  async function onSubmit(data: BudgetFormValues) {
    startTransition(async () => {
      const result = await addBudget(data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Budget added successfully")
        setOpen(false)
        form.reset()
      }
    })
  }

  return (
    <>
      <Button type="button" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Set Budget Limit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[425px] mx-auto">
        <DialogHeader>
          <DialogTitle>Set Budget Limit</DialogTitle>
          <DialogDescription>
            Create a spending limit for a specific category.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => {
                const selectedCat = categories.find(c => c.id === field.value)
                const filteredCats = categories.filter(c =>
                  (c.name || "").toLowerCase().includes(categorySearch.toLowerCase())
                )
                return (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); setCategorySearch("") }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category">
                            {selectedCat ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex h-5 w-5 items-center justify-center rounded-full"
                                  style={{ backgroundColor: `${selectedCat.color}20`, color: selectedCat.color }}
                                >
                                  <DynamicIcon name={selectedCat.icon} className="h-3 w-3" />
                                </div>
                                <span>{selectedCat.name || "Unnamed Category"}</span>
                              </div>
                            ) : (
                              "Select a category"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* Search box */}
                        <div className="flex items-center border-b px-2 py-1.5 sticky top-0 bg-popover z-10">
                          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                          <input
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search categories…"
                            value={categorySearch}
                            onChange={e => setCategorySearch(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                          />
                        </div>
                        {filteredCats.length === 0 ? (
                          <div className="py-4 text-center text-sm text-muted-foreground">No categories found</div>
                        ) : (
                          filteredCats.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex h-6 w-6 items-center justify-center rounded-full"
                                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                                >
                                  <DynamicIcon name={category.icon} className="h-3 w-3" />
                                </div>
                                {category.name || "Unnamed Category"}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="limitAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                        <Input 
                          placeholder="0.00" 
                          className="pl-7"
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === "" ? "" : Number(val));
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Budget"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  )
}
