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

  // Fetch all transactions to calculate overall balance
  const { data: allTransactions, error: txError } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .eq("user_id", user.id)

  if (txError) return { data: null, error: txError.message }

  let totalIncome = 0
  let totalExpenses = 0
  let todaySpent = 0

  const todayStartIST = new Date(Date.UTC(currentYear, currentMonth, todayDay) - IST_OFFSET_MS).getTime()
  const todayEndIST = new Date(Date.UTC(currentYear, currentMonth, todayDay + 1) - IST_OFFSET_MS).getTime()

  allTransactions?.forEach(t => {
    const amt = Number(t.amount)
    if (t.type === "income") {
      totalIncome += amt
    } else {
      totalExpenses += amt
      
      // Calculate today's spending for the status bar
      const tDate = new Date(t.date).getTime()
      if (tDate >= todayStartIST && tDate < todayEndIST) {
        todaySpent += amt
      }
    }
  })

  const remainingBalance = totalIncome - totalExpenses
  const dailyLimit = remainingBalance > 0 ? remainingBalance / remainingDays : 0

  // Safe Debug Logging (dev only)
  if (process.env.NODE_ENV === "development") {
    console.log({
      income: totalIncome,
      expenses: totalExpenses,
      remainingBalance,
      remainingDays,
      dailyLimit
    });
  }

  const todayRemaining = Math.max(0, dailyLimit - todaySpent)

  // Status calculation
  let status: "safe" | "risky" | "overspent"
  if (todaySpent > dailyLimit && dailyLimit > 0) {
    status = "overspent"
  } else if (dailyLimit > 0 && todaySpent >= dailyLimit * 0.75) {
    status = "risky"
  } else {
    status = "safe"
  }

  return {
    data: {
      dailyLimit,
      todaySpent,
      todayRemaining,
      spentSoFar: totalExpenses, // Backward compatibility: using total expenses
      totalMonthlyBudget: totalIncome, // Backward compatibility: using total income
      remainingBudget: remainingBalance, // Backward compatibility: using total balance
      remainingDays,
      status,
    },
    error: null,
  }
}
