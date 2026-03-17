import { z } from "zod"

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Please select a category"),
  limitAmount: z.number({ message: "Budget limit is required" }).positive("Limit must be greater than 0"),
  period: z.enum(["monthly", "weekly"]),
})

export type BudgetFormValues = z.infer<typeof budgetSchema>
