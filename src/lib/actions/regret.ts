"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

/** Save a regret response linked to a transaction */
export async function saveRegretFeedback(transactionId: string, regretted: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Upsert so users can change their mind
  const { error } = await supabase
    .from("regret_feedback")
    .upsert(
      {
        user_id: user.id,
        transaction_id: transactionId,
        regretted,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "transaction_id" }
    )

  if (error) return { error: error.message }

  revalidatePath("/")
  return { success: true }
}

/**
 * Returns expense transactions that are 24h+ old and haven't been responded to yet.
 * Limited to 1 pending prompt at a time to avoid overwhelming the user.
 */
export async function getPendingRegretPrompts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  // 24 hours ago in UTC
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get transactions older than 24h
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select(`id, amount, date, notes, category:categories(name, icon)`)
    .eq("user_id", user.id)
    .eq("type", "expense")
    .lte("date", cutoff)
    .order("date", { ascending: false })
    .limit(20)

  if (txError || !transactions) return { data: [], error: txError?.message }

  if (transactions.length === 0) return { data: [], error: null }

  // Get already-responded transaction IDs
  const txIds = transactions.map((t) => t.id)
  const { data: responded } = await supabase
    .from("regret_feedback")
    .select("transaction_id")
    .in("transaction_id", txIds)

  const respondedSet = new Set((responded ?? []).map((r) => r.transaction_id))
  const pending = transactions.filter((t) => !respondedSet.has(t.id))

  // Return just the oldest unanswered one
  return { data: pending.slice(0, 1), error: null }
}

/** Fetch regret stats per category for Insights */
export async function getRegretStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  // Get all regret feedback for this user with category name
  const { data, error } = await supabase
    .from("regret_feedback")
    .select(`
      regretted,
      transaction:transactions(
        amount,
        category:categories(name)
      )
    `)
    .eq("user_id", user.id)

  if (error || !data) return { data: null, error: error?.message }

  // Aggregate by category
  const catStats: Record<string, { total: number; regretted: number }> = {}

  for (const row of data) {
    const tx = row.transaction as any
    const catName = (Array.isArray(tx?.category) ? tx.category[0]?.name : tx?.category?.name) || "Other"
    if (!catStats[catName]) catStats[catName] = { total: 0, regretted: 0 }
    catStats[catName].total += 1
    if (row.regretted) catStats[catName].regretted += 1
  }

  // Build array for display, only categories with ≥2 responses
  const results = Object.entries(catStats)
    .filter(([, s]) => s.total >= 2)
    .map(([category, s]) => ({
      category,
      total: s.total,
      regretted: s.regretted,
      regretPercentage: Math.round((s.regretted / s.total) * 100),
    }))
    .sort((a, b) => b.regretPercentage - a.regretPercentage)

  return { data: results, error: null }
}
