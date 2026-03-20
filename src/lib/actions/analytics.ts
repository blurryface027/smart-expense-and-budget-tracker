"use server"

import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"

export type AnalyticsRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

interface AnalyticsParams {
  range?: AnalyticsRange
  startDate?: string
  endDate?: string
}

export async function getAnalyticsData(params: AnalyticsParams = {}) {
  const { range = 'monthly', startDate, endDate } = params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated", data: null }
  }

  // ── Determine Date Bounds ───────────────────────────────────────────
  const now = new Date()
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
  
  let fromDate: Date
  let toDate = new Date(nowIST)
  let prevFromDate: Date
  let prevToDate: Date

  if (range === 'custom' && startDate && endDate) {
    try {
      const s = new Date(startDate)
      const e = new Date(endDate)
      // Start of day (00:00:00 IST)
      fromDate = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) - IST_OFFSET_MS)
      // End of day (23:59:59 IST)
      toDate = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999) - IST_OFFSET_MS)
      
      const duration = toDate.getTime() - fromDate.getTime()
      prevFromDate = new Date(fromDate.getTime() - duration)
      prevToDate = new Date(fromDate.getTime() - 1)
    } catch (err) {
      // Fallback if dates invalid
      fromDate = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS)
      prevFromDate = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth() - 1, 1) - IST_OFFSET_MS)
      prevToDate = new Date(fromDate.getTime() - 1)
    }
  } else if (range === 'daily') {
    fromDate = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS)
    prevFromDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000)
    prevToDate = new Date(fromDate.getTime() - 1)
  } else if (range === 'weekly') {
    // Rolling 7-day range (today - 6 days)
    const rollingStart = new Date(nowIST.getTime() - 6 * 24 * 60 * 60 * 1000)
    // Start of day today-6 at 00:00:00 IST
    fromDate = new Date(Date.UTC(rollingStart.getUTCFullYear(), rollingStart.getUTCMonth(), rollingStart.getUTCDate()) - IST_OFFSET_MS)
    
    // Comparison period: previous 7 days
    prevFromDate = new Date(fromDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    prevToDate = new Date(fromDate.getTime() - 1)
  } else if (range === 'yearly') {
    // Current year start (Jan 1, 00:00:00 IST)
    fromDate = new Date(Date.UTC(nowIST.getUTCFullYear(), 0, 1) - IST_OFFSET_MS)
    // Comparison: Previous year (Jan 1 to same point last year)
    prevFromDate = new Date(Date.UTC(nowIST.getUTCFullYear() - 1, 0, 1) - IST_OFFSET_MS)
    // Slightly better: exact same date last year
    prevToDate = new Date(Date.UTC(nowIST.getUTCFullYear() - 1, nowIST.getUTCMonth(), nowIST.getUTCDate(), 23, 59, 59, 999) - IST_OFFSET_MS)
  } else {
    // monthly (default)
    fromDate = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS)
    prevFromDate = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth() - 1, 1) - IST_OFFSET_MS)
    prevToDate = new Date(fromDate.getTime() - 1)
  }

  // ── Fetch Data ──────────────────────────────────────────────────────
  const [
    { data: transactions, error: txError },
    { data: regretData },
    { data: budgets }
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, amount, type, date, category_id, category:categories(name, color)")
      .eq("user_id", user.id)
      .gte("date", prevFromDate.toISOString()),
    supabase
      .from("regret_feedback")
      .select("regretted, transaction_id")
      .eq("user_id", user.id),
    supabase
      .from("budgets")
      .select("category_id, limit_amount")
      .eq("user_id", user.id)
  ])

  if (txError) return { error: txError.message, data: null }

  // 🧪 TEMPORARY DEBUG LOGS
  if (process.env.NODE_ENV === "development") {
    console.log(`[ANALYTICS DEBUG] Range: ${range}`);
    console.log(`[ANALYTICS DEBUG] fromDate (UTC): ${fromDate.toISOString()}`);
    console.log(`[ANALYTICS DEBUG] toDate (UTC): ${toDate.toISOString()}`);
    console.log(`[ANALYTICS DEBUG] All Raw TX Found: ${transactions?.length || 0}`);
  }

  // ── Processing ──────────────────────────────────────────────────────
  const currentPeriodTx = (transactions ?? []).filter((t: any) => new Date(t.date) >= fromDate)
  const previousPeriodTx = (transactions ?? []).filter((t: any) => {
    const d = new Date(t.date)
    return d >= prevFromDate && d <= prevToDate
  })

  if (process.env.NODE_ENV === "development") {
    console.log(`[ANALYTICS DEBUG] Current Month TX: ${currentPeriodTx.length}`);
  }

  // Basic Stats
  const currentExpenses = currentPeriodTx.filter((t: any) => t.type === 'expense')
  const prevExpenses = previousPeriodTx.filter((t: any) => t.type === 'expense')

  const totalSpent = currentExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  
  if (process.env.NODE_ENV === "development") {
    console.log(`[ANALYTICS DEBUG] Total Spent Computed: ₹${totalSpent}`);
    console.log(`[ANALYTICS DEBUG] Current TX IDs: ${currentPeriodTx.map((t: any) => t.id).join(', ')}`);
  }

  const prevTotalSpent = prevExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
  
  const pctChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0

  // Avg Daily Spend
  const daysInPeriod = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)))
  const avgDailySpend = totalSpent / daysInPeriod

  // Highest & Lowest Day (only if multiple days)
  const dailyMap: Record<string, number> = {}
  currentExpenses.forEach((t: any) => {
    // Group using IST date string to avoid date shifting
    const tDateIST = new Date(new Date(t.date).getTime() + IST_OFFSET_MS)
    const dStr = tDateIST.toISOString().split('T')[0] // This will be the IST date part
    dailyMap[dStr] = (dailyMap[dStr] || 0) + Number(t.amount)
  })
  const dailyAmounts = Object.values(dailyMap)
  const highestDayAmt = dailyAmounts.length > 0 ? Math.max(...dailyAmounts) : 0
  const lowestDayAmt = dailyAmounts.length > 0 ? Math.min(...dailyAmounts) : 0

  // Categories
  const catStats: Record<string, { total: number, count: number, name: string, color: string }> = {}
  currentExpenses.forEach((t: any) => {
    const cat = t.category as any
    const name = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || "Other"
    const color = (Array.isArray(cat) ? cat[0]?.color : cat?.color) || "#64748b"
    const id = t.category_id

    if (!catStats[id]) catStats[id] = { total: 0, count: 0, name, color }
    catStats[id].total += Number(t.amount)
    catStats[id].count += 1
  })

  const sortedByTotal = Object.values(catStats).sort((a, b) => b.total - a.total)
  const sortedByCount = Object.values(catStats).sort((a, b) => b.count - a.count)

  const mostExpensiveCategory = sortedByTotal[0]?.name || "None"
  const mostFrequentCategory = sortedByCount[0]?.name || "None"

  // Pie chart data
  const categoryData = sortedByTotal.map(c => ({ name: c.name, value: c.total, color: c.color }))

  // Trend Data for Line Chart
  // If monthly, show last 6 months (as before) or current month daily trend?
  // Let's do daily trend for current period to make it more "detailed" as asked
  const trendData: { name: string, total: number }[] = []
  if (range === 'daily') {
    trendData.push({ name: fromDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), total: totalSpent })
  } else if (range === 'weekly') {
    for (let i = 0; i < 7; i++) {
        const d = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000)
        // Group using IST date string to avoid date shifting
        const dIST = new Date(d.getTime() + IST_OFFSET_MS)
        const dStr = dIST.toISOString().split('T')[0]
        trendData.push({
            name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
            total: dailyMap[dStr] || 0
        })
    }
  } else if (range === 'yearly') {
    const monthlyMap: Record<string, number> = {}
    currentExpenses.forEach((t: any) => {
      // Use IST date to match other charts
      const tDateIST = new Date(new Date(t.date).getTime() + IST_OFFSET_MS)
      const mStr = format(tDateIST, "MMM")
      monthlyMap[mStr] = (monthlyMap[mStr] || 0) + Number(t.amount)
    })
    
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    allMonths.forEach(m => {
        trendData.push({
            name: m,
            total: monthlyMap[m] || 0
        })
    })
  } else {
    // monthly or custom (Date 1 to end of period)
    const tempDate = new Date(fromDate.getTime() + IST_OFFSET_MS) // Start at early morning IST
    const endBoundary = new Date(toDate.getTime() + IST_OFFSET_MS)
    
    while (tempDate <= endBoundary) {
      const dStr = tempDate.toISOString().split('T')[0]
      trendData.push({
        name: tempDate.getUTCDate().toString(),
        total: dailyMap[dStr] || 0
      })
      tempDate.setUTCDate(tempDate.getUTCDate() + 1)
      
      // Safety cap to avoid infinite loops on long ranges
      if (trendData.length > 93) break; 
    }
  }

  // ── Smart Insights & Suggestions ────────────────────────────────────
  const insights: string[] = []
  const suggestions: string[] = []

  // Weekend vs Weekday
  let weekendSpend = 0
  let weekdaySpend = 0
  currentExpenses.forEach((t: any) => {
    const day = new Date(t.date).getDay()
    if (day === 0 || day === 6) weekendSpend += Number(t.amount)
    else weekdaySpend += Number(t.amount)
  })
  
  if (weekendSpend > weekdaySpend * 1.5 && weekendSpend > 0) {
    const p = Math.round(((weekendSpend - weekdaySpend) / (weekdaySpend || 1)) * 100)
    insights.push(`You spend ${p}% more on weekends. Consider planning low-cost activities.`)
    suggestions.push("Limit weekend spending to save ₹500/month.")
  }

  // Category Spikes
  for (const cat of sortedByTotal) {
    const prevCatAmt = prevExpenses
      .filter((t: any) => {
        const tCat = t.category as any
        const tCatName = (Array.isArray(tCat) ? tCat[0]?.name : tCat?.name) || "Other"
        return tCatName === cat.name
      })
      .reduce((s: number, t: any) => s + Number(t.amount), 0)
    
    if (prevCatAmt > 0 && cat.total > prevCatAmt * 1.2) {
      const p = Math.round(((cat.total - prevCatAmt) / prevCatAmt) * 100)
      insights.push(`${cat.name} spending increased by ${p}% vs last period.`)
    }
  }

  // Saving suggestion
  if (sortedByTotal.length >= 2) {
    const potentialSavings = Math.round((sortedByTotal[0].total + sortedByTotal[1].total) * 0.1)
    suggestions.push(`Cut top 2 categories by 10% to save ₹${potentialSavings}.`)
  }

  // ── Regret Analysis ─────────────────────────────────────────────────
  const regretMap = new Set((regretData ?? []).filter((r: any) => r.regretted).map((r: any) => r.transaction_id))
  let totalRegretAmt = 0
  const catRegret: Record<string, number> = {}

  currentExpenses.forEach((t: any) => {
    if (regretMap.has((t as any).id)) {
      totalRegretAmt += Number(t.amount)
      const cat = t.category as any
      const name = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || "Other"
      catRegret[name] = (catRegret[name] || 0) + Number(t.amount)
    }
  })

  const wasteCategories = Object.entries(catRegret)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([name]) => name)

  if (totalRegretAmt > 0) {
    const p = Math.round((totalRegretAmt / totalSpent) * 100)
    insights.push(`Approx ${p}% of your spending is on items you later regretted.`)
    if (wasteCategories.length > 0) {
      insights.push(`Waste-heavy categories: ${wasteCategories.join(', ')}.`)
    }
  }

  // ── Budget vs Actual ────────────────────────────────────────────────
  const budgetVsActual: { category: string, budget: number, spent: number, over: boolean }[] = []
  const budgetMap: Record<string, number> = {}
  budgets?.forEach(b => { budgetMap[b.category_id] = Number(b.limit_amount) })

  for (const [catId, stat] of Object.entries(catStats)) {
    const limit = budgetMap[catId]
    if (limit) {
      budgetVsActual.push({
        category: stat.name,
        budget: limit,
        spent: stat.total,
        over: stat.total > limit
      })
      if (stat.total > limit) {
        insights.push(`You are overspending in ${stat.name}.`)
      }
    }
  }

  // ── Financial Health Score ───────────────────────────────────────────
  // Simple algorithm: Savings Rate (Income vs Expense) + Budget Adherence + Regret Factor
  const totalIncome = currentPeriodTx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0
  const budgetAdherence = budgetVsActual.length > 0 
    ? (budgetVsActual.filter((b: any) => !b.over).length / budgetVsActual.length) * 100
    : 100
  const regretFactor = totalSpent > 0 ? (1 - totalRegretAmt / totalSpent) * 100 : 100
  
  const healthScore = Math.round((Math.max(0, savingsRate) * 0.4) + (budgetAdherence * 0.4) + (regretFactor * 0.2))

  return {
    data: {
      totalSpent,
      avgDailySpend,
      highestDayAmt,
      lowestDayAmt,
      mostExpensiveCategory,
      mostFrequentCategory,
      pctChange,
      categoryData,
      trendData,
      insights,
      suggestions,
      healthScore,
      budgetVsActual,
      totalRegretAmt
    },
    error: null
  }
}
