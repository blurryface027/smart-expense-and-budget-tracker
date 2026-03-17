"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { goalSchema, GoalFormValues } from "@/lib/schemas/goal.schema"

export async function addGoal(data: GoalFormValues) {
  const supabase = await createClient()

  const parsed = goalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Invalid form data" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: parsed.data.title,
    target_amount: parsed.data.targetAmount,
    deadline: parsed.data.deadline ? parsed.data.deadline.toISOString() : null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/goals")
  return { success: true }
}

export async function getGoals() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("goals")
    .select(`
      id,
      title,
      target_amount,
      current_amount,
      deadline,
      created_at
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  return { data, error: null }
}
