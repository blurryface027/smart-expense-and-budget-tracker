"use client"

import { useState } from "react"
import { WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, signup } from "../auth-actions"

export function LoginFormClient() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  async function handleAction(formData: FormData, action: typeof login) {
    setError(null)
    setLoading(true)
    try {
      await action(formData)
    } catch (e) {
      if (e instanceof Error) {
          if (e.message !== "NEXT_REDIRECT") {
             setError(e.message)
          }
      } else {
        setError("An unexpected error occurred.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="mx-auto max-w-sm w-full shadow-lg border-muted">
        <CardHeader className="space-y-1 flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
              <WalletCards className="h-6 w-6" />
            </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your email to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
              
              if (submitter.name === 'signup') {
                  handleAction(formData, signup)
              } else {
                  handleAction(formData, login)
              }
          }}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && (
                <p className="text-sm font-medium text-destructive">
                    {error}
                </p>
            )}
            <Button name="login" type="submit" disabled={loading} className="w-full">
              {loading ? "Loading..." : "Login"}
            </Button>
            <Button name="signup" type="submit" disabled={loading} variant="outline" className="w-full">
              Sign up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
