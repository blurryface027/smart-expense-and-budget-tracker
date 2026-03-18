import { Sidebar } from "./sidebar"
import { BottomNav } from "./bottom-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { WalletCards, LogOut } from "lucide-react"
import { signout } from "@/app/(auth)/auth-actions"
import { Button } from "@/components/ui/button"
import { QuickAddFAB } from "@/components/quick-add/quick-add-fab"

interface AppLayoutProps {
  children: React.ReactNode
  userName: string
}

export function AppLayout({ children, userName }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      <Sidebar userName={userName} />
      <div className="flex flex-col flex-1 pb-16 md:pb-0 min-w-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-muted/20 px-3 md:hidden shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <WalletCards className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm truncate">Smart Expense &amp; Budget Tracker</span>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <form action={signout}>
              <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 flex flex-col gap-4 p-4 lg:gap-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
      <BottomNav />
      <QuickAddFAB />
    </div>
  )
}
