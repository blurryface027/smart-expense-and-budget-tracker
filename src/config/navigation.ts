import { PieChart, Wallet, ArrowLeftRight, Target, LayoutDashboard, Settings } from "lucide-react"

export const navigationLinks = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    name: "Budgets",
    href: "/budgets",
    icon: Wallet,
  },
  {
    name: "Goals",
    href: "/goals",
    icon: Target,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: PieChart,
  },
]
