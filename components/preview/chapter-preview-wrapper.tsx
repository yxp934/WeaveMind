'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { SessionPreviewModal } from './session-preview-modal'

interface Component {
  id: string
  type: string
  content: any
  order_index: number
}

interface ChapterPreviewWrapperProps {
  chapterTitle: string
  chapterDescription: string | null
  components: Component[]
}

export function ChapterPreviewWrapper({
  chapterTitle,
  chapterDescription,
  components
}: ChapterPreviewWrapperProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsPreviewOpen(true)}
        className="flex items-center gap-2"
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>

      <SessionPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        chapterTitle={chapterTitle}
        chapterDescription={chapterDescription}
        components={components}
      />
    </>
  )
}

