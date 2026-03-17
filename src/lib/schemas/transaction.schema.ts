import { z } from "zod"

export const transactionSchema = z.object({
  amount: z.number({ message: "Amount is required and must be a number" }).positive("Amount must be greater than 0"),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().min(1, "Please select a category"),
  date: z.date(),
  notes: z.string().optional(),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>
