'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClassProgressView } from './class-progress-view'
import { StudentDetailView } from './student-detail-view'
import { AtRiskStudents } from './at-risk-students'

interface Class {
  id: string
  name: string
  description: string | null
  organization: {
    id: string
    name: string
  }
}

interface AnalyticsDashboardProps {
  classes: Class[]
}

export function AnalyticsDashboard({ classes }: AnalyticsDashboardProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || ''
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  )

  const selectedClass = classes.find((c) => c.id === selectedClassId)

  return (
    <div className="space-y-6">
      {/* Class Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <label
          htmlFor="class-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select Class
        </label>
        <select
          id="class-select"
          value={selectedClassId}
          onChange={(e) => {
            setSelectedClassId(e.target.value)
            setSelectedStudentId(null) // Reset student selection
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.organization.name})
            </option>
          ))}
        </select>
      </div>

      {/* At-Risk Students Alert */}
      {selectedClass && !selectedStudentId && (
        <AtRiskStudents
          classId={selectedClassId}
          onSelectStudent={setSelectedStudentId}
        />
      )}

      {/* Class Progress Overview */}
      {selectedClass && !selectedStudentId && (
        <ClassProgressView
          classId={selectedClassId}
          className={selectedClass.name}
          onSelectStudent={setSelectedStudentId}
        />
      )}

      {/* Student Detail View */}
      {selectedStudentId && (
        <div>
          <button
            onClick={() => setSelectedStudentId(null)}
            className="mb-4 text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Class Overview
          </button>
          <StudentDetailView
            studentId={selectedStudentId}
            classId={selectedClassId}
          />
        </div>
      )}
    </div>
  )
}

