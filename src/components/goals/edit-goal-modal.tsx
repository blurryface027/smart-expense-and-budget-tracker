"use client"

import { useState, useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Target, CalendarIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

import { goalSchema, type GoalFormValues } from "@/lib/schemas/goal.schema"
import { updateGoal } from "@/lib/actions/goals"

interface EditGoalModalProps {
  goal: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditGoalModal({ goal, open, onOpenChange }: EditGoalModalProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal.title,
      targetAmount: goal.target_amount,
      deadline: goal.deadline ? new Date(goal.deadline) : null,
    },
  })

  useEffect(() => {
    if (open && goal) {
      form.reset({
        title: goal.title,
        targetAmount: Number(goal.target_amount),
        deadline: goal.deadline ? new Date(goal.deadline) : null,
      })
    }
  }, [open, goal, form])

  async function onSubmit(data: GoalFormValues) {
    startTransition(async () => {
      const result = await updateGoal(goal.id, data)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Goal updated successfully")
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[425px] mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Saving Goal</DialogTitle>
          <DialogDescription>
            Update your goal details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-muted-foreground">
                        <Target className="h-4 w-4" />
                      </div>
                      <Input placeholder="E.g. New Laptop, Vacation" className="pl-9" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount</FormLabel>
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
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2.5">
                    <FormLabel>Deadline (Optional)</FormLabel>
                    <div>
                      <Popover>
                        <FormControl>
                          <PopoverTrigger
                            className={cn(
                              "w-full pl-3 h-9 text-left font-normal border rounded-md flex items-center bg-background text-sm",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto mr-3 h-4 w-4 opacity-50" />
                          </PopoverTrigger>
                        </FormControl>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0,0,0,0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
