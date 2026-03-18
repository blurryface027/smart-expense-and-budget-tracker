"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter, useSearchParams } from "next/navigation"

export function RangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = searchParams.get("range") || "monthly"

  return (
    <Tabs 
      value={currentRange} 
      onValueChange={(val) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("range", val)
        router.push(`/analytics?${params.toString()}`)
      }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 max-w-sm">
        <TabsTrigger value="daily">Daily</TabsTrigger>
        <TabsTrigger value="weekly">Weekly</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
