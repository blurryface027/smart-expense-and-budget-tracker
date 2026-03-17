"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// Helper: map Supabase error messages to user-friendly copy
function mapAuthError(message: string): string {
  const msg = message.toLowerCase()

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid email or password") ||
    msg.includes("email not confirmed") ||
    msg.includes("wrong password")
  ) {
    return "Invalid email or password. Please try again."
  }

  if (
    msg.includes("user not found") ||
    msg.includes("no user") ||
    msg.includes("unable to validate")
  ) {
    return "Account not found. Please sign up first."
  }

  if (msg.includes("email already") || msg.includes("already registered")) {
    return "An account with this email already exists. Please log in."
  }

  if (msg.includes("password should be") || msg.includes("password must")) {
    return "Password must be at least 6 characters long."
  }

  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again."
  }

  // Fallback — return the raw message but sanitized
  return "Something went wrong. Please try again."
}

export type AuthResult = { error: string } | { success: true }

export async function login(formData: FormData): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Please fill in all fields." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string
  const name = (formData.get("name") as string)?.trim()

  if (!name) {
    return { error: "Please enter your full name." }
  }

  if (!email || !password) {
    return { error: "Please fill in all fields." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
