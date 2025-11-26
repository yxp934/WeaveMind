'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

type RunSummary = {
  id: string
  status: string
  total_chapters: number | null
  completed_chapters: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

type DialogueTurn = { role: 'builder' | 'critic'; turn: number; content: string }

type ChapterResult = {
  id: string
  chapter_id: string
  status: string
  iterations_used: number
  builder_critic_dialogue: DialogueTurn[]
  proposed_components: any[]
  error_message: string | null
  chapter?: { id: string; title: string; order_index: number; description: string | null }
}

interface AIGenerationPanelProps {
  courseId: string
  hasOutline: boolean
}

export function AIGenerationPanel({ courseId, hasOutline }: AIGenerationPanelProps) {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ run: any; chapterResults: ChapterResult[] } | null>(null)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [starting, setStarting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = async () => {
    try {
      setLoadingRuns(true)
      setError(null)
      const res = await fetch(`/api/ai/generation-runs?courseId=${courseId}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load AI generation runs')
      }
      const newRuns: RunSummary[] = data?.runs || []
      setRuns(newRuns)
      if (!selectedRunId && newRuns.length > 0) {
        setSelectedRunId(newRuns[0].id)
      }
    } catch (e: any) {
      setError(e.message || 'Error loading AI generation runs')
    } finally {
      setLoadingRuns(false)
    }
  }

  const fetchDetail = async (runId: string) => {
    try {
      setLoadingDetail(true)
      setError(null)
      const res = await fetch(`/api/ai/generation-runs/${runId}`)
      if (!res.ok) throw new Error('Failed to load run detail')
      const data = await res.json()
      setDetail({ run: data.run, chapterResults: data.chapterResults || [] })
    } catch (e: any) {
      setError(e.message || 'Error loading run detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleStart = async () => {
    if (!hasOutline) {
      setError('AI 内容生成需要已保存的课程大纲。请先在“AI 课程助手”中生成并保存大纲。')
      return
    }
    try {
      setStarting(true)
      setError(null)
      const res = await fetch('/api/ai/generation-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to start AI generation')
      }
      const data = await res.json()
      const run: RunSummary = data.run
      setRuns(prev => [run, ...prev])
      setSelectedRunId(run.id)
      await fetchDetail(run.id)
    } catch (e: any) {
      setError(e.message || 'Error starting AI generation')
    } finally {
      setStarting(false)
    }
  }

  const handleAccept = async () => {
    if (!selectedRunId) return
    try {
      setAccepting(true)
      setError(null)
      const res = await fetch(`/api/ai/generation-runs/${selectedRunId}/accept`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to accept AI generation')
      }
      await fetchRuns()
      await fetchDetail(selectedRunId)
    } catch (e: any) {
      setError(e.message || 'Error accepting AI generation')
    } finally {
      setAccepting(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [courseId])

  const selectedRun = runs.find(r => r.id === selectedRunId) || runs[0] || null

  useEffect(() => {
    if (selectedRun && (!detail || detail.run.id !== selectedRun.id)) {
      fetchDetail(selectedRun.id)
    }
  }, [selectedRun?.id])

  const renderStatusBadge = (status: string) => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium'
    const map: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      discarded: 'bg-gray-200 text-gray-700',
    }
    return <span className={`${base} ${map[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>AI 章节内容生成 / AI Chapter Content Generation</CardTitle>
        <CardDescription>
          使用 Builder + Critic 双智能体为每一章生成可用的组件级内容，然后在接受前进行审阅。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasOutline && (
          <p className="mb-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
            当前课程没有已保存的 AI 课程大纲。请先通过“AI 课程助手”生成并保存大纲，然后再启动内容生成。
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Button
                className="h-8 px-3 text-xs"
                onClick={handleStart}
                disabled={starting || !hasOutline}
              >
                {starting ? '生成中...' : '开始 AI 内容生成'}
              </Button>
              <Button
                className="h-8 px-3 text-xs"
                variant="outline"
                onClick={fetchRuns}
                disabled={loadingRuns}
              >
                刷新
              </Button>
            </div>
            {runs.length === 0 && !loadingRuns && (
              <p className="text-sm text-gray-500">尚未有生成记录。</p>
            )}
            {loadingRuns && <p className="text-sm text-gray-500">加载中...</p>}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full text-left border rounded px-3 py-2 text-sm hover:bg-gray-50 ${
                    selectedRun && selectedRun.id === run.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                    {renderStatusBadge(run.status)}
                  </div>
                  <p className="text-xs text-gray-600">
                    进度: {run.completed_chapters ?? 0} / {run.total_chapters ?? 0}
                  </p>
                  {run.error_message && (
                    <p className="mt-1 text-xs text-red-600 truncate">{run.error_message}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="md:flex-1 border rounded p-3 bg-gray-50 min-h-[180px]">
            {loadingDetail && <p className="text-sm text-gray-500">加载详情...</p>}
            {!loadingDetail && (!detail || !selectedRun) && (
              <p className="text-sm text-gray-500">选择左侧的一次生成以查看每章的 Builder / Critic 对话和结果。</p>
            )}
            {!loadingDetail && detail && selectedRun && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">运行状态: {renderStatusBadge(detail.run.status)}</p>
                    <p className="text-xs text-gray-600">
                      章节进度: {detail.run.completed_chapters ?? 0} / {detail.run.total_chapters ?? 0}
                    </p>
                  </div>
                  <Button
                    className="h-8 px-3 text-xs"
                    onClick={handleAccept}
                    disabled={accepting || detail.run.status !== 'completed'}
                  >
                    {accepting ? '写入中...' : '接受 AI 内容并写入课程'}
                  </Button>
                </div>
                {detail.chapterResults.map(result => (
                  <div key={result.id} className="border rounded bg-white p-2">
                    <div className="flex items-center justify-between mb-1">
                      {(() => {
                        const orderIndex =
                          typeof result.chapter?.order_index === 'number'
                            ? result.chapter.order_index + 1
                            : null
                        const title = result.chapter?.title || '未命名章节'
                        return (
                          <p className="text-sm font-medium">
                            第 {orderIndex ?? '?'} 章: {title}
                          </p>
                        )
                      })()}
                      {renderStatusBadge(result.status)}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      迭代次数: {result.iterations_used}
                    </p>
                    {result.error_message && (
                      <p className="text-xs text-red-600 mb-1">{result.error_message}</p>
                    )}
                    {Array.isArray(result.builder_critic_dialogue) && result.builder_critic_dialogue.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-indigo-600">
                          查看 Builder / Critic 对话
                        </summary>
                        <div className="mt-1 space-y-1">
                          {result.builder_critic_dialogue.map((turn, idx) => {
                            let parsed: any = null
                            try {
                              parsed = JSON.parse(turn.content)
                            } catch {}
                            return (
                              <div key={idx} className="border rounded bg-gray-50 p-1">
                                <p className="text-[10px] font-semibold mb-0.5">
                                  {turn.role === 'builder' ? 'Builder' : 'Critic'} 回合 {turn.turn}
                                </p>
                                <pre className="text-[10px] whitespace-pre-wrap">
                                  {parsed ? JSON.stringify(parsed, null, 2) : turn.content}
                                </pre>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-gray-500">
          安全提示：AI 生成内容仅作为草稿，请在发布前逐章检查并适当修改，避免泄露敏感信息或出现事实性错误。
        </p>
      </CardFooter>
    </Card>
  )
}

