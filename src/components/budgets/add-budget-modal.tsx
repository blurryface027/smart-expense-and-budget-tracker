"use client"

import { useState, useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="flex h-6 w-6 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${category.color}20`, color: category.color }}
                            >
                              <DynamicIcon name={category.icon} className="h-3 w-3" />
                            </div>
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
