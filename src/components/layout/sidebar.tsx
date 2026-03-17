"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navigationLinks } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { WalletCards, LogOut } from "lucide-react"
import { signout } from "@/app/(auth)/auth-actions"
import { Button } from "../ui/button"

/** Derive 1-2 uppercase initials from a display name */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface SidebarProps {
  userName: string
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()
  const initials = getInitials(userName)

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

        {/* User info + sign out */}
        <div className="mt-auto p-4 flex items-center justify-between border-t gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Avatar with dynamic initials */}
            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-2 ring-primary/20">
              <span className="font-bold text-xs tracking-wide">{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden hidden lg:block">
              <p className="text-sm font-semibold truncate leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">Signed in</p>
            </div>
          </div>
          <form action={signout}>
            <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
