'use client'

import { CourseEditorAssistant } from './course-editor-assistant'
import { useRouter } from 'next/navigation'

interface CourseEditorAssistantWrapperProps {
  courseId: string
}

export function CourseEditorAssistantWrapper({ courseId }: CourseEditorAssistantWrapperProps) {
  const router = useRouter()

  const handleEditComplete = () => {
    // Refresh the page to show updated content
    router.refresh()
  }

  return <CourseEditorAssistant courseId={courseId} onEditComplete={handleEditComplete} />
}

