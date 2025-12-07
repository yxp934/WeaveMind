"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface RoleCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const roles: RoleCard[] = [
  {
    id: 'student',
    title: 'Student',
    description: '"Following the roadmap with a guide, yet somehow still Googling answers at 2 AM"',
    emoji: '🎓',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: '"Educator, deadline enforcer, tech support, and occasional coach—multitasking since forever"',
    emoji: '👨‍🏫',
  },
  {
    id: 'self-learner',
    title: 'Self-learner',
    description: '"My own boss, my own student, and my own motivational speaker—meetings optional, pajamas mandatory"',
    emoji: '📚',
  },
]

export default function RoleSelectPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = (roleId: string) => {
    console.log('Selecting role:', roleId, 'Current selected:', selectedRole)
    setSelectedRole(roleId)
  }

  const handleContinue = async () => {
    if (!selectedRole) {
      console.log('No role selected, cannot continue')
      return
    }

    console.log('Continuing with role:', selectedRole)
    setLoading(true)

    try {
      // Simulate role selection
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Redirect based on selected role
      const targetPath = selectedRole === "self-learner" ? "/self-learner" : `/${selectedRole}`
      console.log('Redirecting to:', targetPath)
      router.push(targetPath)
    } catch (error) {
      console.error("Error selecting role:", error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Path</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tell us about yourself so we can personalize your WeaveMind experience
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {roles.map((role, index) => {
            const isSelected = selectedRole === role.id

            return (
              <div
                key={role.id}
                className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <button
                  onClick={() => handleRoleSelect(role.id)}
                  className={`w-full p-8 rounded-2xl border-2 transition-all text-left space-y-6 ${
                    isSelected
                      ? 'border-green-600 bg-white shadow-xl ring-2 ring-green-200'
                      : 'border-gray-200 bg-white hover:border-green-600 hover:shadow-lg'
                  }`}
                  type="button"
                  data-testid={`role-${role.id}`}
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
                  {isSelected && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                      <span className="text-sm">Selected</span>
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className={`group px-12 py-4 rounded-lg transition-all flex items-center gap-3 mx-auto ${
              selectedRole
                ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            type="button"
            data-testid="continue-button"
          >
            <span className="text-lg">
              {loading ? 'Setting role...' : 'Continue'}
            </span>
            {!loading && <ArrowRight className="size-6 group-hover:translate-x-1 transition-transform" />}
          </button>

          {!selectedRole && (
            <p className="text-sm text-gray-500 mt-4">
              Please select a role to continue
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
