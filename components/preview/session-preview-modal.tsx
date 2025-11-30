'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Eye, X } from 'lucide-react'

interface Component {
  id: string
  type: string
  content: any
  order_index: number
}

interface SessionPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  chapterTitle: string
  chapterDescription: string | null
  components: Component[]
}

export function SessionPreviewModal({
  isOpen,
  onClose,
  chapterTitle,
  chapterDescription,
  components
}: SessionPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-600" />
              <DialogTitle>Student Preview Mode</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800 font-medium">
            📋 Preview Mode - This is how students will see this session content
          </p>
        </div>

        {/* Student View Content */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <h3 className="text-xl font-bold text-gray-900">{chapterTitle}</h3>
            {chapterDescription && (
              <p className="text-gray-600 mt-2">{chapterDescription}</p>
            )}
          </div>

          <div className="p-6 space-y-6">
            {components && components.length > 0 ? (
              components
                .sort((a, b) => a.order_index - b.order_index)
                .map((component) => (
                  <PreviewComponentDisplay key={component.id} component={component} />
                ))
            ) : (
              <p className="text-gray-500 text-center py-8">No content available</p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} variant="outline">
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Component display for preview (simplified version without analytics)
function PreviewComponentDisplay({ component }: { component: Component }) {
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
                  disabled
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
    </div>
  )
}

