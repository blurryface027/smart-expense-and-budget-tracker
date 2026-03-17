"use server"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardStats() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated", data: null }
  }

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message, data: null }
  }

  // Use IST for month boundaries (UTC+5:30)
  // We calculate 'now' in IST to get the correct month/year for Indian users
  const now = new Date()
  // IST = UTC + 5h30m = UTC + 330 minutes
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
  const currentMonth = nowIST.getUTCMonth()
  const currentYear = nowIST.getUTCFullYear()

  const lastMonthYear  = currentMonth === 0 ? currentYear - 1 : currentYear
  const lastMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1

  let totalIncome = 0
  let totalExpense = 0
  
  let currentMonthIncome = 0
  let currentMonthExpense = 0
  
  let lastMonthIncome = 0
  let lastMonthExpense = 0

  transactions.forEach((t) => {
    const tDate = new Date(t.date)
    // Convert transaction date to IST for month comparison
    const tDateIST = new Date(tDate.getTime() + IST_OFFSET_MS)
    const tMonth = tDateIST.getUTCMonth()
    const tYear = tDateIST.getUTCFullYear()
    
    // All time stats
    if (t.type === "income") totalIncome += Number(t.amount)
    if (t.type === "expense") totalExpense += Number(t.amount)

    // Current month stats (IST-aware)
    if (tMonth === currentMonth && tYear === currentYear) {
      if (t.type === "income") currentMonthIncome += Number(t.amount)
      if (t.type === "expense") currentMonthExpense += Number(t.amount)
    }

    // Last month stats (IST-aware)
    if (tMonth === lastMonthIndex && tYear === lastMonthYear) {
      if (t.type === "income") lastMonthIncome += Number(t.amount)
      if (t.type === "expense") lastMonthExpense += Number(t.amount)
    }
  })

  const totalBalance = totalIncome - totalExpense
  const currentMonthBalance = currentMonthIncome - currentMonthExpense
  const lastMonthBalance = lastMonthIncome - lastMonthExpense
  
  // Calculate percentage change
  let balanceChangePercent = 0
  if (lastMonthBalance !== 0) {
    balanceChangePercent = ((currentMonthBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100
  } else if (currentMonthBalance > 0) {
    balanceChangePercent = 100
  }

  // Calculate generic chart data (last 6 months) — IST-aware
  const chartData = []
  for (let i = 5; i >= 0; i--) {
    // Build the month index relative to current IST month/year
    let mIdx = currentMonth - i
    let mYear = currentYear
    while (mIdx < 0) { mIdx += 12; mYear -= 1 }
    // Get a representative date in UTC that represents that IST month (1st of month at midnight IST = 18:30 UTC prev day)
    const monthName = new Date(Date.UTC(mYear, mIdx, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })

    let monthTotal = 0
    transactions.forEach(t => {
      const tDateIST = new Date(new Date(t.date).getTime() + IST_OFFSET_MS)
      if (tDateIST.getUTCMonth() === mIdx && tDateIST.getUTCFullYear() === mYear && t.type === 'expense') {
        monthTotal += Number(t.amount)
      }
    })
    
    chartData.push({
      name: monthName,
      total: monthTotal
    })
  }

  return {
    data: {
      totalBalance,
      currentMonthIncome,
      currentMonthExpense,
      balanceChangePercent,
      chartData
    },
    error: null
  }
}
