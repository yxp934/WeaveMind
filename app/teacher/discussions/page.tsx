'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  Clock,
  Heart,
  Reply,
  MoreHorizontal,
  Pin,
  Lock,
  Globe,
  BookOpen,
  Calendar,
  Award,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useRealtime } from '@/components/realtime/hooks';

// 讨论线程类型
interface DiscussionThread {
  id: string;
  title: string;
  description: string;
  category: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  };
  posts_count: number;
  last_post_at?: string;
  participants_count: number;
  views_count: number;
  likes_count: number;
}

// 讨论帖子类型
interface DiscussionPost {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  };
  likes_count: number;
  replies?: DiscussionPost[];
}

export default function TeacherDiscussionsPage() {
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newThread, setNewThread] = useState({
    title: '',
    description: '',
    category: 'general'
  });
  const [newPostContent, setNewPostContent] = useState('');

  // 实时订阅讨论更新
  const { data: threadUpdates } = useRealtime('discussion_threads', {
    onInsert: (payload) => {
      setThreads(prev => [payload, ...prev]);
    },
    onUpdate: (payload) => {
      setThreads(prev => prev.map(t => t.id === payload.id ? payload : t));
    },
    onDelete: (payload) => {
      setThreads(prev => prev.filter(t => t.id !== payload.id));
    }
  });

  // 加载讨论线程
  useEffect(() => {
    loadThreads();
  }, [selectedCategory, sortBy]);

  // 加载帖子详情
  useEffect(() => {
    if (selectedThread) {
      loadPosts(selectedThread.id);
    }
  }, [selectedThread]);

  const loadThreads = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.discussions.listThreads();
      let filteredData = data || [];

      // 过滤分类
      if (selectedCategory !== 'all') {
        filteredData = filteredData.filter((thread: DiscussionThread) =>
          thread.category === selectedCategory
        );
      }

      // 搜索过滤
      if (searchTerm) {
        filteredData = filteredData.filter((thread: DiscussionThread) =>
          thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          thread.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // 排序
      if (sortBy === 'latest') {
        filteredData.sort((a: DiscussionThread, b: DiscussionThread) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      } else if (sortBy === 'popular') {
        filteredData.sort((a: DiscussionThread, b: DiscussionThread) =>
          b.posts_count - a.posts_count
        );
      } else if (sortBy === 'active') {
        filteredData.sort((a: DiscussionThread, b: DiscussionThread) =>
          new Date(b.last_post_at || b.updated_at).getTime() - new Date(a.last_post_at || a.updated_at).getTime()
        );
      }

      setThreads(filteredData);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async (threadId: string) => {
    try {
      const data = await apiClient.discussions.listPosts(threadId);
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleCreateThread = async () => {
    try {
      if (!newThread.title.trim() || !newThread.description.trim()) return;

      const threadData = {
        ...newThread,
        class_id: 'current-class-id', // 需要从上下文获取
        author_id: 'current-user-id' // 需要从认证上下文获取
      };

      const createdThread = await apiClient.discussions.createThread(threadData);
      setThreads(prev => [createdThread, ...prev]);
      setNewThread({ title: '', description: '', category: 'general' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!selectedThread || !newPostContent.trim()) return;

    try {
      const postData = {
        thread_id: selectedThread.id,
        content: newPostContent,
        author_id: 'current-user-id' // 需要从认证上下文获取
      };

      const createdPost = await apiClient.discussions.createPost(postData);
      setPosts(prev => [...prev, createdPost]);
      setNewPostContent('');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  // 获取分类颜色
  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      academic: 'bg-blue-100 text-blue-800',
      assignment: 'bg-green-100 text-green-800',
      project: 'bg-purple-100 text-purple-800',
      technical: 'bg-orange-100 text-orange-800',
      social: 'bg-pink-100 text-pink-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    const icons = {
      general: MessageCircle,
      academic: BookOpen,
      assignment: Target,
      project: Award,
      technical: Users,
      social: Heart
    };
    const IconComponent = icons[category as keyof typeof icons] || MessageCircle;
    return <IconComponent className="w-4 h-4" />;
  };

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'general', label: '一般讨论' },
    { value: 'academic', label: '学术讨论' },
    { value: 'assignment', label: '作业讨论' },
    { value: 'project', label: '项目讨论' },
    { value: 'technical', label: '技术支持' },
    { value: 'social', label: '社交交流' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">讨论管理</h1>
              <p className="mt-2 text-gray-600">管理和监控课堂讨论，促进学生参与</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建讨论
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：讨论线程列表 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {/* 搜索和过滤 */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索讨论..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">最新</SelectItem>
                    <SelectItem value="popular">热门</SelectItem>
                    <SelectItem value="active">活跃</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 讨论线程列表 */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      加载中...
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无讨论话题
                    </div>
                  ) : (
                    threads.map(thread => (
                      <motion.div
                        key={thread.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                          selectedThread?.id === thread.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setSelectedThread(thread)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {thread.is_pinned && (
                                <Pin className="w-4 h-4 text-orange-500" />
                              )}
                              {thread.is_locked && (
                                <Lock className="w-4 h-4 text-gray-400" />
                              )}
                              <h3 className="font-semibold text-gray-900">{thread.title}</h3>
                              <Badge
                                variant="secondary"
                                className={getCategoryColor(thread.category)}
                              >
                                <div className="flex items-center space-x-1">
                                  {getCategoryIcon(thread.category)}
                                  <span>{thread.category}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {thread.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Avatar className="w-6 h-6">
                                    <img
                                      src={thread.author.avatar_url || '/default-avatar.png'}
                                      alt={thread.author.name}
                                    />
                                  </Avatar>
                                  <span>{thread.author.name}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{thread.posts_count}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Users className="w-3 h-3" />
                                  <span>{thread.participants_count}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(thread.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* 右侧：讨论详情 */}
          <div className="lg:col-span-1">
            <Card className="p-6 h-[700px] flex flex-col">
              {selectedThread ? (
                <>
                  {/* 线程信息 */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedThread.title}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4">
                      {selectedThread.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Avatar className="w-6 h-6">
                          <img
                            src={selectedThread.author.avatar_url || '/default-avatar.png'}
                            alt={selectedThread.author.name}
                          />
                        </Avatar>
                        <span>{selectedThread.author.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{selectedThread.posts_count} 回复</span>
                      </div>
                    </div>
                  </div>

                  {/* 帖子列表 */}
                  <ScrollArea className="flex-1 mb-4">
                    <div className="space-y-4">
                      {posts.map(post => (
                        <div key={post.id} className="border-l-2 border-blue-200 pl-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="w-8 h-8">
                              <img
                                src={post.author.avatar_url || '/default-avatar.png'}
                                alt={post.author.name}
                              />
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">{post.author.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {post.author.role}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(post.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                                {post.content}
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <button className="flex items-center space-x-1 hover:text-red-500">
                                  <Heart className="w-3 h-3" />
                                  <span>{post.likes_count}</span>
                                </button>
                                <button className="flex items-center space-x-1 hover:text-blue-500">
                                  <Reply className="w-3 h-3" />
                                  <span>回复</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* 回复输入 */}
                  {!selectedThread.is_locked && (
                    <div className="border-t pt-4">
                      <Textarea
                        placeholder="输入你的回复..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="mb-3"
                        rows={3}
                      />
                      <Button
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim()}
                        className="w-full"
                      >
                        发布回复
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>选择一个讨论话题查看详情</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* 创建讨论对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新讨论</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">标题</label>
              <Input
                placeholder="讨论标题..."
                value={newThread.title}
                onChange={(e) => setNewThread(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <Textarea
                placeholder="讨论描述..."
                value={newThread.description}
                onChange={(e) => setNewThread(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">分类</label>
              <Select
                value={newThread.category}
                onValueChange={(value) => setNewThread(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.slice(1).map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateThread}
                disabled={!newThread.title.trim() || !newThread.description.trim()}
              >
                创建讨论
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}