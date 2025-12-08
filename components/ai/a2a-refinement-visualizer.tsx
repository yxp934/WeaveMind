'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  User,
  GraduationCap,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Bot,
  MessageSquare,
  Target,
  Clock,
  TrendingUp,
  Award,
  Play,
  Pause,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface A2AIteration {
  iteration: number
  teacherContent: any[]
  studentFeedback: {
    overall_score: number
    clarity_score: number
    engagement_score: number
    relevance_score: number
    difficulty_score: number
    overall_feedback: string
    specific_feedback: string[]
  } | null
  teacherRawResponse?: string
  studentRawResponse?: string
  status: 'pending' | 'running' | 'completed' | 'error'
  duration?: number
}

interface A2ARefinementVisualizerProps {
  isActive: boolean
  currentIteration: number
  totalIterations: number
  currentAgent: 'teacher' | 'student' | null
  currentActivity: string
  iterations: A2AIteration[]
  workflowData?: any
  onComplete?: (finalComponents: any[]) => void
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

export function A2ARefinementVisualizer({
  isActive,
  currentIteration,
  totalIterations,
  currentAgent,
  currentActivity,
  iterations,
  workflowData,
  onComplete,
  onPause,
  onResume,
  onCancel
}: A2ARefinementVisualizerProps) {
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set())
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleIteration = (iteration: number) => {
    const newExpanded = new Set(expandedIterations)
    if (newExpanded.has(iteration)) {
      newExpanded.delete(iteration)
    } else {
      newExpanded.add(iteration)
    }
    setExpandedIterations(newExpanded)
  }

  // 计算统计数据
  const completedIterations = iterations.filter(iter => iter.status === 'completed').length
  const averageScore = iterations.length > 0
    ? iterations.reduce((sum, iter) => sum + (iter.studentFeedback?.overall_score || 0), 0) / iterations.length
    : 0
  const totalDuration = iterations.reduce((sum, iter) => sum + (iter.duration || 0), 0)

  // 获取代理图标
  const getAgentIcon = (agent: 'teacher' | 'student' | null) => {
    switch (agent) {
      case 'teacher':
        return <Bot className="w-5 h-5 text-blue-600" />
      case 'student':
        return <GraduationCap className="w-5 h-5 text-green-600" />
      default:
        return <User className="w-5 h-5 text-gray-600" />
    }
  }

  // 获取代理颜色
  const getAgentColor = (agent: 'teacher' | 'student' | null) => {
    switch (agent) {
      case 'teacher':
        return 'bg-blue-100 border-blue-200'
      case 'student':
        return 'bg-green-100 border-green-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  if (!isActive && iterations.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* A2A会话头部信息 */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">A2A会话优化</h3>
            {isActive && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                运行中
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* 进度信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{currentIteration}/{totalIterations}</div>
            <div className="text-xs text-gray-600">当前轮次</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{completedIterations}</div>
            <div className="text-xs text-gray-600">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{averageScore.toFixed(1)}</div>
            <div className="text-xs text-gray-600">平均评分</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{Math.round(totalDuration)}s</div>
            <div className="text-xs text-gray-600">总用时</div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">整体进度</span>
            <span className="text-gray-600">{Math.round((currentIteration / totalIterations) * 100)}%</span>
          </div>
          <Progress value={(currentIteration / totalIterations) * 100} className="h-2" />
        </div>

        {/* 当前活动 */}
        {currentAgent && (
          <div className={cn(
            "flex items-center space-x-3 p-3 rounded-lg border",
            getAgentColor(currentAgent)
          )}>
            <div className="flex-shrink-0">
              {getAgentIcon(currentAgent)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {currentAgent === 'teacher' ? '教师代理' : '学生代理'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {currentAgent === 'teacher' ? '内容生成' : '提供反馈'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">{currentActivity}</p>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex items-center justify-end space-x-2 mt-3">
          {onPause && (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="w-3 h-3 mr-1" />
              暂停
            </Button>
          )}
          {onResume && (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="w-3 h-3 mr-1" />
              继续
            </Button>
          )}
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <Square className="w-3 h-3 mr-1" />
              取消
            </Button>
          )}
        </div>
      </Card>

      {/* 迭代详情 */}
      <AnimatePresence>
        {isExpanded && iterations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                迭代详情
              </h4>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {iterations.map((iteration, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">第 {iteration.iteration} 轮</span>
                          {iteration.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {iteration.status === 'running' && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleIteration(iteration.iteration)}
                        >
                          {expandedIterations.has(iteration.iteration) ?
                            <ChevronUp className="w-3 h-3" /> :
                            <ChevronDown className="w-3 h-3" />
                          }
                        </Button>
                      </div>

                      {/* 快速信息 */}
                      <div className="flex items-center space-x-2 mb-2">
                        {iteration.studentFeedback && (
                          <Badge variant="outline" className="text-xs">
                            评分: {iteration.studentFeedback.overall_score.toFixed(1)}/10
                          </Badge>
                        )}
                        {iteration.duration && (
                          <span className="text-xs text-gray-500">
                            用时: {Math.round(iteration.duration)}秒
                          </span>
                        )}
                      </div>

                      {/* 展开的详细信息 */}
                      <AnimatePresence>
                        {expandedIterations.has(iteration.iteration) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            {iteration.studentFeedback && (
                              <div className="bg-gray-50 p-3 rounded">
                                <h5 className="font-medium text-sm mb-2">学生反馈</h5>
                                <p className="text-sm text-gray-600 mb-2">
                                  {iteration.studentFeedback.overall_feedback}
                                </p>
                                {iteration.studentFeedback.specific_feedback.length > 0 && (
                                  <ul className="text-xs text-gray-500 space-y-1">
                                    {iteration.studentFeedback.specific_feedback.map((feedback, i) => (
                                      <li key={i} className="flex items-start space-x-1">
                                        <span className="text-blue-500 mt-1">•</span>
                                        <span>{feedback}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default A2ARefinementVisualizer