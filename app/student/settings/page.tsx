'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Palette,
  Globe,
  Clock,
  Shield,
  BookOpen,
  Target,
  Award,
  Bot,
  Brain,
  Sparkles,
  Save,
  RefreshCw,
  Monitor,
  Moon,
  Sun,
  Volume2,
  Check,
  AlertCircle,
  Info,
  GraduationCap,
  TrendingUp,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// 设置项类型
interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  ai_assistance_enabled: boolean;
  auto_save_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  discussion_notifications: boolean;
  assignment_notifications: boolean;
  grade_notifications: boolean;
}

// 学习偏好类型
interface LearningPreferences {
  user_id: string;
  preferred_learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  difficulty_preference: 'easy' | 'medium' | 'hard' | 'adaptive';
  study_reminder_enabled: boolean;
  study_reminder_time: string;
  progress_sharing_enabled: boolean;
  collaborative_learning_enabled: boolean;
}

export default function StudentSettingsPage() {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [learningPreferences, setLearningPreferences] = useState<LearningPreferences | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  // AI优化建议（学生版）
  const [aiSuggestions, setAiSuggestions] = useState([
    {
      id: 1,
      type: 'learning_style',
      title: '启用个性化学习路径',
      description: '基于您的学习偏好，AI可以为您推荐最适合的学习内容',
      action: 'enable_personalized_path',
      impact: 'high'
    },
    {
      id: 2,
      type: 'reminder',
      title: '开启学习提醒',
      description: '设置定期学习提醒，保持学习节奏',
      action: 'enable_study_reminder',
      impact: 'medium'
    },
    {
      id: 3,
      type: 'collaboration',
      title: '启用协作学习',
      description: '与同学一起学习，互相帮助提高学习效果',
      action: 'enable_collaboration',
      impact: 'medium'
    }
  ]);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const userId = 'current-user-id'; // 需要从认证上下文获取

      // 并行加载设置
      const [userData, learningData] = await Promise.all([
        apiClient.settings.getSettings(userId).catch(() => null),
        // 这里可以加载学习偏好，暂时用默认值
        Promise.resolve(null)
      ]);

      if (userData && userData.length > 0) {
        setUserSettings(userData[0]);
      } else {
        // 默认设置
        setUserSettings({
          user_id: userId,
          theme: 'auto',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          email_frequency: 'daily',
          ai_assistance_enabled: false,
          auto_save_enabled: true,
          email_notifications: true,
          push_notifications: true,
          discussion_notifications: true,
          assignment_notifications: true,
          grade_notifications: true
        });
      }

      // 设置默认学习偏好
      setLearningPreferences({
        user_id: userId,
        preferred_learning_style: 'visual',
        difficulty_preference: 'adaptive',
        study_reminder_enabled: false,
        study_reminder_time: '19:00',
        progress_sharing_enabled: true,
        collaborative_learning_enabled: true
      });

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    if (!userSettings) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');

      // TODO: 实现设置保存功能
      // await apiClient.settings.updateSetting(userSettings.user_id, {
      //   setting_category: 'user_preferences',
      //   setting_key: 'theme',
      //   setting_value: userSettings.theme,
      //   data_type: 'string'
      // });

      setSaveStatus('saved');
      setHasChanges(false);

      // 3秒后重置状态
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // 更新用户设置
  const updateUserSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    if (!userSettings) return;

    setUserSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  // 更新学习偏好
  const updateLearningPreference = <K extends keyof LearningPreferences>(
    key: K,
    value: LearningPreferences[K]
  ) => {
    if (!learningPreferences) return;

    setLearningPreferences(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  // 执行AI建议
  const applyAiSuggestion = (action: string) => {
    switch (action) {
      case 'enable_personalized_path':
        updateUserSetting('ai_assistance_enabled', true);
        break;
      case 'enable_study_reminder':
        if (learningPreferences) {
          updateLearningPreference('study_reminder_enabled', true);
        }
        break;
      case 'enable_collaboration':
        if (learningPreferences) {
          updateLearningPreference('collaborative_learning_enabled', true);
        }
        break;
    }
  };

  // 获取影响级别颜色
  const getImpactColor = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[impact as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'notifications', label: '通知设置', icon: Bell },
    { id: 'learning', label: '学习偏好', icon: GraduationCap },
    { id: 'appearance', label: '外观设置', icon: Palette },
    { id: 'ai', label: 'AI助手', icon: Bot },
    { id: 'ai-recommendations', label: '学习建议', icon: Sparkles }
  ];

  const languages = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'zh-TW', label: '繁体中文' },
    { value: 'en-US', label: 'English' },
    { value: 'ja-JP', label: '日本語' },
    { value: 'ko-KR', label: '한국어' }
  ];

  const timezones = [
    { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
    { value: 'Asia/Tokyo', label: '东京时间 (UTC+9)' },
    { value: 'America/New_York', label: '纽约时间 (UTC-5)' },
    { value: 'Europe/London', label: '伦敦时间 (UTC+0)' }
  ];

  const learningStyles = [
    { value: 'visual', label: '视觉学习', description: '通过图表、图片学习' },
    { value: 'auditory', label: '听觉学习', description: '通过听力、讨论学习' },
    { value: 'kinesthetic', label: '动手学习', description: '通过实践、操作学习' },
    { value: 'reading', label: '阅读学习', description: '通过文字、阅读学习' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">加载设置中...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">个人设置</h1>
              <p className="mt-2 text-gray-600">个性化您的学习体验和偏好设置</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  有未保存的更改
                </Badge>
              )}
              <Button
                onClick={saveSettings}
                disabled={!hasChanges || isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saveStatus === 'saving' ? '保存中...' :
                 saveStatus === 'saved' ? '已保存' :
                 saveStatus === 'error' ? '保存失败' : '保存设置'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：导航标签 */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                        activeTab === tab.id
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* 右侧：设置内容 */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* 个人资料 */}
                  {activeTab === 'profile' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">个人资料</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="language">语言</Label>
                            <Select
                              value={userSettings?.language}
                              onValueChange={(value) => updateUserSetting('language', value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {languages.map(lang => (
                                  <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="timezone">时区</Label>
                            <Select
                              value={userSettings?.timezone}
                              onValueChange={(value) => updateUserSetting('timezone', value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timezones.map(tz => (
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="email-frequency">邮件频率</Label>
                            <Select
                              value={userSettings?.email_frequency}
                              onValueChange={(value) => updateUserSetting('email_frequency', value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="immediate">立即</SelectItem>
                                <SelectItem value="daily">每日</SelectItem>
                                <SelectItem value="weekly">每周</SelectItem>
                                <SelectItem value="never">从不</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 通知设置 */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知偏好</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <MessageSquare className="w-5 h-5 text-purple-500" />
                              <div>
                                <p className="font-medium">讨论通知</p>
                                <p className="text-sm text-gray-500">新讨论和回复通知</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.discussion_notifications}
                              onCheckedChange={(checked) => updateUserSetting('discussion_notifications', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Target className="w-5 h-5 text-orange-500" />
                              <div>
                                <p className="font-medium">作业通知</p>
                                <p className="text-sm text-gray-500">作业提交和截止日期通知</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.assignment_notifications}
                              onCheckedChange={(checked) => updateUserSetting('assignment_notifications', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Award className="w-5 h-5 text-yellow-500" />
                              <div>
                                <p className="font-medium">成绩通知</p>
                                <p className="text-sm text-gray-500">成绩发布和更新通知</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.grade_notifications}
                              onCheckedChange={(checked) => updateUserSetting('grade_notifications', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 学习偏好 */}
                  {activeTab === 'learning' && learningPreferences && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">学习偏好</h3>
                        <div className="space-y-6">
                          <div>
                            <Label>学习风格</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                              {learningStyles.map(style => (
                                <button
                                  key={style.value}
                                  onClick={() => updateLearningPreference('preferred_learning_style', style.value as any)}
                                  className={cn(
                                    "text-left p-4 rounded-lg border transition-colors",
                                    learningPreferences.preferred_learning_style === style.value
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  )}
                                >
                                  <div className="font-medium text-gray-900">{style.label}</div>
                                  <div className="text-sm text-gray-500 mt-1">{style.description}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>难度偏好</Label>
                            <Select
                              value={learningPreferences.difficulty_preference}
                              onValueChange={(value) => updateLearningPreference('difficulty_preference', value as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">简单</SelectItem>
                                <SelectItem value="medium">中等</SelectItem>
                                <SelectItem value="hard">困难</SelectItem>
                                <SelectItem value="adaptive">自适应</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Calendar className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">学习提醒</p>
                                <p className="text-sm text-gray-500">定期提醒您进行学习</p>
                              </div>
                            </div>
                            <Switch
                              checked={learningPreferences.study_reminder_enabled}
                              onCheckedChange={(checked) => updateLearningPreference('study_reminder_enabled', checked)}
                            />
                          </div>

                          {learningPreferences.study_reminder_enabled && (
                            <div>
                              <Label htmlFor="reminder-time">提醒时间</Label>
                              <Input
                                id="reminder-time"
                                type="time"
                                value={learningPreferences.study_reminder_time}
                                onChange={(e) => updateLearningPreference('study_reminder_time', e.target.value)}
                                className="w-32"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <TrendingUp className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="font-medium">进度分享</p>
                                <p className="text-sm text-gray-500">允许分享学习进度给老师</p>
                              </div>
                            </div>
                            <Switch
                              checked={learningPreferences.progress_sharing_enabled}
                              onCheckedChange={(checked) => updateLearningPreference('progress_sharing_enabled', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <MessageSquare className="w-5 h-5 text-purple-500" />
                              <div>
                                <p className="font-medium">协作学习</p>
                                <p className="text-sm text-gray-500">与同学一起学习讨论</p>
                              </div>
                            </div>
                            <Switch
                              checked={learningPreferences.collaborative_learning_enabled}
                              onCheckedChange={(checked) => updateLearningPreference('collaborative_learning_enabled', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 外观设置 */}
                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">外观和显示</h3>
                        <div className="space-y-4">
                          <div>
                            <Label>主题</Label>
                            <div className="grid grid-cols-3 gap-3 mt-2">
                              {[
                                { value: 'light', label: '浅色', icon: Sun },
                                { value: 'dark', label: '深色', icon: Moon },
                                { value: 'auto', label: '自动', icon: Monitor }
                              ].map(theme => {
                                const IconComponent = theme.icon;
                                return (
                                  <button
                                    key={theme.value}
                                    onClick={() => updateUserSetting('theme', theme.value as any)}
                                    className={cn(
                                      "flex flex-col items-center space-y-2 p-4 rounded-lg border transition-colors",
                                      userSettings?.theme === theme.value
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-gray-200 hover:border-gray-300"
                                    )}
                                  >
                                    <IconComponent className="w-6 h-6" />
                                    <span className="text-sm font-medium">{theme.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Volume2 className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">声音效果</p>
                                <p className="text-sm text-gray-500">启用操作声音反馈</p>
                              </div>
                            </div>
                            <Switch />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Save className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="font-medium">自动保存</p>
                                <p className="text-sm text-gray-500">自动保存您的设置和学习记录</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.auto_save_enabled}
                              onCheckedChange={(checked) => updateUserSetting('auto_save_enabled', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI助手 */}
                  {activeTab === 'ai' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI学习助手</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Bot className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">启用AI助手</p>
                                <p className="text-sm text-gray-500">获得个性化的学习建议和辅导</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.ai_assistance_enabled}
                              onCheckedChange={(checked) => updateUserSetting('ai_assistance_enabled', checked)}
                            />
                          </div>

                          {userSettings?.ai_assistance_enabled && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start space-x-3">
                                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                                <div>
                                  <p className="font-medium text-blue-900">AI助手已启用</p>
                                  <p className="text-sm text-blue-700 mt-1">
                                    您现在可以使用AI助手进行学习辅导、答疑解惑、制定学习计划等。
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 学习建议 */}
                  {activeTab === 'ai-recommendations' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI学习建议</h3>
                        <p className="text-gray-600 mb-6">
                          基于您的学习数据，AI为您推荐以下个性化建议
                        </p>
                        <div className="space-y-4">
                          {aiSuggestions.map(suggestion => (
                            <Card key={suggestion.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                                    <Badge
                                      variant="secondary"
                                      className={getImpactColor(suggestion.impact)}
                                    >
                                      {suggestion.impact === 'high' ? '高影响' :
                                       suggestion.impact === 'medium' ? '中影响' : '低影响'}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-600 text-sm mb-3">
                                    {suggestion.description}
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyAiSuggestion(suggestion.action)}
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  >
                                    应用建议
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}