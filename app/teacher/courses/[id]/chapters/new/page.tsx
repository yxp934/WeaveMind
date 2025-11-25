"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function NewChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [nextOrderIndex, setNextOrderIndex] = useState(0)
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    order_index: 0,
  })

  useEffect(() => {
    // Get the next order index
    const fetchNextOrder = async () => {
      const { data: chapters } = await supabase
        .from("chapters")
        .select("order_index")
        .eq("course_id", id)
        .order("order_index", { ascending: false })
        .limit(1)

      const next = chapters && chapters.length > 0 ? chapters[0].order_index + 1 : 0
      setNextOrderIndex(next)
      setFormData(prev => ({ ...prev, order_index: next }))
    }

    fetchNextOrder()
  }, [id])

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

      // Create chapter
      const { data: chapter, error: chapterError } = await supabase
        .from("chapters")
        .insert({
          course_id: id,
          title: formData.title,
          description: formData.description,
          order_index: formData.order_index,
        })
        .select()
        .single()

      if (chapterError) throw chapterError

      // Redirect to chapter detail page
      router.push(`/teacher/chapters/${chapter.id}`)
    } catch (err: any) {
      console.error("Error creating chapter:", err)
      setError(err.message || "Failed to create chapter")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
            <Link href={`/teacher/courses/${id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Add New Chapter</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Chapter Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="Introduction to Neural Networks"
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
                rows={4}
                placeholder="Learn the fundamentals of neural networks..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="order_index">Order (Position in Course)</Label>
              <Input
                id="order_index"
                type="number"
                min="0"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                This will be chapter #{formData.order_index + 1} in the course
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Chapter"}
              </Button>
              <Link href={`/teacher/courses/${id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

