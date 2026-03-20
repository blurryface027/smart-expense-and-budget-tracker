"use server"

import { createClient } from "@/lib/supabase/server"

export type InsightSeverity = "info" | "warning" | "danger" | "success"

export interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  message: string
  suggestion?: string
}

// Category-specific suggestions
const SUGGESTIONS: Record<string, string> = {
  food:          "Try cooking at home more often or set a weekly dining-out limit.",
  restaurant:    "Try cooking at home more often or set a weekly dining-out limit.",
  groceries:     "Plan meals ahead and buy in bulk to cut grocery costs.",
  shopping:      "Avoid impulse purchases — wait 24 hours before buying non-essentials.",
  entertainment: "Look for free or low-cost entertainment options this month.",
  travel:        "Plan trips in advance and compare prices to save on travel costs.",
  transport:     "Consider carpooling or public transport to reduce travel expenses.",
  health:        "Preventive care is cheaper than cure — keep up with routine check-ups.",
  utilities:     "Unplug idle devices and reduce AC/heating usage to lower bills.",
  education:     "Look for free online resources or library access to reduce learning costs.",
}

function getSuggestion(categoryName: string): string | undefined {
  const key = categoryName.toLowerCase()
  for (const [k, v] of Object.entries(SUGGESTIONS)) {
    if (key.includes(k)) return v
  }
  return undefined
}

