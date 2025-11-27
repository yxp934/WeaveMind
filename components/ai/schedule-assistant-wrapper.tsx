'use client'

import { useRouter } from 'next/navigation'
import { ScheduleChat } from './schedule-chat'

interface ScheduleAssistantWrapperProps {
  courseId: string
}

export function ScheduleAssistantWrapper({ courseId }: ScheduleAssistantWrapperProps) {
  const router = useRouter()

  const handleScheduleGenerated = () => {
    // Refresh the page to show the new schedule
    router.refresh()
  }

  return (
    <ScheduleChat 
      courseId={courseId} 
      onScheduleGenerated={handleScheduleGenerated}
    />
  )
}

