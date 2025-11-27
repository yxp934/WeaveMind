'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudentDetailViewProps {
  studentId: string
  classId: string
}

interface ComponentProgress {
  component_id: string
  component_type: string
  chapter_id: string
  first_viewed_at: string | null
  completed_at: string | null
  view_count: number
  total_time_seconds: number | null
  last_activity_at: string | null
}

interface RecentActivity {
  id: string
  event_type: string
  created_at: string
  metadata: any
  component_id: string | null
  chapter_id: string | null
}

export function StudentDetailView({
  studentId,
  classId,
}: StudentDetailViewProps) {
  const [studentEmail, setStudentEmail] = useState<string>('Loading...')
  const [componentProgress, setComponentProgress] = useState<
    ComponentProgress[]
  >([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudentDetails()

    // Subscribe to real-time updates for this student's learning events
    const supabase = createClient()
    const channel = supabase
      .channel(`student_${studentId}_events`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_events',
          filter: `user_id=eq.${studentId}`,
        },
        (payload) => {
          console.log('Student learning event change:', payload)
          // Reload student details when their events change
          loadStudentDetails()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId])

  async function loadStudentDetails() {
    setLoading(true)
    const supabase = createClient()

    // Get student email
    const { data: userData } = await supabase.auth.admin.listUsers()
    const user = userData?.users.find((u) => u.id === studentId)
    setStudentEmail(user?.email || 'Unknown')

    // Get component progress
    const { data: progressData } = await supabase
      .from('component_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('last_activity_at', { ascending: false, nullsFirst: false })

    setComponentProgress(progressData || [])

    // Get recent activity
    const { data: activityData } = await supabase
      .from('learning_events')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20)

    setRecentActivity(activityData || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">Loading student details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Student Details
        </h2>
        <p className="text-gray-600">{studentEmail}</p>
      </div>

      {/* Component Progress */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Component Progress
          </h3>
        </div>

        {componentProgress.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {componentProgress.map((comp) => (
                  <tr key={comp.component_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {comp.component_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {comp.completed_at ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {comp.view_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {comp.total_time_seconds
                        ? `${Math.floor(comp.total_time_seconds / 60)}m ${comp.total_time_seconds % 60}s`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {comp.last_activity_at
                        ? new Date(comp.last_activity_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-600">
            No component activity yet
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
        </div>

        {recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {activity.event_type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {activity.metadata?.question && (
                      <p className="text-sm text-gray-600 mt-1">
                        Question: {activity.metadata.question}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-600">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}

