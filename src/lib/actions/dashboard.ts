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

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  let totalIncome = 0
  let totalExpense = 0
  
  let currentMonthIncome = 0
  let currentMonthExpense = 0
  
  let lastMonthIncome = 0
  let lastMonthExpense = 0

  transactions.forEach((t) => {
    const tDate = new Date(t.date)
    const tMonth = tDate.getMonth()
    const tYear = tDate.getFullYear()
    
    // All time stats
    if (t.type === "income") totalIncome += Number(t.amount)
    if (t.type === "expense") totalExpense += Number(t.amount)

    // Current month stats
    if (tMonth === currentMonth && tYear === currentYear) {
      if (t.type === "income") currentMonthIncome += Number(t.amount)
      if (t.type === "expense") currentMonthExpense += Number(t.amount)
    }

    // Last month stats
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    if (tMonth === lastMonthDate.getMonth() && tYear === lastMonthDate.getFullYear()) {
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

  // Calculate generic chart data (last 6 months)
  const chartData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = d.toLocaleString('default', { month: 'short' })
    
    let monthTotal = 0
    transactions.forEach(t => {
      const tD = new Date(t.date)
      if (tD.getMonth() === d.getMonth() && tD.getFullYear() === d.getFullYear() && t.type === 'expense') {
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
