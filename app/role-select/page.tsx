"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function RoleSelectPage() {
  const router = useRouter()

  const selectRole = (role: "teacher" | "student") => {
    // Store role preference in localStorage for now
    localStorage.setItem("preferredRole", role)
    router.push(`/${role}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-center mb-4">Welcome to WeaveMind</h1>
        <p className="text-center text-gray-600 mb-8">
          因材织学 - Choose your role to continue
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-600 transition">
            <div className="text-center">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <h2 className="text-2xl font-bold mb-2">Teacher</h2>
              <p className="text-gray-600 mb-4">
                Create courses, manage classes, and track student progress
              </p>
              <Button onClick={() => selectRole("teacher")} className="w-full">
                Continue as Teacher
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
              <Button onClick={() => selectRole("student")} className="w-full">
                Continue as Student
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

