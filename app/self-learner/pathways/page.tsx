'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Star,
  Award,
  Calendar,
  User,
  Brain,
  Sparkles,
  BarChart3,
  Lightbulb,
  MapPin,
  ArrowRight,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Share,
  Bookmark,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// 学习路径类型
interface LearningPathway {
  id: string;
  user_id: string;
  title: string;
  description: string;
  goals: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  estimated_duration: number; // 天数
  created_at: string;
  updated_at: string;
  progress?: LearningProgress[];
  completion_rate?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'paused';
}

// 学习进度类型
interface LearningProgress {
  id: string;
  pathway_id: string;
  milestone_id?: string;
  completed: boolean;
  completed_at?: string;
  time_spent: number; // 分钟
  notes?: string;
  created_at: string;
}

// 学习推荐类型
interface LearningRecommendation {
  id: string;
  user_id: string;
  type: 'course' | 'pathway' | 'skill' | 'resource';
  title: string;
  description: string;
  score: number;
  viewed: boolean;
  created_at: string;
}

export default function SelfLearnerPathwaysPage() {
  const [pathways, setPathways] = useState<LearningPathway[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [selectedPathway, setSelectedPathway] = useState<LearningPathway | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userId = 'current-user-id'; // 需要从认证上下文获取

      // 加载学习路径
      const pathwaysData = await apiClient.selfLearner.listPathways(userId).catch(() => []);

      setPathways(pathwaysData || []);
      setRecommendations([]); // 推荐功能待实现
    } catch (error) {
      console.error('Error loading self-learner data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 开始学习路径
  const startPathway = async (pathwayId: string) => {
    try {
      // TODO: 实现路径进度更新功能
      // await apiClient.selfLearner.updateProgress({
      //   user_id: 'current-user-id',
      //   pathway_id: pathwayId,
      //   completed: false
      // });

      setPathways(prev => prev.map(p =>
        p.id === pathwayId
          ? { ...p, status: 'in_progress' as const }
          : p
      ));
    } catch (error) {
      console.error('Error starting pathway:', error);
    }
  };

  // 暂停学习路径
  const pausePathway = async (pathwayId: string) => {
    try {
      setPathways(prev => prev.map(p =>
        p.id === pathwayId
          ? { ...p, status: 'paused' as const }
          : p
      ));
    } catch (error) {
      console.error('Error pausing pathway:', error);
    }
  };

  // 完成里程碑
  const completeMilestone = async (pathwayId: string, milestoneId: string) => {
    try {
      // TODO: 实现里程碑完成功能
      // await apiClient.selfLearner.updateProgress({
      //   user_id: 'current-user-id',
      //   pathway_id: pathwayId,
      //   milestone_id: milestoneId,
      //   completed: true,
      //   time_spent: 30 // 示例时间
      // });

      // 重新加载数据以获取更新的进度
      loadData();
    } catch (error) {
      console.error('Error completing milestone:', error);
    }
  };

  // 标记推荐为已查看
  const markRecommendationViewed = async (recommendationId: string) => {
    try {
      // TODO: 实现推荐查看标记功能
      // await apiClient.selfLearner.markRecommendationViewed(recommendationId);
      setRecommendations(prev => prev.map(r =>
        r.id === recommendationId
          ? { ...r, viewed: true }
          : r
      ));
    } catch (error) {
      console.error('Error marking recommendation as viewed:', error);
    }
  };

  // 过滤路径
  const filteredPathways = pathways.filter(pathway => {
    const matchesSearch = pathway.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pathway.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || pathway.difficulty_level === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
      adaptive: 'bg-purple-100 text-purple-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 获取难度图标
  const getDifficultyIcon = (difficulty: string) => {
    const icons = {
      beginner: BookOpen,
      intermediate: Target,
      advanced: Award,
      adaptive: Brain
    };
    const IconComponent = icons[difficulty as keyof typeof icons] || BookOpen;
    return <IconComponent className="w-4 h-4" />;
  };

  // 模拟里程碑数据
  const milestones = [
    { id: '1', title: '基础知识学习', description: '学习基本概念和原理', completed: false, duration: 7 },
    { id: '2', title: '实践练习', description: '通过练习巩固知识', completed: true, duration: 10 },
    { id: '3', title: '进阶应用', description: '学习高级应用技巧', completed: false, duration: 14 },
    { id: '4', title: '项目实战', description: '完成实际项目', completed: false, duration: 21 }
  ];

  const difficultyLevels = [
    { value: 'all', label: '全部难度' },
    { value: 'beginner', label: '初级' },
    { value: 'intermediate', label: '中级' },
    { value: 'advanced', label: '高级' },
    { value: 'adaptive', label: '自适应' }
  ];

  const tabs = [
    { id: 'overview', label: '概览', icon: BarChart3 },
    { id: 'pathways', label: '学习路径', icon: MapPin },
    { id: 'recommendations', label: '智能推荐', icon: Lightbulb },
    { id: 'progress', label: '学习记录', icon: TrendingUp }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">加载学习数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">自学习中心</h1>
              <p className="mt-2 text-gray-600">个性化学习路径，智能推荐，高效学习</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                创建学习路径
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* 概览 */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">活跃路径</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {pathways.filter(p => p.status === 'in_progress').length}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">已完成</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {pathways.filter(p => p.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">学习时长</p>
                        <p className="text-2xl font-bold text-gray-900">24.5h</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Target className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">完成率</p>
                        <p className="text-2xl font-bold text-gray-900">78%</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* 最近学习 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">最近学习</h3>
                  <div className="space-y-3">
                    {pathways.slice(0, 3).map(pathway => (
                      <div key={pathway.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{pathway.title}</h4>
                          <p className="text-sm text-gray-500">{pathway.description}</p>
                        </div>
                        <Badge className={getStatusColor(pathway.status || 'not_started')}>
                          {pathway.status === 'in_progress' ? '进行中' :
                           pathway.status === 'completed' ? '已完成' :
                           pathway.status === 'paused' ? '已暂停' : '未开始'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 学习路径 */}
            {activeTab === 'pathways' && (
              <div className="space-y-6">
                {/* 搜索和过滤 */}
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="搜索学习路径..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="选择难度" />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyLevels.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                {/* 路径列表 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredPathways.map(pathway => (
                    <Card key={pathway.id} className="p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{pathway.title}</h3>
                            <Badge className={getDifficultyColor(pathway.difficulty_level)}>
                              <div className="flex items-center space-x-1">
                                {getDifficultyIcon(pathway.difficulty_level)}
                                <span>{pathway.difficulty_level}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{pathway.description}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">学习进度</span>
                          <span className="text-gray-900">{pathway.completion_rate || 0}%</span>
                        </div>
                        <Progress value={pathway.completion_rate || 0} className="h-2" />
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{pathway.estimated_duration} 天</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="w-3 h-3" />
                            <span>{pathway.goals?.length || 0} 目标</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {pathway.status === 'not_started' ? (
                          <Button
                            onClick={() => startPathway(pathway.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            开始学习
                          </Button>
                        ) : pathway.status === 'in_progress' ? (
                          <Button
                            onClick={() => pausePathway(pathway.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            暂停学习
                          </Button>
                        ) : pathway.status === 'completed' ? (
                          <Button
                            variant="outline"
                            className="flex-1"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            重新学习
                          </Button>
                        ) : null}

                        <Button variant="ghost" size="sm">
                          <Share className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Bookmark className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 智能推荐 */}
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900">AI智能推荐</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    基于您的学习历史和偏好，AI为您推荐以下学习内容
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map(rec => (
                      <Card key={rec.id} className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{rec.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {rec.type}
                              </Badge>
                              {!rec.viewed && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{rec.description}</p>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="text-sm text-gray-600">{rec.score}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markRecommendationViewed(rec.id)}
                                disabled={rec.viewed}
                              >
                                {rec.viewed ? '已查看' : '查看详情'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 学习记录 */}
            {activeTab === 'progress' && selectedPathway && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedPathway.title}</h3>
                      <p className="text-gray-600">{selectedPathway.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {milestones.map(milestone => (
                      <div key={milestone.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className={cn(
                          "p-2 rounded-full",
                          milestone.completed ? "bg-green-100" : "bg-gray-100"
                        )}>
                          {milestone.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                          <p className="text-sm text-gray-600">{milestone.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {milestone.duration} 天
                            </Badge>
                          </div>
                        </div>
                        {!milestone.completed && selectedPathway.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => completeMilestone(selectedPathway.id, milestone.id)}
                          >
                            完成
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 当没有选择路径时显示提示 */}
            {activeTab === 'progress' && !selectedPathway && (
              <Card className="p-12 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">选择一个学习路径</h3>
                <p className="text-gray-600 mb-4">请先选择一个学习路径来查看详细的学习记录</p>
                <Button onClick={() => setActiveTab('pathways')}>
                  浏览学习路径
                </Button>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}