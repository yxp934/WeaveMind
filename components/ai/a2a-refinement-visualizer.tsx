'use client'

import { useState } from 'react'
import { Loader2, User, GraduationCap, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface A2AIteration {
  iteration: number
  teacherContent: any[]
  studentFeedback: any | null
  teacherRawResponse?: string
  studentRawResponse?: string
}

interface A2ARefinementVisualizerProps {
  isActive: boolean
  currentIteration: number
  totalIterations: number
  currentAgent: 'teacher' | 'student' | null
  currentActivity: string
  iterations: A2AIteration[]
  onComplete?: (finalComponents: any[]) => void
}

export function A2ARefinementVisualizer({
  isActive,
  currentIteration,
  totalIterations,
  currentAgent,
  currentActivity,
  iterations
}: A2ARefinementVisualizerProps) {
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set())

  const toggleIteration = (iteration: number) => {
    const newExpanded = new Set(expandedIterations)
    if (newExpanded.has(iteration)) {
      newExpanded.delete(iteration)
    } else {
      newExpanded.add(iteration)
    }
    setExpandedIterations(newExpanded)
  }

  if (!isActive && iterations.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          🤖 A2A Content Refinement Process
        </h3>
        <p className="text-sm text-indigo-700">
          Two AI agents are collaborating to create high-quality learning content through iterative refinement.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: Iteration {currentIteration} of {totalIterations}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((currentIteration / totalIterations) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentIteration / totalIterations) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Activity */}
      {isActive && currentAgent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {currentAgent === 'teacher' ? (
              <User className="h-6 w-6 text-blue-600" />
            ) : (
              <GraduationCap className="h-6 w-6 text-green-600" />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {currentAgent === 'teacher' ? '🧑‍🏫 Teacher Agent' : '🎓 Student Agent'}
              </p>
              <p className="text-sm text-gray-600">{currentActivity}</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        </div>
      )}

      {/* Completion Message */}
      {!isActive && iterations.length === totalIterations && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-900">
                ✅ A2A Refinement Complete!
              </p>
              <p className="text-sm text-green-700">
                Content has been refined through {totalIterations} iterations and saved successfully. The dialog will close automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Iterations History */}
      <div className="space-y-3">
        {iterations.map((iter) => {
          // Safety checks for iteration data
          if (!iter || typeof iter.iteration !== 'number') {
            return null
          }

          const isExpanded = expandedIterations.has(iter.iteration)
          const isComplete = iter.iteration < currentIteration || !isActive

          // Safe access to feedback data
          const hasFeedback = iter.studentFeedback && typeof iter.studentFeedback === 'object'
          const overallScore = hasFeedback && typeof iter.studentFeedback.overall_score === 'number'
            ? iter.studentFeedback.overall_score
            : null

          return (
            <div
              key={iter.iteration}
              className={`border rounded-lg overflow-hidden ${
                isComplete ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              {/* Iteration Header */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleIteration(iter.iteration)
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                type="button"
              >
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  <span className="font-medium text-gray-900">
                    Iteration {iter.iteration}
                  </span>
                  {overallScore !== null && (
                    <span className="text-sm text-gray-500">
                      Score: {overallScore.toFixed(1)}/10
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Iteration Details */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t">
                  {/* Teacher Content */}
                  <div className="pt-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Teacher Agent Generated Content
                    </h4>
                    <div className="bg-gray-50 rounded p-3 text-sm">
                      <p className="text-gray-600">
                        {Array.isArray(iter.teacherContent) ? iter.teacherContent.length : 0} components generated
                      </p>
                    </div>
                  </div>

                  {/* Student Feedback */}
                  {iter.studentFeedback && typeof iter.studentFeedback === 'object' && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Student Agent Feedback
                      </h4>
                      <div className="bg-green-50 rounded p-3 space-y-2 text-sm">
                        {/* Scores */}
                        {iter.studentFeedback.scores && typeof iter.studentFeedback.scores === 'object' && !Array.isArray(iter.studentFeedback.scores) && (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(iter.studentFeedback.scores).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600 capitalize">{String(key).replace('_', ' ')}:</span>
                                <span className="font-medium">{typeof value === 'number' ? value : String(value)}/10</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Overall Feedback */}
                        {iter.studentFeedback.overall_feedback && (
                          <p className="text-gray-700 mt-2 pt-2 border-t border-green-200">
                            {String(iter.studentFeedback.overall_feedback)}
                          </p>
                        )}
                        {/* Fallback when feedback format is unexpected */}
                        {!iter.studentFeedback.scores && !iter.studentFeedback.overall_feedback && (
                          <p className="text-gray-600 italic">
                            Feedback data format not recognized.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

