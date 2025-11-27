'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AtRiskStudentsProps {
  classId: string
  onSelectStudent: (studentId: string) => void
}

interface AtRiskStudent {
  student_id: string
  student_email: string
  course_id: string
  course_title: string
  risk_level: 'inactive' | 'struggling' | 'slow_progress' | 'ok'
  last_activity_at: string | null
  components_opened: number
  components_completed: number
  avg_time_per_component: number | null
  ai_questions_asked: number
}

export function AtRiskStudents({
  classId,
  onSelectStudent,
}: AtRiskStudentsProps) {
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAtRiskStudents()

    // Subscribe to real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel('at_risk_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_events',
        },
        () => {
          loadAtRiskStudents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [classId])

  async function loadAtRiskStudents() {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/teacher/at-risk-students?classId=${classId}`
      )

      if (!response.ok) {
        throw new Error('Failed to load at-risk students')
      }

      const data = await response.json()
      setAtRiskStudents(data)
    } catch (err) {
      console.error('Error loading at-risk students:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ⚠️ At-Risk Students
        </h3>
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (atRiskStudents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ⚠️ At-Risk Students
        </h3>
        <p className="text-green-600">
          ✓ No students currently at risk. Great job!
        </p>
      </div>
    )
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'inactive':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Inactive (7+ days)
          </span>
        )
      case 'struggling':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
            Struggling
          </span>
        )
      case 'slow_progress':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Slow Progress
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100">
        <h3 className="text-lg font-semibold text-gray-900">
          ⚠️ At-Risk Students ({atRiskStudents.length})
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Students who may need intervention
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {atRiskStudents.map((student) => (
          <div
            key={`${student.student_id}-${student.course_id}`}
            onClick={() => onSelectStudent(student.student_id)}
            className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900">
                  {student.student_email}
                </p>
                <p className="text-sm text-gray-600">{student.course_title}</p>
              </div>
              {getRiskBadge(student.risk_level)}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Completed:</span>{' '}
                {student.components_completed}/{student.components_opened}
              </div>
              <div>
                <span className="font-medium">Avg Time:</span>{' '}
                {student.avg_time_per_component
                  ? `${Math.floor(student.avg_time_per_component / 60)}m`
                  : '-'}
              </div>
              <div>
                <span className="font-medium">Last Active:</span>{' '}
                {student.last_activity_at
                  ? new Date(student.last_activity_at).toLocaleDateString()
                  : '-'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

