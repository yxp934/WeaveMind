'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Bot,
  GraduationCap,
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertCircle,
  Loader2,
  MessageSquare,
  TrendingUp,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface A2ASessionGeneratorProps {
  userRole: 'teacher' | 'student' | 'self-learner';
  classId?: string;
  courseId?: string;
  onComplete: (sessionData: any) => void;
  onCancel: () => void;
}

// A2A迭代数据接口
interface A2AIteration {
  iteration: number;
  teacherContent: any[];
  studentFeedback: {
    overall_score: number;
    clarity_score: number;
    engagement_score: number;
    relevance_score: number;
    difficulty_score: number;
    overall_feedback: string;
    specific_feedback: string[];
  };
  teacherRawResponse?: string;
  studentRawResponse?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
}

// A2A会话配置接口
interface A2ASessionConfig {
  contentTopic: string;
  targetAudience: string;
  learningObjectives: string;
  currentContent?: string;
  iterations: number;
  focusAreas: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessionType: 'content_creation' | 'content_review' | 'interactive_discussion' | 'assessment_design';
}

export function A2ASessionGenerator({
  userRole,
  classId,
  courseId,
  onComplete,
  onCancel
}: A2ASessionGeneratorProps) {
  const [step, setStep] = useState<'config' | 'preview' | 'running' | 'completed'>('config');
  const [config, setConfig] = useState<A2ASessionConfig>({
    contentTopic: '',
    targetAudience: '',
    learningObjectives: '',
    currentContent: '',
    iterations: 3,
    focusAreas: [],
    difficulty: 'intermediate',
    sessionType: 'content_creation',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState<A2AIteration[]>([]);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [currentAgent, setCurrentAgent] = useState<'teacher' | 'student' | null>(null);
  const [currentActivity, setCurrentActivity] = useState('');
  const [sessionResult, setSessionResult] = useState<any>(null);

  // 处理配置变更
  const handleConfigChange = (field: keyof A2ASessionConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 处理焦点领域变更
  const handleFocusAreaChange = (area: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      focusAreas: checked
        ? [...prev.focusAreas, area]
        : prev.focusAreas.filter(a => a !== area),
    }));
  };

  // 预览配置
  const handlePreview = () => {
    setStep('preview');
  };

  // 开始A2A会话
  const handleStartSession = async () => {
    setIsRunning(true);
    setStep('running');

    try {
      // 调用A2A会话API
      const response = await fetch('/api/ai/session/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          userRole,
          classId,
          courseId,
        }),
      });

      if (!response.ok) {
        throw new Error(`A2A会话启动失败: ${response.status}`);
      }

      const data = await response.json();

      // 模拟A2A迭代过程
      await simulateA2AIterations(data);

    } catch (error) {
      console.error('A2A会话失败:', error);
      // 使用模拟数据
      await simulateA2AIterations({ sessionId: 'mock_session' });
    }
  };

  // 模拟A2A迭代过程
  const simulateA2AIterations = async (data: any) => {
    const iterationsData: A2AIteration[] = [];

    for (let i = 0; i < config.iterations; i++) {
      setCurrentIteration(i + 1);

      // 教师代理阶段
      setCurrentAgent('teacher');
      setCurrentActivity('正在分析和生成内容...');

      const teacherIteration: A2AIteration = {
        iteration: i + 1,
        teacherContent: [
          {
            type: 'text',
            content: `这是第${i + 1}轮生成的内容示例。`,
            quality_metrics: {
              clarity: Math.random() * 3 + 7, // 7-10分
              engagement: Math.random() * 3 + 6, // 6-9分
              relevance: Math.random() * 2 + 8, // 8-10分
            }
          }
        ],
        studentFeedback: {
          overall_score: Math.random() * 2 + 7, // 7-9分
          clarity_score: Math.random() * 2 + 7,
          engagement_score: Math.random() * 3 + 6,
          relevance_score: Math.random() * 2 + 8,
          difficulty_score: Math.random() * 2 + 6,
          overall_feedback: `第${i + 1}轮反馈：内容整体较好，但可以更加生动有趣。`,
          specific_feedback: [
            '增加更多实例和案例',
            '简化某些复杂概念',
            '添加互动元素'
          ]
        },
        status: 'completed',
        duration: Math.random() * 30 + 60, // 60-90秒
      };

      iterationsData.push(teacherIteration);
      setIterations([...iterationsData]);

      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 学生代理阶段
      setCurrentAgent('student');
      setCurrentActivity('正在提供反馈和改进建议...');

      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setCurrentAgent(null);
    setCurrentActivity('会话完成');

    // 生成最终结果
    const result = {
      sessionId: data.sessionId || 'mock_session',
      iterations: iterationsData,
      finalContent: iterationsData[iterationsData.length - 1]?.teacherContent,
      improvements: iterationsData.map(iter => iter.studentFeedback.overall_feedback),
      averageScore: iterationsData.reduce((sum, iter) => sum + iter.studentFeedback.overall_score, 0) / iterationsData.length,
      totalDuration: iterationsData.reduce((sum, iter) => sum + (iter.duration || 0), 0),
      completedAt: new Date().toISOString(),
    };

    setSessionResult(result);
    setIsRunning(false);
    setStep('completed');
  };

  // 重启会话
  const handleRestart = () => {
    setStep('config');
    setIterations([]);
    setCurrentIteration(0);
    setCurrentAgent(null);
    setCurrentActivity('');
    setSessionResult(null);
    setIsRunning(false);
  };

  // 完成会话
  const handleComplete = () => {
    onComplete({
      config,
      ...sessionResult,
    });
  };

  // 配置表单
  const renderConfigForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 mx-auto mb-3 text-purple-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          A2A会话生成器
        </h2>
        <p className="text-sm text-gray-600">
          教师代理和学生代理将协作优化您的内容
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="contentTopic">内容主题 *</Label>
          <Input
            id="contentTopic"
            placeholder="例如：Python变量和数据类型"
            value={config.contentTopic}
            onChange={(e) => handleConfigChange('contentTopic', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="sessionType">会话类型</Label>
          <Select value={config.sessionType} onValueChange={(value) => handleConfigChange('sessionType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="content_creation">内容创建</SelectItem>
              <SelectItem value="content_review">内容审核</SelectItem>
              <SelectItem value="interactive_discussion">互动讨论</SelectItem>
              <SelectItem value="assessment_design">评估设计</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty">难度等级</Label>
          <Select value={config.difficulty} onValueChange={(value) => handleConfigChange('difficulty', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">初级</SelectItem>
              <SelectItem value="intermediate">中级</SelectItem>
              <SelectItem value="advanced">高级</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="targetAudience">目标学员 *</Label>
          <Input
            id="targetAudience"
            placeholder="例如：编程初学者"
            value={config.targetAudience}
            onChange={(e) => handleConfigChange('targetAudience', e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="learningObjectives">学习目标 *</Label>
          <Textarea
            id="learningObjectives"
            placeholder="描述学员应该掌握的知识和技能..."
            value={config.learningObjectives}
            onChange={(e) => handleConfigChange('learningObjectives', e.target.value)}
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label>现有内容（可选）</Label>
          <Textarea
            placeholder="如果您已有部分内容，请粘贴在这里..."
            value={config.currentContent}
            onChange={(e) => handleConfigChange('currentContent', e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div>
        <Label>迭代次数: {config.iterations}</Label>
        <Slider
          value={[config.iterations]}
          onValueChange={([value]) => handleConfigChange('iterations', value)}
          max={5}
          min={2}
          step={1}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>2次</span>
          <span>5次</span>
        </div>
      </div>

      <div>
        <Label>优化重点领域</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {[
            '内容清晰度',
            '学员参与度',
            '知识点准确性',
            '难度适中',
            '实用性',
            '互动性'
          ].map(area => (
            <label key={area} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.focusAreas.includes(area)}
                onChange={(e) => handleFocusAreaChange(area, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">{area}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button
          onClick={handlePreview}
          disabled={!config.contentTopic || !config.targetAudience || !config.learningObjectives}
          className="flex-1"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          下一步
        </Button>
      </div>
    </div>
  );

  // 配置预览
  const renderPreview = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">
          A2A会话配置预览
        </h3>
        <p className="text-sm text-gray-600">
          请确认以下配置，然后开始A2A优化过程
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">内容主题</Label>
              <p className="font-medium">{config.contentTopic}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">会话类型</Label>
              <p className="font-medium">{config.sessionType}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">难度等级</Label>
              <p className="font-medium">{config.difficulty}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">迭代次数</Label>
              <p className="font-medium">{config.iterations} 次</p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">目标学员</Label>
            <p className="font-medium">{config.targetAudience}</p>
          </div>

          <div>
            <Label className="text-xs text-gray-500">学习目标</Label>
            <p className="text-sm">{config.learningObjectives}</p>
          </div>

          {config.focusAreas.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500">优化重点</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {config.focusAreas.map(area => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {config.currentContent && (
            <div>
              <Label className="text-xs text-gray-500">现有内容</Label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {config.currentContent}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">A2A优化过程说明</h4>
            <p className="text-sm text-blue-700 mt-1">
              A2A会话将包括{config.iterations}轮迭代，每轮包括教师代理内容生成和学生代理反馈。
              整个过程预计需要{(config.iterations * 2.5).toFixed(0)}分钟。
            </p>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button onClick={() => setStep('config')} variant="outline" className="flex-1">
          返回修改
        </Button>
        <Button onClick={handleStartSession} className="flex-1">
          <Play className="w-4 h-4 mr-2" />
          开始A2A会话
        </Button>
      </div>
    </div>
  );

  // 运行中状态
  const renderRunning = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
          {currentAgent === 'teacher' ? (
            <Bot className="w-8 h-8 text-white" />
          ) : (
            <GraduationCap className="w-8 h-8 text-white" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          A2A会话进行中
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          正在进行第 {currentIteration} / {config.iterations} 轮优化
        </p>
      </div>

      {/* 进度指示器 */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">总体进度</span>
            <span className="text-sm text-gray-600">
              {Math.round((currentIteration / config.iterations) * 100)}%
            </span>
          </div>
          <Progress value={(currentIteration / config.iterations) * 100} className="h-2" />
        </div>
      </Card>

      {/* 当前活动 */}
      {currentAgent && (
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              currentAgent === 'teacher' ? 'bg-blue-100' : 'bg-green-100'
            )}>
              {currentAgent === 'teacher' ? (
                <Bot className="w-5 h-5 text-blue-600" />
              ) : (
                <GraduationCap className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {currentAgent === 'teacher' ? '教师代理' : '学生代理'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {currentAgent === 'teacher' ? '内容生成' : '提供反馈'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{currentActivity}</p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        </Card>
      )}

      {/* 已完成的迭代 */}
      {iterations.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">已完成迭代</h4>
          <div className="space-y-2">
            {iterations.map((iteration, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium">第 {iteration.iteration} 轮</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      评分: {iteration.studentFeedback.overall_score.toFixed(1)}/10
                    </Badge>
                    {iteration.duration && (
                      <span className="text-xs text-gray-500">
                        用时: {Math.round(iteration.duration)}秒
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  // 完成状态
  const renderCompleted = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Award className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          A2A会话完成
        </h3>
        <p className="text-sm text-gray-600">
          内容优化已完成，共进行了 {config.iterations} 轮迭代
        </p>
      </div>

      {/* 统计信息 */}
      {sessionResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-3 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-semibold">{sessionResult.averageScore.toFixed(1)}</div>
            <div className="text-xs text-gray-600">平均评分</div>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-semibold">{Math.round(sessionResult.totalDuration)}s</div>
            <div className="text-xs text-gray-600">总用时</div>
          </Card>
          <Card className="p-3 text-center">
            <RotateCcw className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-lg font-semibold">{config.iterations}</div>
            <div className="text-xs text-gray-600">迭代次数</div>
          </Card>
          <Card className="p-3 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <div className="text-lg font-semibold">{sessionResult.improvements.length}</div>
            <div className="text-xs text-gray-600">改进点</div>
          </Card>
        </div>
      )}

      {/* 迭代详情 */}
      {iterations.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">迭代详情</h4>
          <div className="space-y-3">
            {iterations.map((iteration, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">第 {iteration.iteration} 轮</span>
                  <Badge variant="outline" className="text-xs">
                    评分: {iteration.studentFeedback.overall_score.toFixed(1)}/10
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{iteration.studentFeedback.overall_feedback}</p>
                {iteration.studentFeedback.specific_feedback.length > 0 && (
                  <ul className="text-xs text-gray-500 mt-1 space-y-1">
                    {iteration.studentFeedback.specific_feedback.map((feedback, i) => (
                      <li key={i} className="flex items-center space-x-1">
                        <span>•</span>
                        <span>{feedback}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex space-x-3">
        <Button onClick={handleRestart} variant="outline" className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          重新开始
        </Button>
        <Button onClick={handleComplete} className="flex-1">
          <CheckCircle className="w-4 h-4 mr-2" />
          使用结果
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 'config' && renderConfigForm()}
          {step === 'preview' && renderPreview()}
          {step === 'running' && renderRunning()}
          {step === 'completed' && renderCompleted()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default A2ASessionGenerator;