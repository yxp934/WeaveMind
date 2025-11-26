'use client'

import { useState } from 'react'
import { CourseChat } from '@/components/ai/course-chat'
import { OutlineEditor } from '@/components/ai/outline-editor'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface CourseAIAssistantProps {
  courseId: string
  onOutlineSaved: () => void
}

export function CourseAIAssistant({ courseId, onOutlineSaved }: CourseAIAssistantProps) {
  const [step, setStep] = useState<'chat' | 'outline' | 'generating'>('chat')
  const [requirements, setRequirements] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])

  const handleRequirementsComplete = async (reqs: any) => {
    setRequirements(reqs)
    setStep('generating')

    try {
      const response = await fetch('/api/ai/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: reqs }),
      })

      if (!response.ok) throw new Error('Failed to generate outline')

      const { chapters: generatedChapters } = await response.json()
      setChapters(generatedChapters)
      setStep('outline')
    } catch (error) {
      console.error('Outline generation error:', error)
      alert('Failed to generate outline. Please try again.')
      setStep('chat')
    }
  }

  const handleSaveOutline = async (finalChapters: any[]) => {
    try {
      // Save outline to existing course
      const response = await fetch('/api/courses/save-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          requirements,
          chapters: finalChapters,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save outline')
      }

      alert(`课程大纲保存成功！/ Course outline saved successfully!`)
      onOutlineSaved()
    } catch (error: any) {
      console.error('Save error:', error)
      alert(`保存失败：${error.message} / Save failed: ${error.message}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 课程助手 / AI Course Assistant</CardTitle>
        <CardDescription>
          通过与AI对话生成课程大纲，然后启动章节内容生成 / Generate course outline through AI conversation, then start chapter content generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'chat' && (
          <div>
            <CourseChat onRequirementsComplete={handleRequirementsComplete} />
          </div>
        )}

        {step === 'generating' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在生成课程大纲... / Generating course outline...</p>
          </div>
        )}

        {step === 'outline' && (
          <div>
            <OutlineEditor
              initialChapters={chapters}
              onSave={handleSaveOutline}
              onCancel={() => setStep('chat')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

