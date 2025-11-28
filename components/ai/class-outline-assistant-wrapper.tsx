'use client'

import { useRouter } from 'next/navigation'
import { ClassOutlineAssistant } from './class-outline-assistant'

interface ClassOutlineAssistantWrapperProps {
  classId: string
}

export function ClassOutlineAssistantWrapper({ classId }: ClassOutlineAssistantWrapperProps) {
  const router = useRouter()

  const handleOutlineSaved = () => {
    // Force a full page reload to show the updated state
    window.location.href = `/teacher/classes/${classId}`
  }

  return <ClassOutlineAssistant classId={classId} onOutlineSaved={handleOutlineSaved} />
}

