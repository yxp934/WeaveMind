"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, Users, BookOpen, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Organization {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [organizations, setOrganizations] = useState<Organization[]>([])
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
        await loadOrganizations()
      } catch (err) {
        console.error("Error:", err)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router, supabase])

  const loadOrganizations = async () => {
    try {
      // Load organizations from database
      // For now, show empty state
      setOrganizations([])
    } catch (error) {
      console.error("Error loading organizations:", error)
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
              <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your teaching organizations and institutions
              </p>
            </div>
            <button
              onClick={() => router.push("/teacher/organizations/new")}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Organization
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first organization.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push("/teacher/organizations/new")}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Organization
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/teacher/organizations/${org.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Building2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {org.name}
                      </h3>
                      {org.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {org.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      0 members
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
