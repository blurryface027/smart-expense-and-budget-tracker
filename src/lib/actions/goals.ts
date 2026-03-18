"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { goalSchema, GoalFormValues } from "@/lib/schemas/goal.schema"

export async function addGoal(data: GoalFormValues) {
  const supabase = await createClient()

  const parsed = goalSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Invalid form data" }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: parsed.data.title,
    target_amount: parsed.data.targetAmount,
    deadline: parsed.data.deadline ? parsed.data.deadline.toISOString() : null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/goals")
  return { success: true }
}

export async function getGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const [
    { data: goals, error: goalsError },
    { data: transactions, error: txError }
  ] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, type, category:categories(name)")
      .eq("user_id", user.id)
      .eq("type", "expense")
  ])

  if (goalsError) return { error: goalsError.message, data: null }

  // ── Calculate Top Spending Categories for Suggestions ────────────────
  const catMap: Record<string, number> = {}
  if (transactions) {
    transactions.forEach(t => {
      const cat = t.category as any
      const name = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || "Other"
      catMap[name] = (catMap[name] || 0) + Number(t.amount)
    })
  }
  const topCategories = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([name, total]) => ({ name, total }))

  // ── Process Each Goal with Smart Insights ─────────────────────────────
  const now = new Date()
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS)

  const processedGoals = (goals ?? []).map(goal => {
    const target = Number(goal.target_amount)
    const current = Number(goal.current_amount)
    const remaining = target - current
    const createdDate = new Date(goal.created_at)
    const deadline = goal.deadline ? new Date(goal.deadline) : null

    // -- Time Calculations --
    let daysRemaining = 0
    let monthsRemaining = 0
    if (deadline && deadline > nowIST) {
      const diffMs = deadline.getTime() - nowIST.getTime()
      daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30.44))
    }

    // -- Required Savings --
    const requiredDaily = daysRemaining > 0 ? remaining / daysRemaining : null
    const requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : null

    // -- Pace Calculation --
    // Progress so far vs Time elapsed so far
    const totalDuration = deadline ? (deadline.getTime() - createdDate.getTime()) : null
    const elapsed = nowIST.getTime() - createdDate.getTime()
    
    let pace: "ahead" | "behind" | "on-track" = "on-track"
    let behindAmount = 0
    
    if (totalDuration && totalDuration > 0) {
      const expectedProgress = (elapsed / totalDuration) * target
      if (current < expectedProgress * 0.9) {
        pace = "behind"
        behindAmount = expectedProgress - current
      } else if (current > expectedProgress * 1.1) {
        pace = "ahead"
      }
    }

    // -- Health Score --
    // Based on pace and remaining time
    let health: "poor" | "moderate" | "good" | "on-track" = "on-track"
    if (pace === "behind") {
       health = remaining > (target * 0.5) && daysRemaining < 30 ? "poor" : "moderate"
    } else if (pace === "ahead") {
       health = "good"
    }

    // -- Intelligence & Suggestions --
    const suggestions: string[] = []
    if (requiredDaily && requiredDaily > 0) {
      if (pace === "behind") {
        suggestions.push(`Save ₹${Math.round(requiredDaily)}/day to stay on track`)
      } else {
        suggestions.push(`Save ₹${Math.round(requiredDaily)}/day to reach your goal on time`)
      }
    }
    
    // Auto Recommendation from top categories
    if (topCategories.length > 0 && remaining > 0) {
      const topCat = topCategories[0]
      const suggestedCut = Math.min(topCat.total * 0.1, remaining)
      if (suggestedCut > 100) {
        suggestions.push(`Reduce ${topCat.name} spending by ₹${Math.round(suggestedCut)}/mo to fund this goal`)
      }
    }

    // Micro-saving tip
    const tips = [
      "Save spare change from daily budget",
      "Use weekend savings for this goal",
      "Skip 1 luxury meal = ₹500 saved",
      "Skip a subscription to save and reach goal faster"
    ]
    const randomTip = tips[Math.floor(Math.random() * tips.length)]

    // Risk detection
    let riskMessage = ""
    if (pace === "behind" && deadline) {
       riskMessage = "At current pace, you might miss this goal."
    }

    return {
      ...goal,
      smartData: {
        remaining,
        daysRemaining,
        monthsRemaining,
        requiredDaily,
        requiredMonthly,
        pace,
        behindAmount,
        health,
        suggestions,
        randomTip,
        riskMessage
      }
    }
  })

  return { data: processedGoals, error: null }
}
