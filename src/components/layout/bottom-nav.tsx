"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navigationLinks } from "@/config/navigation"
import { cn } from "@/lib/utils"

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="flex items-center justify-around px-1 py-1 safe-pb">
        {navigationLinks.slice(0, 5).map((link) => {
          const isActive = link.href === "/" 
            ? pathname === "/" 
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-2 flex-1 transition-colors rounded-xl",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className={cn("h-5 w-5", isActive && "scale-110 transition-transform")} />
              <span className="text-[9px] sm:text-[10px] font-medium leading-tight">{link.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
