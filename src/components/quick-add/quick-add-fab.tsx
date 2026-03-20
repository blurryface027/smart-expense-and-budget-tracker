"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { Plus, X, Mic, MicOff, Zap, ChevronRight } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addTransaction } from "@/lib/actions/transactions"
import { getCategories } from "@/lib/actions/transactions"
import { getBudgetStatus } from "@/lib/actions/budgets"
import { toast } from "sonner"

// ── Keyword → category auto-detection ────────────────────────────────────────
const KEYWORD_MAP: Record<string, string[]> = {
  "Food & Dining": ["swiggy", "zomato", "food", "eat", "lunch", "dinner", "breakfast", "restaurant", "biryani", "pizza", "burger"],
  Transportation: ["uber", "ola", "cab", "taxi", "auto", "rickshaw", "bus", "metro", "train", "transport", "fuel", "petrol"],
  Shopping: ["amazon", "flipkart", "mall", "shop", "cloth", "myntra", "meesho", "ajio"],
  Entertainment: ["netflix", "prime", "hotstar", "movie", "cinema", "theatre", "concert", "game"],
  Groceries: ["grocery", "vegetable", "fruit", "milk", "dmart", "bigbasket", "reliance"],
  Utilities: ["electricity", "water", "gas", "broadband", "wifi", "internet", "phone", "recharge"],
  Health: ["doctor", "medicine", "hospital", "pharmacy", "health", "med"],
  Education: ["book", "course", "tuition", "school", "college", "udemy", "coursera"],
}

function detectCategory(text: string, categories: any[]): string {
  const lower = text.toLowerCase()
  for (const [catName, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((k) => lower.includes(k))) {
      const found = categories.find(
        (c) => c.name.toLowerCase().includes(catName.toLowerCase().split(" ")[0])
      )
      if (found) return found.id
    }
  }
  return ""
}

// ── Voice input parser ────────────────────────────────────────────────────────
function parseVoiceInput(text: string, categories: any[]): { amount: number | null; categoryId: string; notes: string } {
  // Patterns: "spent 300 on cab", "paid 200 for food", "200 food", "spent 500"
  const amountMatch = text.match(/(?:spent|paid|spend)?\s*(?:rs\.?|rupees?|₹)?\s*(\d+(?:\.\d{1,2})?)/i)
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null
  const categoryId = detectCategory(text, categories)
  return { amount, categoryId, notes: text }
}

