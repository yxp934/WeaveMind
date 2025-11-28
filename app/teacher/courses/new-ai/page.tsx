'use client'

import { useState } from 'react'
import { CourseChat } from '@/components/ai/course-chat'
import { OutlineEditor } from '@/components/ai/outline-editor'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewAICoursePage() {
  const router = useRouter()
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
      const response = await fetch('/api/courses/create-from-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          chapters: finalChapters,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save course')
      }

      const { course } = await response.json()
      alert(`课程创建成功！/ Course created successfully!`)
      router.push(`/teacher/courses/${course.id}`)
    } catch (error: any) {
      console.error('Save error:', error)
      alert(`保存失败：${error.message} / Save failed: ${error.message}`)
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
      router.push('/teacher/courses')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/teacher">
                <h1 className="text-2xl font-bold text-indigo-600">WeaveMind</h1>
              </Link>
              <span className="text-sm text-gray-500">AI Course Creator</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/teacher/courses">
                <Button variant="ghost">返回课程列表 / Back to Courses</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Deprecation Notice */}
        <div className="mb-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 text-xl mb-3">
            ⚠️ 功能已迁移 / Feature Migrated
          </h3>
          <p className="text-yellow-700 mb-4">
            AI课程生成功能已迁移到班级层级，提供更完整的工作流程。/
            AI course generation has been migrated to the class level for a more complete workflow.
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-800 mb-2">新的工作流程 / New Workflow:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>在班级页面生成课程表 / Generate class schedule on class page</li>
              <li>创建课程大纲 / Create course outline</li>
              <li>为每个课时生成详细内容 / Generate detailed content for each session</li>
            </ol>
          </div>
          <div className="flex gap-4">
            <Link href="/teacher/classes">
              <Button className="bg-yellow-600 hover:bg-yellow-700">
                前往班级列表 / Go to Classes
              </Button>
            </Link>
            <Link href="/teacher">
              <Button variant="outline">
                返回主页 / Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-8 opacity-50 pointer-events-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            创建AI辅助课程 / Create AI-Assisted Course (已弃用 / Deprecated)
          </h2>
          <p className="text-gray-600">
            {step === 'chat' && '通过与AI对话，快速生成课程大纲 / Generate course outline through AI conversation'}
            {step === 'generating' && '正在生成课程大纲... / Generating course outline...'}
            {step === 'outline' && '编辑和完善课程大纲 / Edit and refine course outline'}
          </p>
        </div>

        {step === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <CourseChat onRequirementsComplete={handleRequirementsComplete} />
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">💡 提示 / Tips</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• 清楚地描述你的课程目标和受众 / Clearly describe your course goals and audience</li>
                  <li>• 提供课程时长和教学风格的信息 / Provide information about duration and teaching style</li>
                  <li>• 列出你想涵盖的主要主题 / List the main topics you want to cover</li>
                  <li>• AI会根据你的回答生成结构化的课程大纲 / AI will generate a structured outline based on your responses</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-lg text-gray-600">正在生成课程大纲... / Generating course outline...</p>
          </div>
        )}

        {step === 'outline' && (
          <OutlineEditor
            initialChapters={chapters}
            onSave={handleSaveOutline}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  )
}
