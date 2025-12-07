"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users, BookOpen, Calendar, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Class {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  organization?: {
    name: string;
  };
}

export default function ClassesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push("/auth/login")
          return
        }
        setUser(user)
        await loadClasses()
      } catch (err) {
        console.error("Error:", err)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase])

  const loadClasses = async () => {
    try {
      // Load classes from database
      // For now, show empty state
      setClasses([])
    } catch (error) {
      console.error("Error loading classes:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your teaching classes and student groups
              </p>
            </div>
            <button
              onClick={() => {
                // For now, redirect to organizations since we need an organization first
                router.push("/teacher/organizations")
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Class
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {classes.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No classes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first class.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  // For now, redirect to organizations since we need an organization first
                  router.push("/teacher/organizations")
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Class
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/teacher/classes/${cls.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <GraduationCap className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {cls.name}
                      </h3>
                      {cls.organization && (
                        <p className="mt-1 text-sm text-gray-500">
                          {cls.organization.name}
                        </p>
                      )}
                      {cls.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {cls.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      0 students
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      0 courses
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
