"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function NewAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    due_date: "",
    max_score: 100,
    grading_criteria: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Create assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .insert({
          class_id: id,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          due_date: formData.due_date || null,
          max_score: formData.max_score,
          grading_criteria: formData.grading_criteria || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (assignmentError) throw assignmentError

      // Redirect to assignment detail page
      router.push(`/teacher/assignments/${assignment.id}`)
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
            <Link href={`/teacher/classes/${id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Create New Assignment</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="Neural Network Implementation Project"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Brief overview of the assignment..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <textarea
                id="instructions"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={6}
                placeholder="Detailed instructions for students..."
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">Due Date (optional)</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="max_score">Maximum Score</Label>
                <Input
                  id="max_score"
                  type="number"
                  min="1"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="grading_criteria">Grading Criteria (optional)</Label>
              <textarea
                id="grading_criteria"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="How will this assignment be graded?"
                value={formData.grading_criteria}
                onChange={(e) => setFormData({ ...formData, grading_criteria: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Assignment"}
              </Button>
              <Link href={`/teacher/classes/${id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

