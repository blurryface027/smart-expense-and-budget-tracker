"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { budgetSchema, BudgetFormValues } from "@/lib/schemas/budget.schema"

export async function addBudget(data: BudgetFormValues) {
  const supabase = await createClient()

  // Validate on server too
  const parsed = budgetSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Invalid form data" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    limit_amount: parsed.data.limitAmount,
    period: parsed.data.period,
  })

  // Check for unique constraint error (user already has a budget for this category)
  if (error?.code === "23505") {
    return { error: "A budget for this category already exists" }
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/budgets")
  revalidatePath("/")
  return { success: true }
}

export async function getBudgets() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const { data: budgets, error } = await supabase
    .from("budgets")
    .select(`
      id,
      limit_amount,
      period,
      start_date,
      category_id,
      category:categories(id, name, icon, color)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category_id")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .gte("date", startOfMonth)

  const budgetsWithSpent = budgets.map((budget) => {
    let spent = 0;
    if (transactions) {
      transactions.forEach(t => {
        if (t.category_id === budget.category_id) {
          spent += Number(t.amount)
        }
      })
    }
    return {
      ...budget,
      spent
    }
  })

  return { data: budgetsWithSpent, error: null }
}
