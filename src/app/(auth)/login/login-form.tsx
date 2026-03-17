"use client"

import { useState } from "react"
import { WalletCards, AlertCircle, Loader2, User } from "lucide-react"

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
  const [mode, setMode] = useState<"login" | "signup">("login")

  function switchMode(next: "login" | "signup") {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get("email") as string)?.trim()
    const password = formData.get("password") as string
    const name = (formData.get("name") as string)?.trim()

    // Client-side quick validation before hitting the server
    if (mode === "signup" && !name) {
      setError("Please enter your full name.")
      return
    }

    if (!email || !password) {
      setError("Please fill in all fields.")
      return
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)

    try {
      const action = mode === "signup" ? signup : login
      const result = await action(formData)

      // result is only defined when auth FAILS — on success the server action
      // calls redirect() which the framework intercepts before this resolves.
      if (result && "error" in result) {
        setError(result.error)
      }
    } catch {
      // Only genuine unexpected errors arrive here — not redirect signals.
      setError("An unexpected error occurred. Please try again.")
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
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your credentials to sign in"
              : "Sign up to start tracking your expenses"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>

            {/* Name field — only shown during signup */}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    disabled={loading}
                    className="pl-9"
                    onChange={() => setError(null)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                onChange={() => setError(null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                disabled={loading}
                onChange={() => setError(null)}
              />
            </div>

            {/* Inline error alert */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                mode === "login" ? "Login" : "Create account"
              )}
            </Button>

            {/* Toggle login ↔ signup */}
            <div className="text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => switchMode("signup")}
                    disabled={loading}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => switchMode("login")}
                    disabled={loading}
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
