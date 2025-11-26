'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface CourseEditorAssistantProps {
  courseId: string
  onEditComplete?: () => void
}

interface ToolCall {
  toolName: string
  args: any
}

interface ToolResult {
  toolName: string
  result: any
}

export function CourseEditorAssistant({ courseId, onEditComplete }: CourseEditorAssistantProps) {
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([])
  const [toolResults, setToolResults] = useState<ToolResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instruction.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setToolCalls([])
    setToolResults([])

    try {
      const res = await fetch('/api/ai/course-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          instruction: instruction.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to process instruction')
      }

      const data = await res.json()
      setResponse(data.response)
      setToolCalls(data.toolCalls || [])
      setToolResults(data.toolResults || [])
      setShowPreview(true)

      if (onEditComplete) {
        onEditComplete()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setInstruction('')
    setResponse(null)
    setToolCalls([])
    setToolResults([])
    setError(null)
    setShowPreview(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 课程编辑助手 / AI Course Editor</CardTitle>
        <CardDescription>
          使用自然语言指令编辑课程内容，AI 将安全地执行您的编辑操作
          <br />
          Use natural language to edit course content. AI will safely execute your editing operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              编辑指令 / Editing Instruction
            </label>
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="例如：在所有章节中为机器学习概念添加具体示例 / e.g., Add concrete examples for machine learning concept in all chapters"
              disabled={loading}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !instruction.trim()}>
              {loading ? '处理中... / Processing...' : '执行编辑 / Execute Edit'}
            </Button>
            {(response || error) && (
              <Button type="button" variant="outline" onClick={handleClear}>
                清除 / Clear
              </Button>
            )}
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>错误 / Error:</strong> {error}
            </p>
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">AI 响应 / AI Response:</h3>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{response}</p>
            </div>

            {toolCalls.length > 0 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">
                  执行的操作 / Operations Executed ({toolCalls.length}):
                </h3>
                <div className="space-y-2">
                  {toolCalls.map((call, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-gray-700">{call.toolName}</span>
                      <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                        {JSON.stringify(call.args, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {toolResults.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  操作结果 / Operation Results:
                </h3>
                <div className="space-y-2">
                  {toolResults.map((result, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium text-green-700">{result.toolName}:</span>
                      <p className="text-green-800 mt-1">
                        {result.result.success ? '✓ ' : '✗ '}
                        {result.result.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

