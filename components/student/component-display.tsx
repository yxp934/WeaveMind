'use client'

import { ComponentAIAssistant } from './component-ai-assistant'

interface ComponentDisplayProps {
  component: any
  courseId: string
}

export function ComponentDisplay({ component, courseId }: ComponentDisplayProps) {
  return (
    <div className="border-l-4 border-indigo-200 pl-4">
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

      {/* AI Assistant for this component */}
      <ComponentAIAssistant componentId={component.id} courseId={courseId} />
    </div>
  )
}

