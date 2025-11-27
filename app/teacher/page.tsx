import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function TeacherDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get user's organizations
  const { data: orgMemberships } = await supabase
    .from("organization_members")
    .select(`
      *,
      organizations (*)
    `)
    .eq("user_id", user.id)
    .in("role", ["owner", "teacher"])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
              <span className="ml-4 text-sm text-gray-500">Teacher Dashboard</span>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Teacher!</h2>
          <p className="text-gray-600">Manage your organizations, classes, and courses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Organizations</h3>
            <p className="text-3xl font-bold text-indigo-600">
              {orgMemberships?.length || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Classes</h3>
            <p className="text-3xl font-bold text-indigo-600">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Courses</h3>
            <p className="text-3xl font-bold text-indigo-600">0</p>
          </div>
          <Link href="/teacher/analytics" className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-lg shadow hover:from-indigo-600 hover:to-purple-700 transition-all">
            <h3 className="text-lg font-semibold mb-2 text-white">📊 Analytics</h3>
            <p className="text-sm text-white/90">View student progress</p>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">My Organizations</h3>
            <Link href="/teacher/organizations/new">
              <Button>Create Organization</Button>
            </Link>
          </div>

          {orgMemberships && orgMemberships.length > 0 ? (
            <div className="space-y-4">
              {orgMemberships.map((membership: any) => (
                <div key={membership.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">{membership.organizations.name}</h4>
                      <p className="text-sm text-gray-500">Role: {membership.role}</p>
                    </div>
                    <Link href={`/teacher/organizations/${membership.organization_id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven&apos;t created any organizations yet</p>
              <Link href="/teacher/organizations/new">
                <Button>Create Your First Organization</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

