import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function StudentDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get user's class memberships
  const { data: classMemberships } = await supabase
    .from("class_members")
    .select(`
      *,
      classes (
        *,
        organizations (*)
      )
    `)
    .eq("user_id", user.id)
    .eq("role", "student")

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
              <span className="ml-4 text-sm text-gray-500">Student Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" type="submit">Sign Out</Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Student!</h2>
          <p className="text-gray-600">Access your classes, courses, and assignments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">My Classes</h3>
            <p className="text-3xl font-bold text-indigo-600">
              {classMemberships?.length || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Active Courses</h3>
            <p className="text-3xl font-bold text-indigo-600">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Assignments</h3>
            <p className="text-3xl font-bold text-indigo-600">0</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">My Classes</h3>

          {classMemberships && classMemberships.length > 0 ? (
            <div className="space-y-4">
              {classMemberships.map((membership: any) => (
                <div key={membership.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">{membership.classes.name}</h4>
                      <p className="text-sm text-gray-500">
                        {membership.classes.organizations.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {membership.classes.description || "No description"}
                      </p>
                    </div>
                    <Link href={`/student/classes/${membership.class_id}`}>
                      <Button variant="outline">View Class</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven&apos;t joined any classes yet</p>
              <p className="text-sm text-gray-400">
                Ask your teacher for a class invitation code
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

