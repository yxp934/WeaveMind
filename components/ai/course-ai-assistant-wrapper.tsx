'use client'

import { useRouter } from 'next/navigation'
import { CourseAIAssistant } from './course-ai-assistant'

interface CourseAIAssistantWrapperProps {
  courseId: string
}

export function CourseAIAssistantWrapper({ courseId }: CourseAIAssistantWrapperProps) {
  const router = useRouter()

  const handleOutlineSaved = () => {
    // Force a full page reload by navigating to the same URL
    // This ensures the AI Generation Panel appears after outline is saved
    window.location.href = `/teacher/courses/${courseId}`
  }

  return <CourseAIAssistant courseId={courseId} onOutlineSaved={handleOutlineSaved} />
}

