"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("🔐 [LOGIN] Starting login process...")
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("❌ [LOGIN] Login error:", error)
        throw error
      }

      console.log("✅ [LOGIN] Login successful")

      // Get the current authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("❌ [LOGIN] No user found after login")
        setError("Failed to get user after login")
        return
      }

      console.log("👤 [LOGIN] User ID:", user.id)

      // Check if user has a role and redirect appropriately
      console.log("🔍 [LOGIN] Checking profile...")
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error("❌ [LOGIN] Profile error:", profileError)
        throw profileError
      }

      console.log("📋 [LOGIN] Profile:", profile)

      if (profile?.role) {
        console.log("➡️ [LOGIN] Redirecting to:", `/${profile.role}`)
        router.push(`/${profile.role}`)
      } else {
        console.log("➡️ [LOGIN] Redirecting to: /role-select")
        router.push("/role-select")
      }
    } catch (err: any) {
      console.error("❌ [LOGIN] Login failed:", err)
      setError(err.message || "Failed to login")
    } finally {
      console.log("🏁 [LOGIN] Login process finished, setting loading to false")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Login to WeaveMind</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <a href="/auth/signup" className="text-indigo-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}