export async function getSpendingInsights(): Promise<{
  insights: Insight[]
  hasEnoughData: boolean
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { insights: [], hasEnoughData: false }

  const now = new Date()
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
  const currentYear = nowIST.getUTCFullYear()
  const currentMonth = nowIST.getUTCMonth()

  const prevMonthYear  = currentMonth === 0 ? currentYear - 1 : currentYear
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1
  const twoMonthsAgo = new Date(Date.UTC(prevMonthYear, prevMonthIndex, 1) - IST_OFFSET_MS).toISOString()

  // 1. Fetch Transactions, Budgets, and Goals
  const [{ data: transactions }, { data: budgets }, { data: goals }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, date, category_id, category:categories(name)")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", twoMonthsAgo),
    supabase
      .from("budgets")
      .select("category_id, limit_amount")
      .eq("user_id", user.id),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .gt("target_amount", 0)
  ])

  const raw: (Insight & { score: number })[] = []
  
  // ── 2. Process Data for Insights ──────────────────────────────────────────
  const currentStart = new Date(Date.UTC(currentYear, currentMonth, 1) - IST_OFFSET_MS)
  const prevStart    = new Date(Date.UTC(prevMonthYear, prevMonthIndex, 1) - IST_OFFSET_MS)
  const prevEnd      = new Date(Date.UTC(currentYear, currentMonth, 1) - IST_OFFSET_MS - 1)

  type CatEntry = { name: string; current: number; previous: number }
  const catMap: Record<string, CatEntry> = {}
  let totalCurrent = 0
  let totalPrevious = 0

  if (transactions) {
    for (const t of transactions) {
      const tDate = new Date(t.date)
      const catId  = t.category_id
      const cat    = t.category as any
      const name   = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || "Other"
      const amount = Number(t.amount)

      if (!catMap[catId]) catMap[catId] = { name, current: 0, previous: 0 }

      if (tDate >= currentStart) {
        catMap[catId].current += amount
        totalCurrent += amount
      } else if (tDate >= prevStart && tDate <= prevEnd) {
        catMap[catId].previous += amount
        totalPrevious += amount
      }
    }
  }

  // ── 3. Goal-Based Insights (Highest Priority) ───────────────────────────
  if (goals && goals.length > 0) {
    // Sort goals by progress and deadline
    const activeGoal = goals
      .filter(g => Number(g.current_amount) < Number(g.target_amount))
      .sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity
        return aDeadline - bDeadline
      })[0]

    if (activeGoal) {
      const remaining = Number(activeGoal.target_amount) - Number(activeGoal.current_amount)
      
      // If we have some spending data, suggest categories to cut to reach goal faster
      const topSpendingCat = Object.values(catMap).sort((a, b) => b.current - a.current)[0]
      if (topSpendingCat && topSpendingCat.current > 1000) {
        const tenPercent = topSpendingCat.current * 0.1
        const daysEarlier = Math.floor(tenPercent / (remaining / 30)) // Simplified estimation
        
        raw.push({
          id: `goal-boost-${activeGoal.id}`,
          severity: "success",
          score: 1000,
          title: `Boost your ${activeGoal.title} goal`,
          message: `If you reduce ₹${Math.round(tenPercent).toLocaleString()} from ${topSpendingCat.name} this month, you'll reach your goal significantly faster.`,
          suggestion: "Consistent small cuts are more effective than big one-time savings."
        })
      } else {
        raw.push({
          id: `goal-track-${activeGoal.id}`,
          severity: "info",
          score: 950,
          title: `Progress on ${activeGoal.title}`,
          message: `You're working towards ₹${activeGoal.target_amount.toLocaleString()}. Keep tracking every expense to stay on top of your savings.`,
          suggestion: "Set a daily spending limit to ensure money is left for your goal."
        })
      }
    }
  }

  // ── 4. Spending Pattern Insights (Existing Logic) ───────────────────────
  const daysInMonth   = new Date(Date.UTC(currentYear, currentMonth + 1, 1) - 1).getUTCDate()
  const daysPassed    = nowIST.getUTCDate()
  const projFactor    = daysInMonth / Math.max(daysPassed, 1)

  const budgetMap: Record<string, number> = {}
  for (const b of budgets ?? []) {
    budgetMap[b.category_id] = Number(b.limit_amount)
  }

  for (const [catId, entry] of Object.entries(catMap)) {
    const { name, current, previous } = entry
    const budget = budgetMap[catId]

    if (previous > 0) {
      const pctChange = ((current - previous) / previous) * 100
      if (pctChange >= 20) {
        raw.push({
          id: `mom-increase-${catId}`,
          severity: "warning",
          score: 800 + pctChange,
          title: `${name} spending is up`,
          message: `You've spent ₹${current.toLocaleString()} on ${name} so far. That's ${pctChange.toFixed(0)}% more than this time last month.`,
          suggestion: getSuggestion(name),
        })
      }
    }

    if (budget && budget > 0) {
      const usedPct = (current / budget) * 100
      if (current >= budget) {
        raw.push({
          id: `budget-exceeded-${catId}`,
          severity: "danger",
          score: 900,
          title: `${name} budget exceeded`,
          message: `You've passed your ₹${budget.toLocaleString()} limit for ${name}. Try to pause non-essential spending here.`,
        })
      } else if (usedPct >= 80) {
        raw.push({
          id: `budget-near-${catId}`,
          severity: "warning",
          score: 750,
          title: `${name} budget almost full`,
          message: `You've used ${usedPct.toFixed(0)}% of your ₹${budget.toLocaleString()} budget for ${name}.`,
          suggestion: getSuggestion(name),
        })
      }
    }
  }

  // Savings win
  if (totalPrevious > 0 && totalCurrent < totalPrevious * 0.9 && totalCurrent > 0) {
    const saved = totalPrevious - totalCurrent
    raw.push({
      id: "overall-savings",
      severity: "success",
      score: 850,
      title: "Excellent budget control! 🎉",
      message: `You're spending significantly less than last month. You've saved about ₹${saved.toLocaleString()} so far!`,
    })
  }

  // ── 5. Category Optimization (Fallback Case) ───────────────────────────
  if (raw.length < 2) {
    const topCat = Object.values(catMap).sort((a, b) => b.current - a.current)[0]
    if (topCat && topCat.current > 500) {
      raw.push({
        id: `optimize-${topCat.name}`,
        severity: "info",
        score: 500,
        title: `Optimize ${topCat.name} spend`,
        message: `${topCat.name} is your highest spending category this month at ₹${topCat.current.toLocaleString()}.`,
        suggestion: `A simple 10% reduction here would save you ₹${Math.round(topCat.current * 0.1).toLocaleString()} for other goals.`
      })
    }
  }

  // ── 6. Fallback Smart Tips (Guarantees Content) ──────────────────────────
  const fallbacks: Insight[] = [
    {
      id: "fb-1",
      severity: "info",
      title: "Set a daily limit",
      message: "Try setting a daily spending limit to stay on track without checking your budget constantly.",
      suggestion: "Go to your dashboard card to see your current recommended limit."
    },
    {
      id: "fb-2",
      severity: "success",
      title: "Track small expenses",
      message: "Reducing small daily expenses like coffee or snacks can significantly improve your monthly savings.",
      suggestion: "Small wins add up to big goals!"
    },
    {
      id: "fb-3",
      severity: "info",
      title: "Unlock smarter insights",
      message: "The more you track, the smarter these insights get. Keep logging your transactions and reflections.",
      suggestion: "Try using the Quick Add button for faster tracking."
    }
  ]

  let finalInsights = raw
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score: _score, ...rest }) => rest)

  // Fill up with fallbacks if needed
  let i = 0
  while (finalInsights.length < 3 && i < fallbacks.length) {
    if (!finalInsights.find(fi => fi.title === fallbacks[i].title)) {
      finalInsights.push(fallbacks[i])
    }
    i++
  }

  return {
    insights: finalInsights,
    hasEnoughData: true, // Always true now to prevent empty state UI
  }
}
