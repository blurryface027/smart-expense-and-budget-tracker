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

export async function updateGoal(id: string, data: GoalFormValues) {
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

  const { error } = await supabase
    .from("goals")
    .update({
      title: parsed.data.title,
      target_amount: parsed.data.targetAmount,
      deadline: parsed.data.deadline ? parsed.data.deadline.toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/goals")
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

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
  
  // Get daily limit for financial reality check
  const { getDailySpendingLimit } = await import("@/lib/actions/daily-limit")
  const { data: limitData } = await getDailySpendingLimit()
  const userDailyLimit = limitData?.dailyLimit || 0

  const processedGoals = (goals ?? []).map(goal => {
    const target = Number(goal.target_amount)
    const current = Number(goal.current_amount)
    const remaining = target - current
    const createdDate = new Date(goal.created_at)
    const deadline = goal.deadline ? new Date(goal.deadline) : null

    // -- Time Calculations --
    let daysRemaining = 0
    let monthsRemaining = 0
    if (deadline) {
      if (deadline > nowIST) {
        const diffMs = deadline.getTime() - nowIST.getTime()
        daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30.44))
      } else {
        // Past deadline
        daysRemaining = 0
        monthsRemaining = 0
      }
    }

    // -- Required Savings --
    let requiredDaily = 0
    let requiredMonthly = 0

    if (remaining > 0) {
      if (deadline && deadline <= nowIST) {
        // Already past or exactly on deadline but not reached
        requiredDaily = 0
        requiredMonthly = 0
      } else if (daysRemaining > 0) {
        requiredDaily = remaining / daysRemaining
        requiredMonthly = monthsRemaining > 0 ? remaining / monthsRemaining : 0
      }
    }

    // -- Pace Calculation (Time-Based) --
    let pace: "ahead" | "behind" | "on-track" = "on-track"
    let behindAmount = 0
    
    if (deadline) {
      const totalDurationMs = deadline.getTime() - createdDate.getTime()
      const totalDurationDays = Math.max(1, Math.ceil(totalDurationMs / (1000 * 60 * 60 * 24)))
      const elapsedMs = nowIST.getTime() - createdDate.getTime()
      const elapsedDays = Math.max(0, Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)))

      if (deadline <= nowIST) {
        // Goal finished or expired
        if (current < target) {
          pace = "behind"
          behindAmount = target - current
        } else {
          pace = "ahead"
          behindAmount = 0
        }
      } else {
        const expectedSavings = (target / totalDurationDays) * elapsedDays
        behindAmount = Math.max(0, expectedSavings - current)

        if (behindAmount > expectedSavings * 0.1) {
          pace = "behind"
        } else if (current > expectedSavings * 1.1) {
          pace = "ahead"
        } else {
          pace = "on-track"
        }
      }
      
      // Safe Debug Logging (Dev Only)
      if (process.env.NODE_ENV === "development") {
        console.log({
          goal: goal.title,
          target,
          actualSaved: current,
          remaining,
          daysRemaining,
          requiredDaily,
          requiredMonthly,
          behindAmount
        });
      }
    }

    // -- Financial Reality Check (Soft Logic) --
    let flagGoalAsAggressive = false
    if (requiredDaily > userDailyLimit && userDailyLimit > 0) {
      flagGoalAsAggressive = true
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
    if (requiredDaily > 0) {
      if (pace === "behind") {
        suggestions.push(`Save ₹${Math.round(requiredDaily)}/day to catch up`)
      } else {
        suggestions.push(`Save ₹${Math.round(requiredDaily)}/day to reach your goal on time`)
      }
    }
    
    if (flagGoalAsAggressive) {
      suggestions.push("This goal is aggressive compared to your daily limit.")
    }

    // Auto Recommendation from top categories
    if (topCategories.length > 0 && remaining > 0) {
      const topCat = topCategories[0]
      const suggestedCut = Math.min(topCat.total * 0.1, remaining)
      if (suggestedCut > 100) {
        suggestions.push(`Reducing ${topCat.name} spend can help hit this goal.`)
      }
    }

    // Micro-saving tip
    const tips = [
      "Save spare change from daily budget",
      "Use weekend savings for this goal",
      "Skip 1 luxury meal = ₹500 saved",
      "One fewer small purchase per week adds up!"
    ]
    const randomTip = tips[Math.floor(Math.random() * tips.length)]

    // Risk detection
    let riskMessage = ""
    if (pace === "behind" && deadline) {
       riskMessage = deadline < nowIST ? "This goal has passed its deadline." : "Might miss target based on current timeline."
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
        riskMessage,
        flagGoalAsAggressive
      }
    }
  })

  return { data: processedGoals, error: null }
}
