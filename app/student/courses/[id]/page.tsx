import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function StudentCoursePage({
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

  // Get course details
  const { data: course } = await supabase
    .from("courses")
    .select("*, class:classes(name, id)")
    .eq("id", id)
    .single()

  if (!course || !course.published) {
    redirect("/student")
  }

  // Get chapters with components
  const { data: chapters } = await supabase
    .from("chapters")
    .select(`
      *,
      components (*)
    `)
    .eq("course_id", id)
    .order("order_index", { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/student/classes/${course.class_id}`}>
                <Button variant="ghost">← Back to Class</Button>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">{course.title}</h1>
            </div>
            <span className="text-sm text-gray-700">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h2>
          <p className="text-gray-600 mb-2">{course.description || "No description"}</p>
          <p className="text-sm text-gray-500">
            Class: {course.class?.name || "Unknown"}
          </p>
        </div>

        {/* Course Content */}
        <div className="space-y-6">
          {chapters && chapters.length > 0 ? (
            chapters.map((chapter: any, chapterIndex: number) => (
              <div key={chapter.id} className="bg-white rounded-lg shadow">
                <div className="p-6 border-b bg-indigo-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-indigo-600">
                      Chapter {chapterIndex + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{chapter.title}</h3>
                  </div>
                  {chapter.description && (
                    <p className="text-gray-600 mt-2">{chapter.description}</p>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {chapter.components && chapter.components.length > 0 ? (
                    chapter.components
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((component: any, componentIndex: number) => (
                        <div key={component.id} className="border-l-4 border-indigo-200 pl-4">
                          {/* Text Component */}
                          {component.type === "text" && (
                            <div className="prose max-w-none">
                              <p className="whitespace-pre-wrap text-gray-700">
                                {component.content?.text || "No content"}
                              </p>
                            </div>
                          )}

                          {/* Image Component */}
                          {component.type === "image" && (
                            <div>
                              <img
                                src={component.content?.url}
                                alt={component.content?.caption || "Course image"}
                                className="max-w-full h-auto rounded-lg"
                              />
                              {component.content?.caption && (
                                <p className="text-sm text-gray-500 mt-2 italic">
                                  {component.content.caption}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Video Component */}
                          {component.type === "video" && (
                            <div>
                              {component.content?.title && (
                                <h4 className="font-semibold mb-2">{component.content.title}</h4>
                              )}
                              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                <a
                                  href={component.content?.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline"
                                >
                                  🎥 Watch Video
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Question Component */}
                          {component.type === "question" && (
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-semibold mb-3">
                                ❓ {component.content?.question || "No question"}
                              </h4>
                              <div className="space-y-2">
                                {component.content?.options?.map((option: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`question-${component.id}`}
                                      id={`option-${component.id}-${idx}`}
                                      className="h-4 w-4 text-indigo-600"
                                    />
                                    <label
                                      htmlFor={`option-${component.id}-${idx}`}
                                      className="text-gray-700"
                                    >
                                      {option}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive Component */}
                          {component.type === "interactive" && (
                            <div className="bg-purple-50 rounded-lg p-4">
                              <h4 className="font-semibold mb-2">
                                🎮 {component.content?.title || "Interactive Component"}
                              </h4>
                              <p className="text-gray-700">
                                {component.content?.description || "No description"}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No content in this chapter</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No chapters available yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

