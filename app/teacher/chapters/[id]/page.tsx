import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChapterPreviewWrapper } from "@/components/preview/chapter-preview-wrapper"

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get chapter details
  const { data: chapter } = await supabase
    .from("chapters")
    .select("*, course:courses(id, title, class_id)")
    .eq("id", id)
    .single()

  if (!chapter) {
    redirect("/teacher")
  }

  // Get components in this chapter
  const { data: components } = await supabase
    .from("components")
    .select("*")
    .eq("chapter_id", id)
    .order("order_index", { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/teacher/courses/${chapter.course_id}`}>
                <Button variant="ghost">← Back to Course</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{chapter.title}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{chapter.title}</h2>
              <p className="text-gray-600 mb-2">{chapter.description || "No description"}</p>
              <p className="text-sm text-gray-500">
                Course: {chapter.course?.title || "Unknown"} • Chapter #{chapter.order_index + 1}
              </p>
            </div>
            <div className="flex gap-2">
              <ChapterPreviewWrapper
                chapterTitle={chapter.title}
                chapterDescription={chapter.description}
                components={components || []}
              />
              <Link href={`/teacher/chapters/${id}/edit`}>
                <Button variant="outline">Edit Chapter</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Components Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Learning Components</h3>
            <Link href={`/teacher/chapters/${id}/components/new`}>
              <Button>Add Component</Button>
            </Link>
          </div>

          {components && components.length > 0 ? (
            <div className="space-y-4">
              {components.map((component: any, index: number) => {
                const typeIcons: Record<string, string> = {
                  text: "📝",
                  image: "🖼️",
                  video: "🎥",
                  question: "❓",
                  interactive: "🎮"
                }
                
                return (
                  <div key={component.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{typeIcons[component.type] || "📄"}</span>
                          <span className="text-sm font-medium text-gray-500">Component {index + 1}</span>
                          <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                            {component.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {component.type === "text" && (
                            <p className="line-clamp-2">{component.content?.text || "No content"}</p>
                          )}
                          {component.type === "image" && (
                            <p>Image: {component.content?.url || "No URL"}</p>
                          )}
                          {component.type === "video" && (
                            <p>Video: {component.content?.url || "No URL"}</p>
                          )}
                          {component.type === "question" && (
                            <p>Question: {component.content?.question || "No question"}</p>
                          )}
                          {component.type === "interactive" && (
                            <p>Interactive: {component.content?.title || "No title"}</p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          Order: {component.order_index}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/teacher/components/${component.id}/edit`}>
                          <Button variant="outline">Edit</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No components yet. Add learning materials to this chapter!</p>
              <Link href={`/teacher/chapters/${id}/components/new`}>
                <Button>Add Your First Component</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Component Types Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3">Available Component Types:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
            <div><span className="font-medium">📝 Text:</span> Rich text content, explanations</div>
            <div><span className="font-medium">🖼️ Image:</span> Diagrams, illustrations, photos</div>
            <div><span className="font-medium">🎥 Video:</span> Video lectures, demonstrations</div>
            <div><span className="font-medium">❓ Question:</span> Quiz questions, assessments</div>
            <div><span className="font-medium">🎮 Interactive:</span> Simulations, exercises</div>
          </div>
        </div>
      </main>
    </div>
  )
}

