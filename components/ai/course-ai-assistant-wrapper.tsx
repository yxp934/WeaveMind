'use client'

import { useRouter } from 'next/navigation'
import { CourseAIAssistant } from './course-ai-assistant'

interface CourseAIAssistantWrapperProps {
  courseId: string
}

export function CourseAIAssistantWrapper({ courseId }: CourseAIAssistantWrapperProps) {
  const router = useRouter()

  const handleOutlineSaved = () => {
    // Refresh the page to show the AI Generation Panel
    router.refresh()
  }

  return <CourseAIAssistant courseId={courseId} onOutlineSaved={handleOutlineSaved} />
}

