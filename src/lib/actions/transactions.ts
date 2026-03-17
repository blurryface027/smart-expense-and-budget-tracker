"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/transaction.schema"

export async function addTransaction(data: TransactionFormValues) {
  const supabase = await createClient()

  // Validate on server too
  const parsed = transactionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Invalid form data" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // ── Budget enforcement (expenses only) ─────────────────────────────────
  if (parsed.data.type === "expense") {
    const now = new Date()
    // IST start of month (UTC+5:30)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
    const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
    const startOfMonth = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS).toISOString()

    const { data: budget } = await supabase
      .from("budgets")
      .select("limit_amount")
      .eq("user_id", user.id)
      .eq("category_id", parsed.data.categoryId)
      .maybeSingle()

    if (budget) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("category_id", parsed.data.categoryId)
        .eq("type", "expense")
        .gte("date", startOfMonth)

      const spent = existing?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
      const newTotal = spent + parsed.data.amount

      if (newTotal > budget.limit_amount) {
        const remaining = Math.max(0, budget.limit_amount - spent)
        return {
          error: `Budget limit exceeded. You can only spend ₹${remaining.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more in this category this month.`,
          budgetExceeded: true,
        }
      }
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: parsed.data.amount,
    type: parsed.data.type,
    category_id: parsed.data.categoryId,
    date: parsed.data.date.toISOString(),
    notes: parsed.data.notes,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, color, type")
    .order("name")

  if (error) {
    return { error: error.message, data: null }
  }

  return { data, error: null }
}

export async function getTransactions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      amount,
      type,
      date,
      notes,
      category:categories(name, icon, color)
    `)
    .order("date", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  return { data, error: null }
}
