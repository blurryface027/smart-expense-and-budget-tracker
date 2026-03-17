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
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Date range: 2 months of data
  const twoMonthsAgo = new Date(currentYear, currentMonth - 1, 1).toISOString()

  const [{ data: transactions }, { data: budgets }] = await Promise.all([
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
  ])

  if (!transactions || transactions.length === 0) {
    return { insights: [], hasEnoughData: false }
  }

  // ── Group expenses by category for current & previous month ─────────────
  const currentStart = new Date(currentYear, currentMonth, 1)
  const prevStart    = new Date(currentYear, currentMonth - 1, 1)
  const prevEnd      = new Date(currentYear, currentMonth, 0)  // last day of prev month

  type CatEntry = { name: string; current: number; previous: number }
  const catMap: Record<string, CatEntry> = {}

  for (const t of transactions) {
    const tDate = new Date(t.date)
    const catId  = t.category_id
    const cat    = t.category as any
    const name   = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || "Other"
    const amount = Number(t.amount)

    if (!catMap[catId]) catMap[catId] = { name, current: 0, previous: 0 }

    if (tDate >= currentStart) {
      catMap[catId].current += amount
    } else if (tDate >= prevStart && tDate <= prevEnd) {
      catMap[catId].previous += amount
    }
  }

  // ── How many days into the current month are we? (for projection) ───────
  const daysInMonth   = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysPassed    = now.getDate()
  const projFactor    = daysInMonth / Math.max(daysPassed, 1)

  // ── Build budget map ─────────────────────────────────────────────────────
  const budgetMap: Record<string, number> = {}
  for (const b of budgets ?? []) {
    budgetMap[b.category_id] = Number(b.limit_amount)
  }

  // ── Generate raw insights ────────────────────────────────────────────────
  const raw: (Insight & { score: number })[] = []

  for (const [catId, entry] of Object.entries(catMap)) {
    const { name, current, previous } = entry
    const budget = budgetMap[catId]

    // 1. Month-over-month increase ≥ 20%
    if (previous > 0) {
      const pctChange = ((current - previous) / previous) * 100

      if (pctChange >= 50) {
        raw.push({
          id: `mom-spike-${catId}`,
          severity: "danger",
          score: 90 + pctChange / 100,
          title: `${name} spending spiked`,
          message: `You've spent ${pctChange.toFixed(0)}% more on ${name} this month (₹${current.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) vs last month (₹${previous.toLocaleString("en-IN", { minimumFractionDigits: 2 })}).`,
          suggestion: getSuggestion(name),
        })
      } else if (pctChange >= 20) {
        raw.push({
          id: `mom-increase-${catId}`,
          severity: "warning",
          score: 60 + pctChange / 10,
          title: `Higher ${name} spending`,
          message: `You've spent ${pctChange.toFixed(0)}% more on ${name} compared to last month.`,
          suggestion: getSuggestion(name),
        })
      }
    }

    // 2. Budget proximity checks (only if a budget is set)
    if (budget && budget > 0) {
      const usedPct = (current / budget) * 100

      if (current >= budget) {
        // Already exceeded
        raw.push({
          id: `budget-exceeded-${catId}`,
          severity: "danger",
          score: 100,
          title: `${name} budget exceeded`,
          message: `You've used ₹${current.toLocaleString("en-IN", { minimumFractionDigits: 2 })} of your ₹${budget.toLocaleString("en-IN", { minimumFractionDigits: 2 })} limit — further expenses are blocked.`,
        })
      } else if (usedPct >= 80) {
        // Close to limit
        const remaining = budget - current
        raw.push({
          id: `budget-near-${catId}`,
          severity: "warning",
          score: 80,
          title: `${name} budget almost full`,
          message: `You've used ${usedPct.toFixed(0)}% of your ${name} budget. Only ₹${remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })} remaining.`,
          suggestion: getSuggestion(name),
        })
      }

      // 3. Projection: at this spending rate, will you exceed by month-end?
      const projected = current * projFactor
      if (projected > budget && current < budget && daysPassed < daysInMonth) {
        raw.push({
          id: `budget-projected-${catId}`,
          severity: "warning",
          score: 70,
          title: `${name} may exceed budget`,
          message: `At your current rate you're projected to spend ₹${projected.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on ${name} this month, exceeding your ₹${budget.toLocaleString("en-IN", { minimumFractionDigits: 2 })} limit.`,
          suggestion: getSuggestion(name),
        })
      }
    } else {
      // No budget: only warn if very high month-over-month with no cap
      if (previous === 0 && current > 0 && daysPassed <= 7) {
        // Significant spend in first week with no last-month baseline — low priority, skip
      }
    }
  }

  // 4. Positive insight: if this month's total is less than last month's (well done!)
  const totalCurrent  = Object.values(catMap).reduce((s, e) => s + e.current,  0)
  const totalPrevious = Object.values(catMap).reduce((s, e) => s + e.previous, 0)
  if (totalPrevious > 0 && totalCurrent < totalPrevious * 0.9) {
    const saved = totalPrevious - totalCurrent
    raw.push({
      id: "overall-savings",
      severity: "success",
      score: 50,
      title: "Great spending control! 🎉",
      message: `You're spending ${((1 - totalCurrent / totalPrevious) * 100).toFixed(0)}% less than last month. You've saved approximately ₹${saved.toLocaleString("en-IN", { minimumFractionDigits: 2 })} so far.`,
    })
  }

  // Sort by score descending, take top 3
  const insights = raw
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ score: _score, ...rest }) => rest)

  return {
    insights,
    hasEnoughData: transactions.length >= 2,
  }
}
