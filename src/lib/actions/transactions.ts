"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { transactionSchema, TransactionFormValues } from "@/lib/schemas/transaction.schema"

export async function addTransaction(data: TransactionFormValues) {
  const supabase = await createClient()

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
  revalidatePath("/transactions")
  return { success: true }
}

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, color, type")
    .order("name")

  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export interface TransactionFilter {
  search?: string
  categoryId?: string
  categoryIds?: string[]
  type?: 'income' | 'expense' | 'all'
  startDate?: string
  endDate?: string
}

export async function getTransactions(filters: TransactionFilter = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated", data: null }

  let query = supabase
    .from("transactions")
    .select(`
      id,
      amount,
      type,
      date,
      notes,
      category_id,
      category:categories(id, name, icon, color)
    `)
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (filters.categoryId && filters.categoryId !== 'all') {
    query = query.eq("category_id", filters.categoryId)
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in("category_id", filters.categoryIds)
  }
  if (filters.type && filters.type !== 'all') {
    query = query.eq("type", filters.type)
  }
  if (filters.startDate) {
    query = query.gte("date", filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte("date", filters.endDate)
  }

  let { data: transactions, error } = await query

  if (error) return { error: error.message, data: null }

  // ── Client-side search (for notes and category name) ───────────────────
  if (filters.search) {
    const s = filters.search.toLowerCase()
    transactions = transactions?.filter(t => {
      const cat = t.category as any
      const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name || "").toLowerCase()
      const notes = (t.notes || "").toLowerCase()
      const amt = t.amount.toString()
      return catName.includes(s) || notes.includes(s) || amt.includes(s)
    }) ?? []
  }

  // ── Logic-based stats and insights generation ──────────────────────────
  if (!transactions) return { data: [], error: null }

  // 1. Fetch regret feedback for these transactions
  const { data: regrets } = await supabase
    .from("regret_feedback")
    .select("transaction_id, regretted")
    .eq("user_id", user.id)
    .in("transaction_id", transactions.map(t => t.id))

  const regretMap = new Map((regrets ?? []).map(r => [r.transaction_id, r.regretted]))

  // 2. Global statistics for flags
  const catSums: Record<string, { total: number, count: number }> = {}
  transactions.forEach(t => {
    const id = t.category_id
    if (!catSums[id]) catSums[id] = { total: 0, count: 0 }
    catSums[id].total += Number(t.amount)
    catSums[id].count += 1
  })

  // 3. Duplicate/Recurring detection
  const patternMap = new Map<string, number>()
  transactions.forEach(t => {
    const key = `${t.category_id}-${t.amount}-${t.type}`
    patternMap.set(key, (patternMap.get(key) || 0) + 1)
  })

  // 4. Time-based insights
  const hourlyCount = new Array(24).fill(0)
  const dayNameCount: Record<string, number> = {}
  
  const stats = {
    totalCount: transactions.length,
    totalSpent: 0,
    totalIncome: 0,
    netBalance: 0,
    peakDay: "",
    mostFrequentCategory: "",
    timeInsight: ""
  }

  const enhancedTransactions = transactions.map(t => {
    const amt = Number(t.amount)
    if (t.type === 'expense') stats.totalSpent += amt
    else stats.totalIncome += amt

    const dateObj = new Date(t.date)
    const hour = parseInt(dateObj.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }))
    const dayName = dateObj.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" })
    hourlyCount[hour]++
    dayNameCount[dayName] = (dayNameCount[dayName] || 0) + 1

    const flags: string[] = []
    
    // Regret flag
    if (regretMap.get(t.id)) flags.push("Regretted purchase")

    // Average spend flag
    const catStat = catSums[t.category_id]
    const avgForCat = catStat.total / catStat.count
    if (amt > avgForCat * 1.5 && t.type === 'expense') flags.push("Above average spend")

    // Frequent category flag
    const maxFreq = Math.max(...Object.values(catSums).map(c => c.count))
    if (catStat.count === maxFreq && maxFreq > 3) flags.push("Frequent category")

    // Duplicate detection
    const key = `${t.category_id}-${t.amount}-${t.type}`
    if ((patternMap.get(key) || 0) > 2) flags.push("Recurring pattern")

    // Category correction suggestion
    const cat = t.category as any
    const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name || "").toLowerCase()
    const notes = (t.notes || "").toLowerCase()
    if (notes.includes("uber") || notes.includes("ola") || notes.includes("cab") || notes.includes("auto")) {
      if (!catName.includes("transport") && !catName.includes("travel")) {
        flags.push("Suggestion: Transport category?")
      }
    } else if (notes.includes("swiggy") || notes.includes("zomato") || notes.includes("food") || notes.includes("restaurant")) {
       if (!catName.includes("food") && !catName.includes("dining")) {
        flags.push("Suggestion: Food category?")
      }
    }

    return { ...t, flags }
  })

  stats.netBalance = stats.totalIncome - stats.totalSpent
  
  // Find peak day
  const maxDayEntries = Math.max(0, ...Object.values(dayNameCount))
  stats.peakDay = Object.keys(dayNameCount).find(k => dayNameCount[k] === maxDayEntries) || "None"

  // Time insight
  const nightSpending = hourlyCount.slice(22).reduce((a, b) => a + b, 0) + hourlyCount.slice(0, 5).reduce((a, b) => a + b, 0)
  if (nightSpending > stats.totalCount * 0.4) {
    stats.timeInsight = "Most spending happens at night"
  } else {
    stats.timeInsight = "Spending is spread throughout the day"
  }

  return {
    data: {
      transactions: enhancedTransactions,
      stats
    },
    error: null
  }
}