// ── Common quick suggestions ──────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  { label: "₹200 → Food", amount: 200, catKey: "Food" },
  { label: "₹500 → Transport", amount: 500, catKey: "Transportation" },
  { label: "₹100 → Grocery", amount: 100, catKey: "Groceries" },
  { label: "₹300 → Shopping", amount: 300, catKey: "Shopping" },
]

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const pascal = name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")
  // @ts-expect-error
  const Icon = LucideIcons[pascal] || LucideIcons.HelpCircle
  return <Icon className={className} />
}

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [notes, setNotes] = useState("")
  const [voiceText, setVoiceText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [budgetMap, setBudgetMap] = useState<Record<string, any>>({})
  const recognitionRef = useRef<any>(null)
  const [, startTransition] = useTransition()

  // Fetch categories when FAB opens
  useEffect(() => {
    if (!open) return
    Promise.all([getCategories(), getBudgetStatus()]).then(([catRes, budgetRes]) => {
      if (catRes.data) setCategories(catRes.data.filter((c) => c.type === "expense"))
      if (budgetRes.data) setBudgetMap(budgetRes.data)
    })
    return () => stopListening()
  }, [open])

  // Web Speech API voice recognition
  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser")
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = "en-IN"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setVoiceText(transcript)
      const parsed = parseVoiceInput(transcript, categories)
      if (parsed.amount) setAmount(String(parsed.amount))
      if (parsed.categoryId) setCategoryId(parsed.categoryId)
      setNotes(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function applyQuickSuggestion(suggestion: typeof QUICK_SUGGESTIONS[0]) {
    setAmount(String(suggestion.amount))
    const cat = categories.find((c) => c.name.toLowerCase().includes(suggestion.catKey.toLowerCase()))
    if (cat) setCategoryId(cat.id)
    setNotes(`${suggestion.catKey} expense`)
  }

  function applyRecentPattern(cat: any) {
    setCategoryId(cat.id)
  }

  function reset() {
    setAmount("")
    setCategoryId("")
    setNotes("")
    setVoiceText("")
    setIsListening(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error("Please enter a valid amount"); return }
    if (!categoryId) { toast.error("Please select a category"); return }

    setLoading(true)
    const result = await addTransaction({
      amount: amt,
      type: "expense",
      categoryId,
      date: new Date(),
      notes: notes || undefined,
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      if (result.budgetWarning) {
        toast.warning("Expense added!", { 
          description: result.budgetWarning,
          duration: 6000
        })
      } else {
        toast.success("Expense added!", { description: `₹${amt.toLocaleString("en-IN")} recorded` })
      }
      reset()
      setOpen(false)
    }
  }

  const selectedCat = categories.find((c) => c.id === categoryId)
  const budgetInfo = categoryId ? budgetMap[categoryId] : null

  return (
    <>
      {/* ── Modal overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          onClick={() => { setOpen(false); reset() }}
        />
      )}

      {/* ── Compact bottom sheet / modal ──────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 left-4 right-4 z-50 w-auto md:left-auto md:right-4 md:w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Quick Add Expense</span>
            </div>
            <button
              onClick={() => { setOpen(false); reset() }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Quick suggestions */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Quick Suggestions</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => applyQuickSuggestion(s)}
                    className="text-xs rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 px-3 py-2 text-left transition-all font-medium"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Voice Input</p>
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${isListening
                    ? "border-rose-500 bg-rose-500/15 text-rose-500 animate-pulse"
                    : "border-border hover:border-primary/50 hover:bg-primary/10 text-muted-foreground"
                    }`}
                >
                  {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  {isListening ? "Listening..." : "Tap to speak"}
                </button>
              </div>
              {voiceText && (
                <p className="text-xs text-muted-foreground/80 italic truncate bg-muted/40 rounded-lg px-3 py-1.5">
                  "{voiceText}"
                </p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Amount */}
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Amount"
                  className="pl-7 h-9"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
                {categories.map((cat) => {
                  const bs = budgetMap[cat.id]
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id === categoryId ? "" : cat.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all text-xs ${
                        categoryId === cat.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground"
                      } ${bs?.isOver ? "opacity-50" : ""}`}
                      title={bs?.isOver ? "Budget limit reached" : cat.name}
                    >
                      <DynamicIcon name={cat.icon} className="h-4 w-4 shrink-0" />
                      <span className="truncate w-full leading-none">{cat.name.split(" ")[0]}</span>
                    </button>
                  )
                })}
              </div>

              {/* Notes */}
              <Input
                placeholder="Notes (optional)"
                className="h-9 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {/* Budget banner (compact) */}
              {budgetInfo && budgetInfo.isOver && (
                <p className="text-xs text-rose-500 bg-rose-500/10 rounded-lg px-3 py-1.5 border border-rose-500/30">
                  Budget limit reached for {selectedCat?.name}
                </p>
              )}
              {budgetInfo && budgetInfo.isNear && !budgetInfo.isOver && (
                <p className="text-xs text-amber-500 bg-amber-500/10 rounded-lg px-3 py-1.5 border border-amber-500/30">
                  ₹{budgetInfo.remaining.toLocaleString("en-IN")} remaining in {selectedCat?.name} budget
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-9"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Expense"}
                {!loading && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── FAB button ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        id="quick-add-fab"
        aria-label="Quick add expense"
        className={`fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 md:bottom-8 md:right-8 ${
          open ? "rotate-45 bg-muted-foreground" : ""
        }`}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </>
  )
}
