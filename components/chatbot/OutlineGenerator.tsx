'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  Users,
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  Edit3,
  Save,
  X,
  Loader2,
  Plus,
  Trash2,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface OutlineGeneratorProps {
  userRole: 'teacher' | 'student' | 'self-learner';
  classId?: string;
  courseId?: string;
  onComplete: (outlineData: any) => void;
  onCancel: () => void;
}

// 课程大纲章节接口
interface Chapter {
  id: string;
  title: string;
  description: string;
  duration: string;
  objectives: string[];
  content: string;
}

// 生成需求接口
interface GenerationRequest {
  courseTitle: string;
  subject: string;
  targetAudience: string;
  learningObjectives: string;
  duration: string;
  sessions: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  teachingMethod: string;
  additionalRequirements?: string;
}

export function OutlineGenerator({
  userRole,
  classId,
  courseId,
  onComplete,
  onCancel
}: OutlineGeneratorProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'review' | 'editing'>('input');
  const [request, setRequest] = useState<GenerationRequest>({
    courseTitle: '',
    subject: '',
    targetAudience: '',
    learningObjectives: '',
    duration: '',
    sessions: 8,
    difficulty: 'intermediate',
    teachingMethod: '',
    additionalRequirements: '',
  });
  const [generatedOutline, setGeneratedOutline] = useState<Chapter[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingChapter, setEditingChapter] = useState<string | null>(null);

  // 处理输入变更
  const handleInputChange = (field: keyof GenerationRequest, value: any) => {
    setRequest(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 开始生成大纲
  const handleGenerateOutline = async () => {
    setIsGenerating(true);
    setStep('generating');

    try {
      // 调用工具API生成大纲
      const response = await fetch('/api/ai/tools/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: 'temp_workflow', // 临时工作流ID
          tool_name: 'generate_outline',
          parameters: {
            requirements: request,
            class_id: classId,
            save_to_class: !!classId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`生成失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.result && data.result.chapters) {
        setGeneratedOutline(data.result.chapters || []);
      } else {
        throw new Error(data.error || 'Outline generation failed');
      }

      setStep('review');

    } catch (error) {
      console.error('生成大纲失败:', error);
      // 使用模拟数据作为后备
      const mockOutline: Chapter[] = [
        {
          id: '1',
          title: '课程介绍与基础概念',
          description: '介绍课程的主要概念和基础知识点',
          duration: '60分钟',
          objectives: ['理解基本概念', '掌握基础理论', '建立知识框架'],
          content: '详细介绍课程的核心概念，为后续学习打下坚实基础。',
        },
        {
          id: '2',
          title: '核心原理解析',
          description: '深入讲解课程的核心原理和方法',
          duration: '90分钟',
          objectives: ['掌握核心原理', '理解应用方法', '培养分析能力'],
          content: '通过实例和练习，帮助学生深入理解核心概念。',
        },
        {
          id: '3',
          title: '实践应用与案例分析',
          description: '通过实际案例加深理解和应用能力',
          duration: '120分钟',
          objectives: ['应用理论知识', '解决实际问题', '提升实践技能'],
          content: '结合真实案例，让学生在实践中掌握知识和技能。',
        },
      ];
      setGeneratedOutline(mockOutline);
      setStep('review');
    } finally {
      setIsGenerating(false);
    }
  };

  // 编辑章节
  const handleEditChapter = (chapterId: string, field: keyof Chapter, value: any) => {
    setGeneratedOutline(prev =>
      prev.map(chapter =>
        chapter.id === chapterId
          ? { ...chapter, [field]: value }
          : chapter
      )
    );
  };

  // 添加新章节
  const handleAddChapter = () => {
    const newChapter: Chapter = {
      id: `chapter_${Date.now()}`,
      title: '新章节',
      description: '章节描述',
      duration: '60分钟',
      objectives: [],
      content: '',
    };
    setGeneratedOutline(prev => [...prev, newChapter]);
    setEditingChapter(newChapter.id);
  };

  // 删除章节
  const handleDeleteChapter = (chapterId: string) => {
    setGeneratedOutline(prev => prev.filter(chapter => chapter.id !== chapterId));
  };

  // 完成大纲生成
  const handleComplete = () => {
    const outlineData = {
      request,
      chapters: generatedOutline,
      generatedAt: new Date().toISOString(),
      totalSessions: generatedOutline.length,
      estimatedDuration: generatedOutline.reduce((total, chapter) => {
        const duration = parseInt(chapter.duration);
        return total + (isNaN(duration) ? 60 : duration);
      }, 0),
    };

    onComplete(outlineData);
  };

  // 输入表单
  const renderInputForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          AI课程大纲生成器
        </h2>
        <p className="text-sm text-gray-600">
          告诉我您的课程需求，我将为您生成完整的大纲
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="courseTitle">课程标题 *</Label>
          <Input
            id="courseTitle"
            placeholder="例如：Python编程基础"
            value={request.courseTitle}
            onChange={(e) => handleInputChange('courseTitle', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="subject">学科领域 *</Label>
          <Input
            id="subject"
            placeholder="例如：计算机科学"
            value={request.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="targetAudience">目标学员 *</Label>
          <Input
            id="targetAudience"
            placeholder="例如：初学者、无编程经验"
            value={request.targetAudience}
            onChange={(e) => handleInputChange('targetAudience', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="sessions">预计课时数</Label>
          <Input
            id="sessions"
            type="number"
            min="1"
            max="50"
            value={request.sessions}
            onChange={(e) => handleInputChange('sessions', parseInt(e.target.value) || 8)}
          />
        </div>

        <div>
          <Label htmlFor="difficulty">难度等级</Label>
          <Select value={request.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
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

        <div>
          <Label htmlFor="duration">总时长</Label>
          <Input
            id="duration"
            placeholder="例如：8周、2个月"
            value={request.duration}
            onChange={(e) => handleInputChange('duration', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="learningObjectives">学习目标 *</Label>
        <Textarea
          id="learningObjectives"
          placeholder="请描述学员完成课程后应该掌握的知识和技能..."
          value={request.learningObjectives}
          onChange={(e) => handleInputChange('learningObjectives', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="teachingMethod">教学方法偏好</Label>
        <Textarea
          id="teachingMethod"
          placeholder="例如：理论+实践、案例驱动、项目导向..."
          value={request.teachingMethod}
          onChange={(e) => handleInputChange('teachingMethod', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="additionalRequirements">其他要求</Label>
        <Textarea
          id="additionalRequirements"
          placeholder="任何特殊要求或希望包含的内容..."
          value={request.additionalRequirements}
          onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex space-x-3 pt-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button
          onClick={handleGenerateOutline}
          disabled={!request.courseTitle || !request.subject || !request.targetAudience || !request.learningObjectives}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          生成大纲
        </Button>
      </div>
    </div>
  );

  // 生成中状态
  const renderGenerating = () => (
    <div className="text-center py-12">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        正在生成课程大纲
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        AI正在根据您的需求精心设计课程结构...
      </p>
      <div className="max-w-xs mx-auto">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  // 大纲预览和编辑
  const renderReview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            课程大纲预览
          </h3>
          <p className="text-sm text-gray-600">
            共 {generatedOutline.length} 个章节，预计总时长 {generatedOutline.reduce((total, chapter) => {
              const duration = parseInt(chapter.duration);
              return total + (isNaN(duration) ? 60 : duration);
            }, 0)} 分钟
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep('editing')}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            编辑
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {generatedOutline.map((chapter, index) => (
          <Card key={chapter.id} className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {chapter.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {chapter.description}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {chapter.duration}
                  </span>
                  <span className="flex items-center">
                    <Target className="w-3 h-3 mr-1" />
                    {chapter.objectives.length} 个学习目标
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex space-x-3 pt-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button onClick={handleComplete} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          使用此大纲
        </Button>
      </div>
    </div>
  );

  // 编辑模式
  const renderEditing = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          编辑大纲
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('review')}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          预览
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        {generatedOutline.map((chapter, index) => (
          <Card key={chapter.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {index + 1}
                </div>
                <Input
                  value={chapter.title}
                  onChange={(e) => handleEditChapter(chapter.id, 'title', e.target.value)}
                  className="font-medium"
                />
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingChapter(
                    editingChapter === chapter.id ? null : chapter.id
                  )}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteChapter(chapter.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>章节描述</Label>
                <Textarea
                  value={chapter.description}
                  onChange={(e) => handleEditChapter(chapter.id, 'description', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>预计时长</Label>
                  <Input
                    value={chapter.duration}
                    onChange={(e) => handleEditChapter(chapter.id, 'duration', e.target.value)}
                    placeholder="例如：60分钟"
                  />
                </div>
                <div>
                  <Label>学习目标</Label>
                  <Textarea
                    value={chapter.objectives.join('\n')}
                    onChange={(e) => handleEditChapter(chapter.id, 'objectives', e.target.value.split('\n').filter(obj => obj.trim()))}
                    rows={2}
                    placeholder="每行一个目标"
                  />
                </div>
              </div>

              {editingChapter === chapter.id && (
                <div>
                  <Label>详细内容</Label>
                  <Textarea
                    value={chapter.content}
                    onChange={(e) => handleEditChapter(chapter.id, 'content', e.target.value)}
                    rows={3}
                    placeholder="章节的详细内容描述..."
                  />
                </div>
              )}
            </div>
          </Card>
        ))}

        <Button
          variant="outline"
          onClick={handleAddChapter}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加章节
        </Button>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button onClick={handleComplete} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          保存大纲
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
          {step === 'input' && renderInputForm()}
          {step === 'generating' && renderGenerating()}
          {step === 'review' && renderReview()}
          {step === 'editing' && renderEditing()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default OutlineGenerator;