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
  Zap,
  Save,
  RefreshCw,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  BookOpen,
  Target,
  Award,
  Bot,
  Brain,
  Sparkles,
  Check,
  AlertCircle,
  Info
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

// 组织设置类型
interface OrganizationSettings {
  organization_id: string;
  name: string;
  description: string;
  website?: string;
  ai_optimization_enabled: boolean;
  auto_grading_enabled: boolean;
  discussion_moderation_enabled: boolean;
}

export default function TeacherSettingsPage() {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  // AI优化建议
  const [aiSuggestions, setAiSuggestions] = useState([
    {
      id: 1,
      type: 'optimization',
      title: '启用AI辅助教学',
      description: '开启AI助手可以帮助您更高效地管理课堂和个性化教学',
      action: 'enable_ai',
      impact: 'high'
    },
    {
      id: 2,
      type: 'notification',
      title: '优化通知设置',
      description: '建议开启作业和讨论通知，及时了解学生学习动态',
      action: 'optimize_notifications',
      impact: 'medium'
    },
    {
      id: 3,
      type: 'productivity',
      title: '启用自动保存',
      description: '开启自动保存可以防止意外丢失教学内容',
      action: 'enable_auto_save',
      impact: 'low'
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

      // 加载用户设置
      const userData = await apiClient.settings.getSettings(userId).catch(() => null);
      const orgData = null; // TODO: 实现组织设置获取

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

      if (orgData) {
        setOrganizationSettings(orgData);
      }

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

  // 更新组织设置
  const updateOrgSetting = <K extends keyof OrganizationSettings>(
    key: K,
    value: OrganizationSettings[K]
  ) => {
    if (!organizationSettings) return;

    setOrganizationSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  // 执行AI建议
  const applyAiSuggestion = (action: string) => {
    switch (action) {
      case 'enable_ai':
        updateUserSetting('ai_assistance_enabled', true);
        break;
      case 'optimize_notifications':
        updateUserSetting('discussion_notifications', true);
        updateUserSetting('assignment_notifications', true);
        updateUserSetting('grade_notifications', true);
        break;
      case 'enable_auto_save':
        updateUserSetting('auto_save_enabled', true);
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
    { id: 'appearance', label: '外观设置', icon: Palette },
    { id: 'ai', label: 'AI助手', icon: Bot },
    { id: 'organization', label: '组织设置', icon: Shield },
    { id: 'ai-recommendations', label: 'AI优化建议', icon: Sparkles }
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
              <h1 className="text-3xl font-bold text-gray-900">设置管理</h1>
              <p className="mt-2 text-gray-600">个性化您的教学体验和管理偏好</p>
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
                              <Mail className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">邮件通知</p>
                                <p className="text-sm text-gray-500">接收重要更新的邮件通知</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.email_notifications}
                              onCheckedChange={(checked) => updateUserSetting('email_notifications', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Smartphone className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="font-medium">推送通知</p>
                                <p className="text-sm text-gray-500">接收实时推送通知</p>
                              </div>
                            </div>
                            <Switch
                              checked={userSettings?.push_notifications}
                              onCheckedChange={(checked) => updateUserSetting('push_notifications', checked)}
                            />
                          </div>

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
                                <p className="text-sm text-gray-500">自动保存您的设置和内容</p>
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
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI助手设置</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Bot className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium">启用AI助手</p>
                                <p className="text-sm text-gray-500">开启AI驱动的教学辅助功能</p>
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
                                    您现在可以使用AI助手进行课程创建、讨论管理、作业评分等教学活动。
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 组织设置 */}
                  {activeTab === 'organization' && organizationSettings && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">组织设置</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="org-name">组织名称</Label>
                            <Input
                              id="org-name"
                              value={organizationSettings.name}
                              onChange={(e) => updateOrgSetting('name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="org-description">组织描述</Label>
                            <Textarea
                              id="org-description"
                              value={organizationSettings.description}
                              onChange={(e) => updateOrgSetting('description', e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="org-website">组织网站</Label>
                            <Input
                              id="org-website"
                              value={organizationSettings.website || ''}
                              onChange={(e) => updateOrgSetting('website', e.target.value)}
                              placeholder="https://"
                            />
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">功能设置</h4>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Brain className="w-5 h-5 text-purple-500" />
                                <div>
                                  <p className="font-medium">AI优化</p>
                                  <p className="text-sm text-gray-500">启用AI驱动的教学优化</p>
                                </div>
                              </div>
                              <Switch
                                checked={organizationSettings.ai_optimization_enabled}
                                onCheckedChange={(checked) => updateOrgSetting('ai_optimization_enabled', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Target className="w-5 h-5 text-green-500" />
                                <div>
                                  <p className="font-medium">自动评分</p>
                                  <p className="text-sm text-gray-500">启用AI辅助作业评分</p>
                                </div>
                              </div>
                              <Switch
                                checked={organizationSettings.auto_grading_enabled}
                                onCheckedChange={(checked) => updateOrgSetting('auto_grading_enabled', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-orange-500" />
                                <div>
                                  <p className="font-medium">讨论审核</p>
                                  <p className="text-sm text-gray-500">启用AI讨论内容审核</p>
                                </div>
                              </div>
                              <Switch
                                checked={organizationSettings.discussion_moderation_enabled}
                                onCheckedChange={(checked) => updateOrgSetting('discussion_moderation_enabled', checked)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI优化建议 */}
                  {activeTab === 'ai-recommendations' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI优化建议</h3>
                        <p className="text-gray-600 mb-6">
                          基于您的使用模式，AI助手为您推荐以下优化设置
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