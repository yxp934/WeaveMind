'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Eye, Copy, AlertCircle } from 'lucide-react'

interface WritingAssignment {
  id: string
  title: string
  description: string
  instructions: string
  due_date: string | null
  max_score: number
  word_limit: number | null
  format_requirements: string | null
  plagiarism_check: boolean
}

export default function WritingAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [assignment, setAssignment] = useState<WritingAssignment | null>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copyPasteCount, setCopyPasteCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    fetchAssignmentAndSubmission()
  }, [id])

  useEffect(() => {
    // Count words
    const count = content.trim().split(/\s+/).filter(word => word.length > 0).length
    setWordCount(count)
  }, [content])

  const fetchAssignmentAndSubmission = async () => {
    try {
      // Fetch assignment details
      const assignmentResponse = await fetch(`/api/assignments/${id}`)
      if (!assignmentResponse.ok) {
        throw new Error('Failed to fetch assignment')
      }
      const assignmentData = await assignmentResponse.json()
      setAssignment(assignmentData.assignment)

      // Fetch submission
      const submissionResponse = await fetch(`/api/assignments/${id}/submissions/writing`)
      if (submissionResponse.ok) {
        const submissionData = await submissionResponse.json()
        if (submissionData.submission) {
          setSubmission(submissionData.submission)
          setContent(submissionData.submission.content || '')
          setCopyPasteCount(submissionData.submission.copy_paste_count || 0)
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!assignment?.plagiarism_check) return

    // Track copy event
    fetch('/api/tracking/copy-paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId: submission?.id,
        eventType: 'copy',
        sourceInfo: 'User copied text',
      }),
    }).then(() => {
      setCopyPasteCount(prev => prev + 1)
    }).catch(console.error)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/assignments/${id}/submissions/writing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save submission')
      }

      const data = await response.json()
      setSubmission(data.submission)

      // Show success message
      alert('Submission saved successfully!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assignment not found</h2>
          <Link href="/student">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/student" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Assignments</span>
            </Link>
            <h1 className="text-xl font-bold text-indigo-600">WeaveMind</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Writing Assignment</h2>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">Assignment Details</CardTitle>
                </div>
                <div className="flex gap-2">
                  {assignment.due_date && (
                    <Badge variant={new Date(assignment.due_date) < new Date() ? "destructive" : "secondary"}>
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Max Score: {assignment.max_score}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Description</h4>
                  <p className="text-gray-600">{assignment.description}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Instructions</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{assignment.instructions}</p>
              </div>
              {assignment.format_requirements && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Format Requirements</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{assignment.format_requirements}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Word Limit</h4>
                  <p className="text-gray-600">{assignment.word_limit || 'No limit'}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Plagiarism Check</h4>
                  <p className="text-gray-600">{assignment.plagiarism_check ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Your Submission</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {assignment.word_limit && (
                    <span className={wordCount > assignment.word_limit ? 'text-red-600 font-semibold' : ''}>
                      Words: {wordCount} / {assignment.word_limit}
                    </span>
                  )}
                  {assignment.plagiarism_check && (
                    <span className="flex items-center gap-1">
                      <Copy className="h-4 w-4" />
                      Copy/Paste: {copyPasteCount}
                    </span>
                  )}
                  {submission?.submitted_at && (
                    <Badge variant="outline">
                      Last saved: {new Date(submission.submitted_at).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.plagiarism_check && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">Plagiarism Check Active</p>
                    <p className="text-amber-700">
                      Your copy and paste activities are being tracked. Please submit your own original work.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Write your response below:
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onCopy={handleCopy}
                  onCut={handleCopy}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={20}
                  placeholder="Type your response here..."
                />
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSave} disabled={saving || !content.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
