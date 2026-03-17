import { AppLayout } from "@/components/layout/app-layout"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // Extract name from user_metadata (set during signup)
  // Falls back to the part before @ in the email address
  const userName: string =
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there"

  return <AppLayout userName={userName}>{children}</AppLayout>
}
