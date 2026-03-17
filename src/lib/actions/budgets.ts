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
  // IST start of month: compute current month in IST, then get its UTC equivalent
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
  // First day of current IST month at midnight IST → subtract offset to get UTC
  const startOfMonth = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS).toISOString()
  
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

/** Returns a map of categoryId → budget status for the current month.
 *  Used client-side in AddTransactionModal for real-time budget feedback. */
export async function getBudgetStatus(): Promise<{
  data: Record<string, { spent: number; limit: number; remaining: number; isOver: boolean; isNear: boolean }> | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const now = new Date()
  // IST start of month: compute current month in IST, then get its UTC equivalent
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
  const startOfMonth = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS).toISOString()

  const [{ data: budgets }, { data: transactions }] = await Promise.all([
    supabase.from("budgets").select("category_id, limit_amount").eq("user_id", user.id),
    supabase.from("transactions").select("amount, category_id")
      .eq("user_id", user.id).eq("type", "expense").gte("date", startOfMonth),
  ])

  if (!budgets) return { data: {}, error: null }

  const result: Record<string, { spent: number; limit: number; remaining: number; isOver: boolean; isNear: boolean }> = {}

  for (const b of budgets) {
    const spent = (transactions ?? [])
      .filter(t => t.category_id === b.category_id)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const limit = Number(b.limit_amount)
    const remaining = Math.max(0, limit - spent)
    const percentage = limit > 0 ? (spent / limit) * 100 : 0
    result[b.category_id] = {
      spent,
      limit,
      remaining,
      isOver: spent >= limit,
      isNear: percentage >= 80 && spent < limit,
    }
  }

  return { data: result, error: null }
}
