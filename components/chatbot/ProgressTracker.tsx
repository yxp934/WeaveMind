'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  User,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { WorkflowState } from '@/lib/store/chatbot-store';

interface ProgressTrackerProps {
  workflow: WorkflowState;
  showDetails?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

// 工作流步骤配置
const WORKFLOW_STEPS = {
  outline_generation: [
    { key: 'analyzing', label: '分析需求', description: '正在分析您的课程需求' },
    { key: 'generating_structure', label: '生成结构', description: '正在生成课程大纲结构' },
    { key: 'creating_content', label: '创建内容', description: '正在创建详细的课程内容' },
    { key: 'reviewing', label: '审核优化', description: '正在审核和优化生成的内容' },
    { key: 'finalizing', label: '完成', description: '正在保存最终的大纲' },
  ],
  a2a_session: [
    { key: 'initializing', label: '初始化', description: '正在初始化A2A会话' },
    { key: 'teacher_generation', label: '教师代理生成', description: '教师代理正在生成内容' },
    { key: 'student_feedback', label: '学生代理反馈', description: '学生代理正在提供反馈' },
    { key: 'refinement', label: '内容优化', description: '正在根据反馈优化内容' },
    { key: 'iterating', label: '迭代优化', description: '正在进行多轮迭代优化' },
    { key: 'finalizing', label: '完成', description: '正在保存最终结果' },
  ],
  course_editing: [
    { key: 'analyzing_changes', label: '分析变更', description: '正在分析编辑需求' },
    { key: 'applying_edits', label: '应用编辑', description: '正在应用编辑变更' },
    { key: 'validating', label: '验证', description: '正在验证编辑结果' },
    { key: 'saving', label: '保存', description: '正在保存修改' },
  ],
  general_chat: [
    { key: 'processing', label: '处理中', description: '正在处理您的请求' },
    { key: 'generating', label: '生成回复', description: '正在生成AI回复' },
    { key: 'finalizing', label: '完成', description: '正在完成回复' },
  ],
};

// 获取工作流类型显示名称
const getWorkflowTypeName = (type: WorkflowState['type']) => {
  const names = {
    outline_generation: '大纲生成',
    a2a_session: 'A2A会话优化',
    course_editing: '课程编辑',
    general_chat: '一般对话',
  };
  return names[type] || type;
};

// 获取步骤状态
const getStepStatus = (workflow: WorkflowState, stepKey: string, currentStep: string, progress: number, isCompleted: boolean) => {
  const stepOrder = Object.keys(WORKFLOW_STEPS[workflow.type] || {});
  const currentIndex = stepOrder.indexOf(currentStep);
  const stepIndex = stepOrder.indexOf(stepKey);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
};

export function ProgressTracker({
  workflow,
  showDetails = true,
  onPause,
  onResume,
  onCancel
}: ProgressTrackerProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const steps = WORKFLOW_STEPS[workflow.type] || [];
  const isCompleted = workflow.status === 'completed';
  const isError = workflow.status === 'error';
  const isRunning = workflow.status === 'running';

  // 计算当前步骤
  const getCurrentStepIndex = () => {
    if (isCompleted) return steps.length - 1;
    if (isError) return Math.floor((workflow.progress / 100) * steps.length);
    return Math.floor((workflow.progress / 100) * steps.length);
  };

  const currentStepIndex = getCurrentStepIndex();

  // 获取状态图标
  const getStatusIcon = (status: 'completed' | 'active' | 'pending' | 'error') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: 'completed' | 'active' | 'pending' | 'error') => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {workflow.type === 'a2a_session' ? (
              <User className="w-3 h-3 text-white" />
            ) : (
              <GraduationCap className="w-3 h-3 text-white" />
            )}
          </div>
          <h3 className="font-semibold text-sm text-gray-900">
            {getWorkflowTypeName(workflow.type)}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isCompleted ? 'bg-green-100 text-green-800 border-green-200' :
              isError ? 'bg-red-100 text-red-800 border-red-200' :
              'bg-blue-100 text-blue-800 border-blue-200'
            )}
          >
            {isCompleted ? '已完成' :
             isError ? '错误' :
             isRunning ? '运行中' : '等待中'}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {isRunning && (
            <>
              {onPause && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPause}
                  className="h-6 w-6 p-0"
                >
                  <Pause className="w-3 h-3" />
                </Button>
              )}
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-6 w-6 p-0"
                >
                  <Square className="w-3 h-3" />
                </Button>
              )}
            </>
          )}

          {showDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">
            进度: {workflow.currentStep}
          </span>
          <span className="text-xs text-gray-600">
            {Math.round(workflow.progress)}%
          </span>
        </div>
        <Progress
          value={workflow.progress}
          className="h-2"
        />
      </div>

      {/* 详细信息 */}
      <AnimatePresence>
        {showDetails && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-3 bg-white/80 backdrop-blur-sm">
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const status = getStepStatus(
                    workflow,
                    step.key,
                    workflow.currentStep,
                    workflow.progress,
                    isCompleted
                  );

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-lg transition-all",
                        status === 'active' && "bg-blue-50 border border-blue-200",
                        status === 'completed' && "bg-green-50",
                      )}
                    >
                      <div className="flex-shrink-0">
                        {getStatusIcon(status)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-sm font-medium",
                            status === 'completed' ? 'text-green-800' :
                            status === 'active' ? 'text-blue-800' :
                            status === 'error' ? 'text-red-800' :
                            'text-gray-600'
                          )}>
                            {step.label}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getStatusColor(status))}
                          >
                            {status === 'completed' ? '已完成' :
                             status === 'active' ? '进行中' :
                             status === 'error' ? '错误' :
                             '等待中'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {step.description}
                        </p>
                      </div>

                      {status === 'active' && isRunning && (
                        <div className="flex-shrink-0">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 时间信息 */}
              {workflow.startTime && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      开始时间: {workflow.startTime.toLocaleTimeString()}
                    </span>
                    {workflow.endTime && (
                      <span>
                        耗时: {Math.round(
                          (workflow.endTime.getTime() - workflow.startTime.getTime()) / 1000
                        )}秒
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误信息 */}
      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3"
          >
            <Card className="p-3 bg-red-50 border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">
                  工作流执行出错
                </span>
              </div>
              {workflow.data?.error && (
                <p className="text-xs text-red-700 mt-1">
                  {workflow.data.error}
                </p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完成信息 */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3"
          >
            <Card className="p-3 bg-green-50 border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  工作流已完成
                </span>
              </div>
              {workflow.endTime && workflow.startTime && (
                <p className="text-xs text-green-700 mt-1">
                  总耗时: {Math.round(
                    (workflow.endTime.getTime() - workflow.startTime.getTime()) / 1000
                  )}秒
                </p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProgressTracker;