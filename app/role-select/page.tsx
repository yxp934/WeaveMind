"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

interface RoleCard {
  id: string;
  title: string;
  description: string;
  illustration: string;
  emoji: string;
}

const roles: RoleCard[] = [
  {
    id: 'student',
    title: 'Student',
    description: '"Following the roadmap with a guide, yet somehow still Googling answers at 2 AM"',
    illustration: 'order-placed',
    emoji: '🎓',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: '"Educator, deadline enforcer, tech support, and occasional life coach—multitasking since forever"',
    illustration: 'hello',
    emoji: '👨‍🏫',
  },
  {
    id: 'self-learner',
    title: 'Self-learner',
    description: '"My own boss, my own student, and my own motivational speaker—meetings optional, pajamas mandatory"',
    illustration: 'writing',
    emoji: '📚',
  },
];

export default function RoleSelectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

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
        if (profile && profile.role === "self-learner") {
          window.location.href = "/self-learner"
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

  const selectRole = async (role: "teacher" | "student" | "self-learner") => {
    setError("")
    setRoleLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = "/auth/login"
        return
      }

      // Attempt to create or update the profile with the chosen role.
      // A database trigger prevents changing role once it has been set.
      const { data: existing } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (existing && existing.role && existing.role !== role) {
        setError("Your role has already been set and cannot be changed.")
        window.location.href =
          existing.role === "teacher" ? "/teacher" :
          existing.role === "student" ? "/student" : "/self-learner"
        return
      }

      if (!existing) {
        const { error } = await supabase
          .from("profiles")
          .insert({ id: user.id, role })

        if (error) throw error
      } else if (!existing.role) {
        const { error } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", user.id)

        if (error) throw error
      }

      // Navigate based on role
      const targetPath = role === "self-learner" ? "/self-learner" : `/${role}`
      window.location.href = targetPath
    } catch (err: any) {
      setError(err.message || "Failed to set role")
    } finally {
      setRoleLoading(false)
    }
  }

  const handleContinue = () => {
    if (selectedRole) {
      selectRole(selectedRole as "teacher" | "student" | "self-learner")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 space-y-4"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Path</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tell us about yourself so we can personalize your WeaveMind experience
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {roles.map((role, index) => {
            const isSelected = selectedRole === role.id

            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <motion.button
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full p-8 rounded-2xl border-2 transition-all text-left space-y-6 ${
                    isSelected
                      ? 'border-green-600 bg-white shadow-xl scale-[1.02]'
                      : 'border-gray-200 bg-white hover:border-green-600 hover:shadow-lg'
                  }`}
                  whileHover={{ y: -8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Emoji */}
                  <div className="text-6xl text-center">{role.emoji}</div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 text-center">{role.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed italic text-center">
                    {role.description}
                  </p>

                  {/* Selection Indicator */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isSelected ? 1 : 0,
                      scale: isSelected ? 1 : 0.8,
                    }}
                    className="flex items-center justify-center gap-2 text-green-600"
                  >
                    <div className="size-2 rounded-full bg-green-600" />
                    <span className="text-sm">Selected</span>
                  </motion.div>
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <motion.button
            onClick={handleContinue}
            disabled={!selectedRole || roleLoading}
            className={`group px-12 py-4 rounded-lg transition-all flex items-center gap-3 mx-auto ${
              selectedRole
                ? 'bg-green-600 text-white hover:opacity-90 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={selectedRole ? { scale: 1.05 } : {}}
            whileTap={selectedRole ? { scale: 0.95 } : {}}
          >
            <span className="text-lg">
              {roleLoading ? 'Setting role...' : 'Continue'}
            </span>
            <ArrowRight className="size-6 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          {!selectedRole && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-gray-500 mt-4"
            >
              Please select a role to continue
            </motion.p>
          )}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  )
}

