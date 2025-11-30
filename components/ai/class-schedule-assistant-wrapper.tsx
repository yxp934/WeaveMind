'use client'

import { useRouter } from 'next/navigation'
import { ScheduleChat } from './schedule-chat'

interface ClassScheduleAssistantWrapperProps {
  classId: string
}

export function ClassScheduleAssistantWrapper({ classId }: ClassScheduleAssistantWrapperProps) {
  const router = useRouter()

  const handleScheduleGenerated = () => {
    // Refresh the page to show the newly generated schedule
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          🤖 AI Schedule Assistant
        </h3>
        <p className="text-sm text-gray-600">
          Describe your class schedule requirements and I&apos;ll generate a structured schedule for you.
        </p>
      </div>
      <ScheduleChat
        entityId={classId}
        entityType="class"
        apiEndpoint="/api/ai/generate-class-schedule"
        onScheduleGenerated={handleScheduleGenerated}
      />
    </div>
  )
}

