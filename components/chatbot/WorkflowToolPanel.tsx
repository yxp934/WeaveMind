'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Settings,
  Zap,
  Bot,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Users,
  FileText,
  Target,
  Clock,
  CheckCircle,
  X,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useChatbotStore, AITool } from '@/lib/store/chatbot-store';
import OutlineGenerator from './OutlineGenerator';
import A2ASessionGenerator from './A2ASessionGenerator';

interface WorkflowToolPanelProps {
  userRole: 'teacher' | 'student' | 'self-learner';
  classId?: string;
  courseId?: string;
  tools: AITool[];
  onClose?: () => void;
}

// 图标映射
const iconMap = {
  Sparkles,
  Settings,
  Zap,
  Bot,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Users,
  FileText,
  Target,
  Clock,
};

// 获取类别颜色
const getCategoryColor = (category: string) => {
  const colors = {
    course: 'bg-blue-100 text-blue-800 border-blue-200',
    discussion: 'bg-green-100 text-green-800 border-green-200',
    assessment: 'bg-purple-100 text-purple-800 border-purple-200',
    progress: 'bg-orange-100 text-orange-800 border-orange-200',
    communication: 'bg-pink-100 text-pink-800 border-pink-200',
    analysis: 'bg-gray-100 text-gray-800 border-gray-200',
    workflow: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };
  return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// 按类别分组工具
const groupToolsByCategory = (tools: AITool[]) => {
  const grouped = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, AITool[]>);

  return grouped;
};

export function WorkflowToolPanel({
  userRole,
  classId,
  courseId,
  tools,
  onClose
}: WorkflowToolPanelProps) {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [showGenerator, setShowGenerator] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { startWorkflow, callTool, workflow } = useChatbotStore();

  // 过滤工具
  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 分组工具
  const groupedTools = groupToolsByCategory(filteredTools);

  // 处理工具调用
  const handleToolCall = async (tool: AITool) => {
    if (tool.id === 'outline_generator') {
      setShowGenerator('outline');
      return;
    }

    if (tool.id === 'a2a_session') {
      setShowGenerator('a2a');
      return;
    }

    // 直接调用工具
    try {
      await callTool(tool.id, {
        userRole,
        classId,
        courseId,
      });
    } catch (error) {
      console.error('工具调用失败:', error);
    }
  };

  // 处理大纲生成完成
  const handleOutlineComplete = (outlineData: any) => {
    setShowGenerator(null);
    startWorkflow('outline_generation', outlineData);
  };

  // 处理A2A会话完成
  const handleA2AComplete = (sessionData: any) => {
    setShowGenerator(null);
    startWorkflow('a2a_session', sessionData);
  };

  // 如果显示生成器组件
  if (showGenerator === 'outline') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">大纲生成器</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGenerator(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <OutlineGenerator
          userRole={userRole}
          classId={classId}
          courseId={courseId}
          onComplete={handleOutlineComplete}
          onCancel={() => setShowGenerator(null)}
        />
      </div>
    );
  }

  if (showGenerator === 'a2a') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">A2A会话生成器</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGenerator(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <A2ASessionGenerator
          userRole={userRole}
          classId={classId}
          courseId={courseId}
          onComplete={handleA2AComplete}
          onCancel={() => setShowGenerator(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">工作流工具</h3>
        <div className="flex items-center space-x-2">
          {workflow && (
            <Badge variant="outline" className="text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse" />
              运行中
            </Badge>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <Input
          placeholder="搜索工具..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* 工具分类标签 */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="workflow">工作流</TabsTrigger>
          <TabsTrigger value="course">课程</TabsTrigger>
          <TabsTrigger value="other">其他</TabsTrigger>
        </TabsList>

        {/* 全部工具 */}
        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {Object.entries(groupedTools).map(([category, categoryTools]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {categoryTools.map(tool => (
                      <ToolCard
                        key={tool.id}
                        tool={tool}
                        onClick={() => handleToolCall(tool)}
                        isRunning={workflow?.id === tool.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 工作流工具 */}
        <TabsContent value="workflow" className="mt-4">
          <ScrollArea className="h-64">
            <div className="grid grid-cols-1 gap-2">
              {groupedTools.workflow?.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleToolCall(tool)}
                  isRunning={workflow?.id === tool.id}
                />
              )) || (
                <p className="text-sm text-gray-500 text-center py-4">
                  暂无可用的工作流工具
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 课程工具 */}
        <TabsContent value="course" className="mt-4">
          <ScrollArea className="h-64">
            <div className="grid grid-cols-1 gap-2">
              {groupedTools.course?.map(tool => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleToolCall(tool)}
                  isRunning={workflow?.id === tool.id}
                />
              )) || (
                <p className="text-sm text-gray-500 text-center py-4">
                  暂无可用的课程工具
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 其他工具 */}
        <TabsContent value="other" className="mt-4">
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {Object.entries(groupedTools)
                .filter(([category]) => !['workflow', 'course'].includes(category))
                .map(([category, categoryTools]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {categoryTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          onClick={() => handleToolCall(tool)}
                          isRunning={workflow?.id === tool.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 工具卡片组件
interface ToolCardProps {
  tool: AITool;
  onClick: () => void;
  isRunning?: boolean;
}

function ToolCard({ tool, onClick, isRunning }: ToolCardProps) {
  const IconComponent = iconMap[tool.icon as keyof typeof iconMap] || Bot;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          "p-3 cursor-pointer transition-all duration-200 hover:shadow-md",
          isRunning && "ring-2 ring-blue-500 bg-blue-50"
        )}
        onClick={onClick}
      >
        <div className="flex items-start space-x-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            getCategoryColor(tool.category).split(' ')[0]
          )}>
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {tool.name}
              </h4>
              {tool.requiresContext && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  需要上下文
                </Badge>
              )}
              {tool.maxIterations && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  最多{tool.maxIterations}次迭代
                </Badge>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {tool.description}
            </p>

            <div className="flex items-center justify-between mt-2">
              <Badge
                variant="secondary"
                className={cn("text-xs", getCategoryColor(tool.category))}
              >
                {tool.category}
              </Badge>

              {isRunning ? (
                <div className="flex items-center space-x-1 text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-xs">运行中</span>
                </div>
              ) : (
                <Play className="w-3 h-3 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default WorkflowToolPanel;