import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get organization details
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single()

  if (!org) {
    redirect("/teacher")
  }

  // Get classes in this organization
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("*")
    .eq("organization_id", id)

  if (classesError) {
    console.error("Error fetching classes:", classesError)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/teacher">
                <Button variant="ghost">← Back</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{org.name}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{org.name}</h2>
          <p className="text-gray-600">Slug: {org.slug}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Classes</h3>
            <Link href={`/teacher/organizations/${id}/create-class`}>
              <Button>Create Class</Button>
            </Link>
          </div>

          {classes && classes.length > 0 ? (
            <div className="space-y-4">
              {classes.map((cls: any) => (
                <div key={cls.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">{cls.name}</h4>
                      <p className="text-sm text-gray-500">{cls.description || "No description"}</p>
                    </div>
                    <Link href={`/teacher/classes/${cls.id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No classes yet</p>
              <Link href={`/teacher/organizations/${id}/create-class`}>
                <Button>Create Your First Class</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

