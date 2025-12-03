'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileQuestion,
  PenTool,
  Search,
  ArrowRight,
  Sparkles,
  BookOpen,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'

interface AssignmentTypeSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  className: string
}

export function AssignmentTypeSelectorDialog({
  open,
  onOpenChange,
  classId,
  className,
}: AssignmentTypeSelectorDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const assignmentTypes = [
    {
      id: 'session-based',
      title: 'Session-Based Generation',
      description: '基于现有session，使用AI自动生成多种题型的assignment',
      icon: Sparkles,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      iconColor: 'text-blue-600',
      features: [
        'AI自动生成题目',
        '多种题型支持 (选择、填空、代码、配对)',
        '基于已有session内容',
        '教师可预览和调整',
      ],
    },
    {
      id: 'writing',
      title: 'Writing Assignment',
      description: '创建写作作业，支持富文本编辑和格式设置',
      icon: PenTool,
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      iconColor: 'text-green-600',
      features: [
        '富文本编辑器',
        '字数限制设置',
        '复制黏贴追踪',
        '格式要求设置',
      ],
    },
    {
      id: 'research',
      title: 'Research Assignment',
      description: '创建研究作业，提供AI辅助对话功能',
      icon: Search,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      iconColor: 'text-purple-600',
      features: [
        'AI对话助手',
        '研究指导',
        '对话历史记录',
        '研究笔记整理',
      ],
    },
  ]

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId)
    // Navigate to the appropriate creation page
    const baseUrl = `/teacher/classes/${classId}/assignments`
    const urls: Record<string, string> = {
      'session-based': `${baseUrl}/new/session-based`,
      'writing': `${baseUrl}/new/writing`,
      'research': `${baseUrl}/new/research`,
    }
    window.location.href = urls[typeId]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileQuestion className="h-6 w-6 text-indigo-600" />
            Create New Assignment
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose the type of assignment you want to create for {className}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {assignmentTypes.map((type) => {
            const Icon = type.icon
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all duration-200 ${type.color} border-2`}
                onClick={() => handleTypeSelect(type.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 rounded-lg ${type.color} border`}>
                      <Icon className={`h-6 w-6 ${type.iconColor}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">
                    {type.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {type.description}
                  </p>
                  <div className="space-y-2">
                    {type.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            Quick Guide
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">Session-Based</strong>
              <p>Best for: 自动生成quiz-style questions based on session content</p>
            </div>
            <div>
              <strong className="text-gray-900">Writing</strong>
              <p>Best for: 短文、论文、报告等写作任务</p>
            </div>
            <div>
              <strong className="text-gray-900">Research</strong>
              <p>Best for: 需要研究和AI辅助的研究性作业</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
