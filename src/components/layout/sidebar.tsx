"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navigationLinks } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { WalletCards, LogOut } from "lucide-react"
import { signout } from "@/app/(auth)/auth-actions"
import { Button } from "../ui/button"

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden border-r bg-muted/20 md:block w-64 lg:w-72 flex-shrink-0 h-screen sticky top-0">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <WalletCards className="h-5 w-5" />
            </div>
            <span className="text-sm leading-tight">Smart Expense<br />and Budget Tracker</span>
          </Link>
          <div className="ml-auto">
             <ModeToggle />
          </div>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
            {navigationLinks.map((link) => {
              const isActive = link.href === "/" 
                ? pathname === "/" 
                : pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                    isActive
                      ? "bg-muted text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="mt-auto p-4 flex items-center justify-between border-t gap-2">
           <div className="flex items-center gap-3 overflow-hidden">
             <div className="h-10 w-10 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center">
               <span className="font-semibold text-sm">ME</span>
             </div>
             <div className="flex-1 overflow-hidden hidden lg:block">
               <p className="text-sm font-medium truncate">My Account</p>
               <p className="text-xs text-muted-foreground truncate">Settings</p>
             </div>
           </div>
           <form action={signout}>
             <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
             </Button>
           </form>
        </div>
      </div>
    </div>
  )
}
