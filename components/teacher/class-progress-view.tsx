'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ClassProgressViewProps {
  classId: string
  className: string
  onSelectStudent: (studentId: string) => void
}

interface StudentProgress {
  student_id: string
  student_email: string
  course_id: string
  course_title: string
  components_completed: number
  chapters_completed: number
  ai_questions_asked: number
  total_time_seconds: number
  last_activity_at: string | null
}

export function ClassProgressView({
  classId,
  className,
  onSelectStudent,
}: ClassProgressViewProps) {
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgress()

    // Subscribe to real-time updates for learning events
    const supabase = createClient()
    const channel = supabase
      .channel('learning_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_events',
        },
        (payload) => {
          console.log('Learning event change detected:', payload)
          // Reload progress when any learning event changes
          loadProgress()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classId])

  async function loadProgress() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/teacher/class-progress?classId=${classId}`
      )

      if (!response.ok) {
        throw new Error('Failed to load progress data')
      }

      const data = await response.json()
      setProgress(data)
    } catch (err) {
      console.error('Error loading progress:', err)
      setError('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">Loading progress data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (progress.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">
          No student activity yet in this class.
        </p>
      </div>
    )
  }

  // Group by course
  const courseGroups = progress.reduce((acc, item) => {
    if (!acc[item.course_id]) {
      acc[item.course_id] = {
        course_title: item.course_title,
        students: [],
      }
    }
    acc[item.course_id].students.push(item)
    return acc
  }, {} as Record<string, { course_title: string; students: StudentProgress[] }>)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Class Progress: {className}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {progress.length} student{progress.length !== 1 ? 's' : ''} with
          activity
        </p>
      </div>

      {Object.entries(courseGroups).map(([courseId, group]) => (
        <div key={courseId} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
            <h3 className="text-lg font-semibold text-gray-900">
              📚 {group.course_title}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Components
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chapters
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Questions
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
                {group.students.map((student) => (
                  <tr
                    key={student.student_id}
                    onClick={() => onSelectStudent(student.student_id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.student_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.components_completed || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.chapters_completed || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.ai_questions_asked || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.total_time_seconds
                        ? `${Math.floor(student.total_time_seconds / 60)}m`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.last_activity_at
                        ? new Date(student.last_activity_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

