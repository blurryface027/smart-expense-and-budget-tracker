"use server"

import { createClient } from "@/lib/supabase/server"

export async function getAnalyticsData() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated", data: null }
  }

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, type, date, category:categories(name, color)")
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message, data: null }
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Prepare category breakdown data (for current month expenses)
  const categoryMap: Record<string, { name: string, value: number, color: string }> = {}

  transactions.forEach((t) => {
    const tDate = new Date(t.date)
    const tMonth = tDate.getMonth()
    const tYear = tDate.getFullYear()

    if (tMonth === currentMonth && tYear === currentYear && t.type === 'expense') {
      const cat = t.category as any;
      const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name || "Uncategorized"
      const catColor = Array.isArray(cat) ? cat[0]?.color : cat?.color || "#64748b"

      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, value: 0, color: catColor }
      }
      categoryMap[catName].value += Number(t.amount)
    }
  })

  // Format map into array
  const categoryData = Object.values(categoryMap).sort((a, b) => b.value - a.value)

  return {
    data: {
      categoryData
    },
    error: null
  }
}
