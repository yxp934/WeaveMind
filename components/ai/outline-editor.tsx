'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Lesson {
  title: string
  description?: string
  duration?: string
  topics?: string[]
}

interface Chapter {
  title: string
  description: string
  lessons: Lesson[]
}

interface OutlineEditorProps {
  initialChapters: Chapter[]
  onSave: (chapters: Chapter[]) => void
  onCancel: () => void
}

export function OutlineEditor({ initialChapters, onSave, onCancel }: OutlineEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters)
  const [editingNaturalLanguage, setEditingNaturalLanguage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDragStart = (e: React.DragEvent, chapterIndex: number, lessonIndex?: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ chapterIndex, lessonIndex }))
  }

  const handleDrop = (e: React.DragEvent, targetChapterIndex: number, targetLessonIndex?: number) => {
    e.preventDefault()
    const data = JSON.parse(e.dataTransfer.getData('text/plain'))
    
    // Implement drag-and-drop reordering logic here
    // This is a simplified version - full implementation would handle all cases
    console.log('Drag and drop:', data, 'to', { targetChapterIndex, targetLessonIndex })
  }

  const handleNaturalLanguageEdit = async () => {
    if (!editingNaturalLanguage.trim()) return
    
    setIsProcessing(true)
    try {
      const response = await fetch('/api/ai/edit-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapters,
          instruction: editingNaturalLanguage,
        }),
      })

      if (!response.ok) throw new Error('Failed to edit outline')

      const { chapters: updatedChapters } = await response.json()
      setChapters(updatedChapters)
      setEditingNaturalLanguage('')
    } catch (error) {
      console.error('Natural language edit error:', error)
      alert('Failed to process your edit. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>课程大纲 / Course Outline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chapters.map((chapter, chapterIndex) => (
            <div
              key={chapterIndex}
              className="border rounded-lg p-4 bg-white"
              draggable
              onDragStart={(e) => handleDragStart(e, chapterIndex)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, chapterIndex)}
            >
              <h3 className="font-bold text-lg mb-2">
                第 {chapterIndex + 1} 章: {chapter.title}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{chapter.description}</p>

              <div className="space-y-2 ml-4">
                {chapter.lessons && chapter.lessons.length > 0 ? chapter.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lessonIndex}
                    className="border-l-2 border-indigo-300 pl-3 py-2 bg-gray-50"
                    draggable
                    onDragStart={(e) => handleDragStart(e, chapterIndex, lessonIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, chapterIndex, lessonIndex)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{lesson.title}</p>
                        {lesson.description && (
                          <p className="text-xs text-gray-600 mt-1">{lesson.description}</p>
                        )}
                        {lesson.duration && (
                          <p className="text-xs text-gray-500 mt-1">时长: {lesson.duration}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 italic">No lessons defined yet</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自然语言编辑 / Natural Language Editing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              value={editingNaturalLanguage}
              onChange={(e) => setEditingNaturalLanguage(e.target.value)}
              placeholder="例如: 在第2章后添加一章关于函数的内容 / e.g., Add a chapter about functions after chapter 2"
              disabled={isProcessing}
            />
            <Button
              onClick={handleNaturalLanguageEdit}
              disabled={isProcessing || !editingNaturalLanguage.trim()}
              className="w-full"
            >
              {isProcessing ? '处理中... / Processing...' : '应用修改 / Apply Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-4">
        <Button onClick={() => onSave(chapters)} className="flex-1" size="lg">
          保存大纲 / Save Outline
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1" size="lg">
          取消 / Cancel
        </Button>
      </div>
    </div>
  )
}

