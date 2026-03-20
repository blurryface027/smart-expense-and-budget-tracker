"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { DateRange } from "react-day-picker"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function RangeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = searchParams.get("range") || "monthly"
  
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const start = searchParams.get("startDate")
    const end = searchParams.get("endDate")
    if (start && end) {
      try {
        return { from: parseISO(start), to: parseISO(end) }
      } catch (e) {
        return undefined
      }
    }
    return undefined
  })

  // Track previous category ID to prevent redundant form sets
  const prevDateRange = useRef<string>(searchParams.get("startDate") || "")

  // Update URL function
  const updateParams = (range: string, from?: Date, to?: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", range)
    if (from) {
      params.set("startDate", from.toISOString())
      prevDateRange.current = from.toISOString()
    } else {
      params.delete("startDate")
    }
    
    if (to) params.set("endDate", to.toISOString())
    else params.delete("endDate")
    
    router.push(`/analytics?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Tabs 
        value={currentRange} 
        onValueChange={(val) => {
          if (val !== 'custom') {
            updateParams(val)
          } else {
            const params = new URLSearchParams(searchParams.toString())
            params.set("range", "custom")
            router.push(`/analytics?${params.toString()}`)
          }
        }}
        className="w-full max-w-sm"
      >
        <TabsList className="flex w-full justify-start overflow-x-auto scrollbar-hide bg-muted/50 p-1 h-11 items-center whitespace-nowrap">
          <TabsTrigger value="daily" className="flex-shrink-0">Daily</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-shrink-0">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" className="flex-shrink-0">Monthly</TabsTrigger>
          <TabsTrigger value="yearly" className="flex-shrink-0">Yearly</TabsTrigger>
          <TabsTrigger value="custom" className="flex-shrink-0">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {currentRange === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger 
              className={cn(
                "group inline-flex shrink-0 items-center justify-start rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none w-[260px]",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, yyyy")} -{" "}
                      {format(date.to, "LLL dd, yyyy")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, yyyy")
                  )
                ) : (
                  "Select date range"
                )}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate)
                  if (newDate?.from && newDate?.to) {
                    updateParams('custom', newDate.from, newDate.to)
                  }
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  )
}
