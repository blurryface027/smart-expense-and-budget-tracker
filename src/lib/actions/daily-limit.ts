"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Daily spending limit: (monthly budget - spent so far this month) / remaining days in month
 * Uses IST for day/month boundaries.
 */
export async function getDailySpendingLimit() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const now = new Date()
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)

  const currentYear = nowIST.getUTCFullYear()
  const currentMonth = nowIST.getUTCMonth()
  const todayDay = nowIST.getUTCDate()

  // Total days in current IST month
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate()
  const remainingDays = Math.max(1, daysInMonth - todayDay + 1) // include today

  // Start of month in UTC (IST midnight)
  const startOfMonth = new Date(
    Date.UTC(currentYear, currentMonth, 1) - IST_OFFSET_MS
  ).toISOString()

  // Fetch total budget (sum of all monthly limits)
  const [{ data: budgets }, { data: transactions }] = await Promise.all([
    supabase
      .from("budgets")
      .select("limit_amount")
      .eq("user_id", user.id)
      .eq("period", "monthly"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", startOfMonth),
  ])

  if (!budgets || budgets.length === 0) {
    return { data: null, error: null } // No budgets set yet
  }

  const totalMonthlyBudget = budgets.reduce((sum, b) => sum + Number(b.limit_amount), 0)
  const spentSoFar = (transactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
  const remainingBudget = Math.max(0, totalMonthlyBudget - spentSoFar)
  const dailyLimit = remainingBudget / remainingDays

  // Compute today's spending
  const todayStartIST = new Date(Date.UTC(currentYear, currentMonth, todayDay) - IST_OFFSET_MS)
  const todayEndIST = new Date(Date.UTC(currentYear, currentMonth, todayDay + 1) - IST_OFFSET_MS)

  const { data: todayTransactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .gte("date", todayStartIST.toISOString())
    .lt("date", todayEndIST.toISOString())

  const todaySpent = (todayTransactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
  const todayRemaining = Math.max(0, dailyLimit - todaySpent)

  // Status calculation
  let status: "safe" | "risky" | "overspent"
  if (todaySpent > dailyLimit) {
    status = "overspent"
  } else if (todaySpent >= dailyLimit * 0.75) {
    status = "risky"
  } else {
    status = "safe"
  }

  return {
    data: {
      dailyLimit,
      todaySpent,
      todayRemaining,
      spentSoFar,
      totalMonthlyBudget,
      remainingBudget,
      remainingDays,
      status,
    },
    error: null,
  }
}
