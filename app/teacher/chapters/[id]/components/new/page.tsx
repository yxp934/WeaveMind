"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

type ComponentType = "text" | "image" | "video" | "question" | "interactive"

export default function NewComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [componentType, setComponentType] = useState<ComponentType>("text")
  const [nextOrderIndex, setNextOrderIndex] = useState(0)
  
  const [textContent, setTextContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imageCaption, setImageCaption] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [videoTitle, setVideoTitle] = useState("")
  const [question, setQuestion] = useState("")
  const [questionOptions, setQuestionOptions] = useState(["", "", "", ""])
  const [correctAnswer, setCorrectAnswer] = useState(0)
  const [interactiveTitle, setInteractiveTitle] = useState("")
  const [interactiveDescription, setInteractiveDescription] = useState("")

  useEffect(() => {
    const fetchNextOrder = async () => {
      const { data: components } = await supabase
        .from("components")
        .select("order_index")
        .eq("chapter_id", id)
        .order("order_index", { ascending: false })
        .limit(1)

      const next = components && components.length > 0 ? components[0].order_index + 1 : 0
      setNextOrderIndex(next)
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

      let content: any = {}

      switch (componentType) {
        case "text":
          content = { text: textContent }
          break
        case "image":
          content = { url: imageUrl, caption: imageCaption }
          break
        case "video":
          content = { url: videoUrl, title: videoTitle }
          break
        case "question":
          content = {
            question,
            options: questionOptions.filter(opt => opt.trim() !== ""),
            correctAnswer
          }
          break
        case "interactive":
          content = {
            title: interactiveTitle,
            description: interactiveDescription
          }
          break
      }

      const { error: componentError } = await supabase
        .from("components")
        .insert({
          chapter_id: id,
          type: componentType,
          content,
          order_index: nextOrderIndex,
        })

      if (componentError) throw componentError

      router.push(`/teacher/chapters/${id}`)
    } catch (err: any) {
      console.error("Error creating component:", err)
      setError(err.message || "Failed to create component")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
            <Link href={`/teacher/chapters/${id}`}>
              <Button variant="ghost">Back</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Add Learning Component</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Component Type Selection */}
            <div>
              <Label>Component Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { type: "text" as ComponentType, icon: "📝", label: "Text" },
                  { type: "image" as ComponentType, icon: "🖼️", label: "Image" },
                  { type: "video" as ComponentType, icon: "🎥", label: "Video" },
                  { type: "question" as ComponentType, icon: "❓", label: "Question" },
                  { type: "interactive" as ComponentType, icon: "🎮", label: "Interactive" },
                ].map(({ type, icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setComponentType(type)}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      componentType === type
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-3xl mb-1">{icon}</div>
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content based on type */}
            {componentType === "text" && (
              <div>
                <Label htmlFor="text">Text Content</Label>
                <textarea
                  id="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={8}
                  placeholder="Enter your text content here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  required
                />
              </div>
            )}

            {componentType === "image" && (
              <>
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="imageCaption">Caption (optional)</Label>
                  <Input
                    id="imageCaption"
                    type="text"
                    placeholder="Image description"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                  />
                </div>
              </>
            )}

            {componentType === "video" && (
              <>
                <div>
                  <Label htmlFor="videoUrl">Video URL</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="videoTitle">Video Title (optional)</Label>
                  <Input
                    id="videoTitle"
                    type="text"
                    placeholder="Introduction to Neural Networks"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                  />
                </div>
              </>
            )}

            {componentType === "question" && (
              <>
                <div>
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    type="text"
                    placeholder="What is a neural network?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Answer Options</Label>
                  {questionOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={correctAnswer === index}
                        onChange={() => setCorrectAnswer(index)}
                        className="h-4 w-4 text-indigo-600"
                      />
                      <Input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...questionOptions]
                          newOptions[index] = e.target.value
                          setQuestionOptions(newOptions)
                        }}
                        required={index < 2}
                      />
                    </div>
                  ))}
                  <p className="text-sm text-gray-500 mt-2">Select the correct answer by clicking the radio button</p>
                </div>
              </>
            )}

            {componentType === "interactive" && (
              <>
                <div>
                  <Label htmlFor="interactiveTitle">Interactive Title</Label>
                  <Input
                    id="interactiveTitle"
                    type="text"
                    placeholder="Neural Network Simulator"
                    value={interactiveTitle}
                    onChange={(e) => setInteractiveTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="interactiveDescription">Description</Label>
                  <textarea
                    id="interactiveDescription"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={4}
                    placeholder="Describe the interactive component..."
                    value={interactiveDescription}
                    onChange={(e) => setInteractiveDescription(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Add Component"}
              </Button>
              <Link href={`/teacher/chapters/${id}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

