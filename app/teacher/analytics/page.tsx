import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AnalyticsDashboard } from '@/components/teacher/analytics-dashboard'

export default async function TeacherAnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all classes where user is a teacher
  const { data: classesData, error: classesError } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      description,
      organization:organizations!inner(id, name)
    `)
    .eq('created_by', user.id)
    .order('name')

  if (classesError) {
    console.error('Error fetching classes:', classesError)
    return <div>Error loading classes</div>
  }

  // Transform the data to match the expected type
  const classes = (classesData || []).map((cls: any) => ({
    id: cls.id,
    name: cls.name,
    description: cls.description,
    organization: Array.isArray(cls.organization)
      ? cls.organization[0]
      : cls.organization,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/teacher"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                📊 Analytics & Monitoring
              </h1>
            </div>
            <div className="text-sm text-gray-600">{user.email}</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {classes && classes.length > 0 ? (
          <AnalyticsDashboard classes={classes} />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              You don&apos;t have any classes yet.
            </p>
            <Link
              href="/teacher/classes/new"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create Your First Class
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

