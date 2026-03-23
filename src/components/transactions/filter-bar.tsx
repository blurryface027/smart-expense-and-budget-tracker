"use client"

import { useState, useCallback, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { Filter, X, Calendar as CalendarIcon, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface FilterBarProps {
  categories: Category[]
}

export function FilterBar({ categories }: FilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  // Current filter states from URL
  const currentType = searchParams.get("type") || "all"
  const currentCategoryIds = searchParams.getAll("categoryIds")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const datePreset = searchParams.get("datePreset") || "all"

  const createQueryString = useCallback(
    (params: Record<string, string | string[] | null>) => {
      const newParams = new URLSearchParams(searchParams.toString())
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "all" || (Array.isArray(value) && value.length === 0)) {
          newParams.delete(key)
        } else if (Array.isArray(value)) {
          newParams.delete(key) // clear existing
          value.forEach(v => v && newParams.append(key, v))
        } else {
          newParams.set(key, value)
        }
      })

      return newParams.toString()
    },
    [searchParams]
  )

  const updateFilters = (updates: Record<string, string | string[] | null>) => {
    startTransition(() => {
      const queryString = createQueryString(updates)
      router.push(`/transactions?${queryString}`, { scroll: false })
    })
  }

  const toggleCategory = (id: string) => {
    const newIds = currentCategoryIds.includes(id)
      ? currentCategoryIds.filter(v => v !== id)
      : [...currentCategoryIds, id]
    updateFilters({ categoryIds: newIds })
  }

  const setDatePreset = (preset: string) => {
    let start: Date | null = null
    let end: Date | null = null
    const today = new Date()

    if (preset === "today") {
      start = startOfDay(today)
      end = endOfDay(today)
    } else if (preset === "7days") {
      start = startOfDay(subDays(today, 7))
      end = endOfDay(today)
    } else if (preset === "month") {
      start = startOfMonth(today)
      end = endOfMonth(today)
    }

    updateFilters({
      datePreset: preset,
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
    })
  }

  const clearFilters = () => {
    router.push("/transactions", { scroll: false })
  }

  const activeFiltersCount = 
    (currentType !== "all" ? 1 : 0) +
    currentCategoryIds.length +
    (datePreset !== "all" ? 1 : 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger
             className={cn(
               "inline-flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-background px-2.5 text-sm font-medium transition-all hover:bg-muted h-9 gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
             )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <>
                <div className="mx-1 h-4 w-px bg-border" />
                <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                  {activeFiltersCount}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {activeFiltersCount > 2 ? (
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                      {activeFiltersCount} selected
                    </Badge>
                  ) : (
                    <>
                      {currentType !== "all" && <Badge variant="secondary" className="rounded-sm px-1 font-normal capitalize">{currentType}</Badge>}
                      {currentCategoryIds.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">{currentCategoryIds.length} categories</Badge>}
                    </>
                  )}
                </div>
              </>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4" align="end">
            <div className="space-y-4">
              {/* Type Filter */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction Type</p>
                <div className="flex flex-wrap gap-2">
                  {["all", "income", "expense"].map((type) => (
                    <Button
                      key={type}
                      variant={currentType === type ? "default" : "outline"}
                      size="sm"
                      className="h-8 flex-1 capitalize text-[11px]"
                      onClick={() => updateFilters({ type })}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date Range</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "7days", label: "Last 7 Days" },
                    { id: "month", label: "This Month" },
                  ].map((p) => (
                    <Button
                      key={p.id}
                      variant={datePreset === p.id ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 justify-start px-2 text-[11px]"
                      onClick={() => setDatePreset(p.id)}
                    >
                      {datePreset === p.id && <Check className="mr-2 h-3 w-3" />}
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
                <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1 text-card-foreground">
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between px-2 h-7 text-[11px]"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <span className="truncate">{cat.name}</span>
                      {currentCategoryIds.includes(cat.id) && <Check className="h-3 w-3" />}
                    </Button>
                  ))}
                  {categories.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No categories found</p>}
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="pt-2 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-[11px] h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={clearFilters}
                    >
                        Clear all filters
                    </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
             {datePreset !== "all" && (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 pl-1.5 pr-1 py-0 h-6 text-[10px] font-bold uppercase">
                   <CalendarIcon className="h-3 w-3" />
                   {datePreset === "7days" ? "Last 7 Days" : datePreset === "month" ? "This Month" : "Today"}
                   <button onClick={() => setDatePreset("all")} className="ml-1 rounded-full hover:bg-primary/20 p-0.5 pointer-events-auto">
                      <X className="h-2.5 w-2.5" />
                   </button>
                </Badge>
             )}
             {currentType !== "all" && (
                <Badge variant="outline" className="bg-sky-500/5 text-sky-600 border-sky-500/20 gap-1 pl-2 pr-1 py-0 h-6 text-[10px] font-bold uppercase">
                   {currentType}
                   <button onClick={() => updateFilters({ type: "all" })} className="ml-1 rounded-full hover:bg-sky-500/20 p-0.5">
                      <X className="h-2.5 w-2.5" />
                   </button>
                </Badge>
             )}
             {currentCategoryIds.map(id => {
                const cat = categories.find(c => c.id === id)
                if (!cat) return null
                return (
                  <Badge key={id} variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 gap-1 pl-2 pr-1 py-0 h-6 text-[10px] font-bold uppercase">
                    {cat.name}
                    <button onClick={() => toggleCategory(id)} className="ml-1 rounded-full hover:bg-amber-500/20 p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )
             })}
          </div>
      )}
    </div>
  )
}
