"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function RoleSelectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [error, setError] = useState("")

  // If the user already has a fixed role, redirect them automatically
  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          window.location.href = "/auth/login"
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (!isMounted) return

        if (profile && profile.role === "teacher") {
          window.location.href = "/teacher"
          return
        }
        if (profile && profile.role === "student") {
          window.location.href = "/student"
          return
        }
      } catch (err: any) {
        console.error("Error loading profile:", err)
        if (isMounted) {
          setError(err.message || "Failed to load profile")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [router, supabase])

  const selectRole = async (role: "teacher" | "student") => {
    setError("")
    setRoleLoading(true)

    try {
      console.log("🔐 [ROLE-SELECT] Selecting role:", role)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("⚠️ [ROLE-SELECT] No user found, redirecting to login")
        window.location.href = "/auth/login"
        return
      }

      console.log("👤 [ROLE-SELECT] User ID:", user.id)

      // Attempt to create or update the profile with the chosen role.
      // A database trigger prevents changing role once it has been set.
      const { data: existing } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      console.log("📋 [ROLE-SELECT] Existing profile:", existing)

      if (existing && existing.role && existing.role !== role) {
        console.log("⚠️ [ROLE-SELECT] Role already set to:", existing.role)
        setError("Your role has already been set and cannot be changed.")
        window.location.href = existing.role === "teacher" ? "/teacher" : "/student"
        return
      }

      if (!existing) {
        console.log("➕ [ROLE-SELECT] Creating new profile...")
        const { error } = await supabase
          .from("profiles")
          .insert({ id: user.id, role })

        if (error) {
          console.error("❌ [ROLE-SELECT] Insert error:", error)
          throw error
        }
        console.log("✅ [ROLE-SELECT] Profile created")
      } else if (!existing.role) {
        console.log("✏️ [ROLE-SELECT] Updating profile...")
        const { error } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", user.id)

        if (error) {
          console.error("❌ [ROLE-SELECT] Update error:", error)
          throw error
        }
        console.log("✅ [ROLE-SELECT] Profile updated")
      }

      console.log("➡️ [ROLE-SELECT] Redirecting to:", `/${role}`)
      window.location.href = `/${role}`
    } catch (err: any) {
      console.error("❌ [ROLE-SELECT] Error selecting role:", err)
      setError(err.message || "Failed to set role")
    } finally {
      console.log("🏁 [ROLE-SELECT] Role selection finished")
      setRoleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-center mb-4">Welcome to WeaveMind</h1>
        <p className="text-center text-gray-600 mb-8">
          因材织学 - Choose your role to continue
        </p>

        {error && (
          <p className="mb-4 text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-600 transition">
            <div className="text-center">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <h2 className="text-2xl font-bold mb-2">Teacher</h2>
              <p className="text-gray-600 mb-4">
                Create courses, manage classes, and track student progress
              </p>
              <Button
                onClick={() => selectRole("teacher")}
                className="w-full"
                disabled={roleLoading}
              >
                {roleLoading ? "Setting role..." : "Continue as Teacher"}
              </Button>
            </div>
          </div>

          <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-600 transition">
            <div className="text-center">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold mb-2">Student</h2>
              <p className="text-gray-600 mb-4">
                Join classes, learn courses, and submit assignments
              </p>
              <Button
                onClick={() => selectRole("student")}
                className="w-full"
                disabled={roleLoading}
              >
                {roleLoading ? "Setting role..." : "Continue as Student"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

