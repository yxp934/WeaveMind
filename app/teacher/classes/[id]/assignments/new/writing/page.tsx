'use client'

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewWritingAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    due_date: "",
    max_score: 100,
    grading_criteria: "",
    word_limit: 500,
    format_requirements: "",
    plagiarism_check: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/assignments/writing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create assignment')
      }

      // Redirect to class page
      router.push(`/teacher/classes/${classId}`)
    } catch (err: any) {
      console.error("Error creating assignment:", err)
      setError(err.message || "Failed to create assignment")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
            <Link href={`/teacher/classes/${classId}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create Writing Assignment</h2>
          </div>
          <p className="text-gray-600">
            Create a writing assignment where students can submit formatted text content
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Assignment Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Research Paper on Climate Change"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="mt-1"
                  rows={3}
                  placeholder="Brief overview of the assignment..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions *</Label>
                <Textarea
                  id="instructions"
                  className="mt-1"
                  rows={6}
                  placeholder="Provide detailed instructions for students on what to write, format requirements, expectations, etc."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Writing Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="word_limit">Word Limit</Label>
                <Input
                  id="word_limit"
                  type="number"
                  min="50"
                  max="10000"
                  value={formData.word_limit}
                  onChange={(e) => setFormData({ ...formData, word_limit: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Set a word limit for the assignment (50-10000 words)
                </p>
              </div>

              <div>
                <Label htmlFor="format_requirements">Format Requirements</Label>
                <Textarea
                  id="format_requirements"
                  className="mt-1"
                  rows={4}
                  placeholder="Specify format requirements such as: font size, spacing, citation style, etc."
                  value={formData.format_requirements}
                  onChange={(e) => setFormData({ ...formData, format_requirements: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="plagiarism_check">Plagiarism Check</Label>
                  <p className="text-sm text-gray-500">
                    Track copy-paste events to detect potential plagiarism
                  </p>
                </div>
                <Switch
                  id="plagiarism_check"
                  checked={formData.plagiarism_check}
                  onCheckedChange={(checked) => setFormData({ ...formData, plagiarism_check: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grading Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Due Date (optional)</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="max_score">Maximum Score *</Label>
                  <Input
                    id="max_score"
                    type="number"
                    min="1"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="grading_criteria">Grading Criteria (optional)</Label>
                <Textarea
                  id="grading_criteria"
                  className="mt-1"
                  rows={4}
                  placeholder="Explain how this assignment will be graded, what criteria will be used, etc."
                  value={formData.grading_criteria}
                  onChange={(e) => setFormData({ ...formData, grading_criteria: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Writing Assignment"}
            </Button>
            <Link href={`/teacher/classes/${classId}`} className="flex-1">
              <Button type="button" variant="outline" className="w-full">Cancel</Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
