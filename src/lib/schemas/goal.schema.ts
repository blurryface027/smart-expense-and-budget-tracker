import { z } from "zod"

export const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  targetAmount: z.number({ message: "Target amount is required" }).positive("Target must be greater than 0"),
  deadline: z.date().optional().nullable(),
})

export type GoalFormValues = z.infer<typeof goalSchema>
