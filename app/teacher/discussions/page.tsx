'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  Lock,
  MessageSquare,
  Pin,
  Send,
  ThumbsUp,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { type User } from '@supabase/supabase-js';
import { Navigation } from '@/components/teacher/design';
import { FloatingActionMenu } from '@/components/teacher/FloatingActionMenu';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Topic {
  id: string;
  title: string;
  description?: string | null;
  class_id: string;
  type: 'general' | 'course' | 'assignment' | 'announcement';
  is_pinned: boolean;
  is_locked: boolean;
  last_activity_at: string;
  post_count: number;
  creator?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface DiscussionItem {
  id: string;
  title?: string | null;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  role: 'teacher' | 'student' | 'assistant' | 'observer' | 'unknown';
  likes: number;
  userLiked: boolean;
  children: DiscussionItem[];
}

interface ClassMembership {
  id: string;
  name: string;
  role: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface PostWithMeta {
  id: string;
  thread_id: string;
  parent_post_id?: string | null;
  user_id: string;
  title?: string | null;
  content: string;
  created_at: string;
  author?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  reactions?: {
    like_count: number;
    dislike_count: number;
    user_reaction?: string;
  };
  children?: PostWithMeta[];
}

export default function TeacherDiscussionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<ClassMembership[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [topicFormOpen, setTopicFormOpen] = useState(false);
  const [discussionFormOpen, setDiscussionFormOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: '', description: '', type: 'general' });
  const [discussionForm, setDiscussionForm] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [processing, setProcessing] = useState(false);

  const activeTopic = topics.find((t) => t.id === selectedTopicId) || null;
  const activeClassRole = memberships.find((c) => c.id === activeClassId)?.role;

  const teacherProfile = {
    name: user?.user_metadata?.full_name || user?.email || 'Teacher',
    avatar:
      user?.user_metadata?.avatar_url ||
      (user?.email ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=B882B1&color=fff` : '/default-avatar.png'),
    organization: user?.user_metadata?.organization || 'WeaveMind',
  };

  const formatName = (author?: { full_name?: string; username?: string; id?: string }) => {
    return author?.full_name || author?.username || author?.id || '未知用户';
  };

  const formatRelativeTime = (date: string) => {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  };

  const gatherAuthorRoles = useCallback(
    async (classId: string, userIds: string[]) => {
      if (!userIds.length) return {} as Record<string, string>;
      const { data } = await supabase
        .from('class_members')
        .select('user_id, role')
        .eq('class_id', classId)
        .in('user_id', Array.from(new Set(userIds)));

      return (data || []).reduce((acc, curr) => {
        acc[curr.user_id] = curr.role;
        return acc;
      }, {} as Record<string, string>);
    },
    [supabase]
  );

  const transformPosts = useCallback(
    (posts: PostWithMeta[], roleMap: Record<string, string>): DiscussionItem[] => {
      return posts.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        createdAt: post.created_at,
        authorId: post.user_id,
        authorName: formatName(post.author),
        authorAvatar:
          post.author?.avatar_url ||
          (post.author?.full_name
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.full_name)}&background=B882B1&color=fff`
            : undefined),
        role: (roleMap[post.user_id] as DiscussionItem['role']) || 'unknown',
        likes: post.reactions?.like_count || 0,
        userLiked: post.reactions?.user_reaction === 'like',
        children: transformPosts(post.children || [], roleMap),
      }));
    },
    []
  );

  const loadUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  }, [supabase]);

  const loadClasses = useCallback(async () => {
    const { data } = await supabase
      .from('class_members')
      .select('class_id, role, classes(name)')
      .eq('user_id', user?.id || '');

    const mapped = (data || []).map((item) => ({
      id: item.class_id,
      name: item.classes?.name || '未命名班级',
      role: item.role,
    }));

    setMemberships(mapped);

    const presetClass = searchParams.get('classId');
    const target = presetClass && mapped.find((m) => m.id === presetClass) ? presetClass : mapped[0]?.id;
    setActiveClassId(target || null);
  }, [searchParams, supabase, user?.id]);

  const loadTopics = useCallback(async () => {
    if (!activeClassId) {
      setTopics([]);
      setSelectedTopicId(null);
      return;
    }
    setLoadingTopics(true);
    try {
      const response = await fetch(
        `/api/discussions/threads?class_id=${activeClassId}&sortBy=last_activity_at&sortOrder=desc`,
        { cache: 'no-store' }
      );
      const result: ApiResponse<Topic[]> = await response.json();
      if (!response.ok || result.error) {
        setStatusMessage(result.error || '无法加载讨论话题');
        setTopics([]);
        return;
      }

      const sorted = (result.data || []).sort((a, b) => {
        if (a.is_pinned === b.is_pinned) {
          return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
        }
        return a.is_pinned ? -1 : 1;
      });

      setTopics(sorted);
      if (!selectedTopicId || !sorted.find((t) => t.id === selectedTopicId)) {
        setSelectedTopicId(sorted[0]?.id || null);
      }
    } finally {
      setLoadingTopics(false);
    }
  }, [activeClassId, selectedTopicId]);

  const loadPosts = useCallback(async () => {
    if (!activeTopic) {
      setDiscussions([]);
      return;
    }
    setLoadingPosts(true);
    try {
      const response = await fetch(`/api/discussions/threads/${activeTopic.id}/posts`, { cache: 'no-store' });
      const result: ApiResponse<PostWithMeta[]> = await response.json();
      if (!response.ok || result.error) {
        setStatusMessage(result.error || '无法加载讨论内容');
        setDiscussions([]);
        return;
      }

      const userIds: string[] = [];
      const collectIds = (posts: PostWithMeta[]) => {
        posts.forEach((p) => {
          userIds.push(p.user_id);
          if (p.children?.length) collectIds(p.children);
        });
      };
      collectIds(result.data || []);

      const roleMap = await gatherAuthorRoles(activeTopic.class_id, userIds);
      setDiscussions(transformPosts(result.data || [], roleMap));
    } finally {
      setLoadingPosts(false);
    }
  }, [activeTopic, gatherAuthorRoles, transformPosts]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [loadClasses, user]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const createTopic = async () => {
    if (!activeClassId || !topicForm.title.trim()) {
      setStatusMessage('请选择班级并填写话题标题');
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch('/api/discussions/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: activeClassId,
          title: topicForm.title,
          description: topicForm.description,
          type: topicForm.type,
        }),
      });

      const result: ApiResponse<Topic> = await response.json();
      if (!response.ok || result.error || !result.data) {
        setStatusMessage(result.error || '创建话题失败');
        return;
      }

      setTopicForm({ title: '', description: '', type: 'general' });
      setTopicFormOpen(false);
      setTopics((prev) => [result.data as Topic, ...prev]);
      setSelectedTopicId(result.data.id);
    } finally {
      setProcessing(false);
    }
  };

  const createDiscussion = async () => {
    if (!activeTopic || !discussionForm.title.trim() || !discussionForm.content.trim()) {
      setStatusMessage('请填写完整的讨论标题和内容');
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch(`/api/discussions/threads/${activeTopic.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: discussionForm.title,
          content: discussionForm.content,
          post_type: 'text',
        }),
      });

      const result: ApiResponse<PostWithMeta> = await response.json();
      if (!response.ok || result.error) {
        setStatusMessage(result.error || '发布讨论失败');
        return;
      }

      setDiscussionForm({ title: '', content: '' });
      setDiscussionFormOpen(false);
      await loadPosts();
      await loadTopics();
    } finally {
      setProcessing(false);
    }
  };

  const createComment = async (postId: string) => {
    if (!activeTopic) return;
    const content = replyContent[postId];
    if (!content || !content.trim()) {
      setStatusMessage('请输入评论内容');
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch(`/api/discussions/threads/${activeTopic.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_post_id: postId,
          content,
          post_type: 'text',
        }),
      });

      const result: ApiResponse<PostWithMeta> = await response.json();
      if (!response.ok || result.error) {
        setStatusMessage(result.error || '发布评论失败');
        return;
      }

      setReplyContent((prev) => ({ ...prev, [postId]: '' }));
      await loadPosts();
      await loadTopics();
    } finally {
      setProcessing(false);
    }
  };

  const deletePost = async (postId: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/discussions/posts/${postId}`, { method: 'DELETE' });
      const result: ApiResponse<{ id: string }> = await response.json();
      if (!response.ok || result.error) {
        setStatusMessage(result.error || '删除失败');
        return;
      }
      await loadPosts();
      await loadTopics();
    } finally {
      setProcessing(false);
    }
  };

  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;
    setProcessing(true);
    try {
      if (liked) {
        await supabase
          .from('discussion_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', 'like');
      } else {
        await supabase
          .from('discussion_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        await supabase.from('discussion_reactions').insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: 'like',
        });
      }

      setDiscussions((prev) =>
        updatePostTree(prev, postId, (post) => ({
          ...post,
          userLiked: !liked,
          likes: Math.max(0, post.likes + (liked ? -1 : 1)),
        }))
      );
    } finally {
      setProcessing(false);
    }
  };

  const updatePostTree = (
    items: DiscussionItem[],
    targetId: string,
    updater: (post: DiscussionItem) => DiscussionItem
  ): DiscussionItem[] => {
    return items.map((item) => {
      if (item.id === targetId) {
        return updater(item);
      }
      return { ...item, children: updatePostTree(item.children, targetId, updater) };
    });
  };

  const renderRoleBadge = (role: DiscussionItem['role']) => {
    if (role === 'teacher') {
      return (
        <div className="size-5 rounded-full bg-[#B882B1] flex items-center justify-center">
          <GraduationCap className="size-3 text-white" />
        </div>
      );
    }

    return (
      <div className="size-5 rounded-full bg-[#6a7282] flex items-center justify-center">
        <UserIcon className="size-3 text-white" />
      </div>
    );
  };

  const classUnavailable = !activeClassId;

  return (
    <div className="min-h-screen bg-[#f3e8f4]">
      <Navigation
        userName={teacherProfile.name}
        userAvatar={teacherProfile.avatar}
        organization={teacherProfile.organization}
        onNavigateToHome={() => router.push('/teacher')}
        onNavigateToSettings={() => router.push('/teacher/settings')}
        onNavigateToNotifications={() => router.push('/teacher/notifications')}
        onNavigateToDiscussions={() => router.push('/teacher/discussions')}
      />

      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        <button
          onClick={() => router.push('/teacher')}
          className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors mb-4"
        >
          <ArrowLeft className="size-5" />
          <span className="text-[14px]">返回仪表盘</span>
        </button>

        {statusMessage && (
          <div className="mb-4 rounded-xl bg-white p-3 text-[14px] text-[#B882B1] shadow-sm border border-[#B882B1]/20">
            {statusMessage}
          </div>
        )}

        <div className="flex gap-6">
          <div className="w-[280px] shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-sm sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[24px] leading-[1.1]">
                  Topics
                </h2>
                {activeClassRole === 'teacher' && (
                  <button
                    onClick={() => setTopicFormOpen(!topicFormOpen)}
                    className="size-8 rounded-xl bg-[#B882B1] text-white flex items-center justify-center hover:opacity-90"
                  >
                    <PlusIcon />
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className="text-[12px] text-[#6a7282]">选择班级</label>
                <select
                  value={activeClassId || ''}
                  onChange={(e) => setActiveClassId(e.target.value || null)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-[#B882B1]"
                >
                  {memberships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.role === 'teacher' ? '(教师)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <AnimatePresence>
                {topicFormOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-[#f8f5fb] border border-[#B882B1]/20 rounded-2xl p-3 mb-3"
                  >
                    <input
                      placeholder="Topic title"
                      value={topicForm.title}
                      onChange={(e) => setTopicForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full mb-2 px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#B882B1]"
                    />
                    <textarea
                      placeholder="Topic description"
                      value={topicForm.description}
                      onChange={(e) => setTopicForm((prev) => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full mb-2 px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#B882B1] resize-none"
                    />
                    <select
                      value={topicForm.type}
                      onChange={(e) => setTopicForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full mb-2 px-3 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#B882B1]"
                    >
                      <option value="general">General</option>
                      <option value="course">Course</option>
                      <option value="assignment">Assignment</option>
                      <option value="announcement">Announcement</option>
                    </select>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setTopicFormOpen(false)}
                        className="px-3 py-2 rounded-xl text-[13px] text-[#6a7282] hover:bg-gray-100"
                        disabled={processing}
                      >
                        取消
                      </button>
                      <button
                        onClick={createTopic}
                        className="px-3 py-2 rounded-xl bg-[#B882B1] text-white text-[13px] hover:opacity-90 flex items-center gap-2"
                        disabled={processing || !topicForm.title.trim() || classUnavailable}
                      >
                        {processing ? <Loader2 className="size-4 animate-spin" /> : <PlusIcon />}
                        创建
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {loadingTopics ? (
                  <p className="text-[13px] text-[#6a7282]">正在加载话题...</p>
                ) : topics.length === 0 ? (
                  <p className="text-[13px] text-[#6a7282]">当前班级暂无话题</p>
                ) : (
                  topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl transition-all border',
                        selectedTopicId === topic.id
                          ? 'bg-[#B882B1] text-white border-[#B882B1] shadow-md'
                          : 'text-[#6a7282] hover:bg-gray-50 border-gray-200'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {topic.is_pinned && <Pin className="size-4" />}
                        {topic.is_locked && <Lock className="size-4" />}
                        <span className="text-[14px] line-clamp-2">{topic.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] opacity-80">
                        <span>{topic.type}</span>
                        <span>{topic.post_count} 条讨论</span>
                        <span>{formatRelativeTime(topic.last_activity_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[42px] leading-[1.1] mb-2">
                  Discussions
                </h1>
                <p className="text-[#6a7282] text-[16px]">
                  {activeTopic?.title || '请选择话题开始讨论'}
                </p>
              </div>
              <button
                onClick={() => setDiscussionFormOpen(!discussionFormOpen)}
                className="px-6 py-3 rounded-xl bg-[#B882B1] text-white text-[14px] hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
                disabled={!activeTopic || activeTopic.is_locked || classUnavailable}
              >
                <MessageSquare className="size-4" />
                新建讨论
              </button>
            </div>

            <AnimatePresence>
              {discussionFormOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <h3 className="text-[#101828] text-[18px] mb-4">发布讨论</h3>
                  <input
                    type="text"
                    placeholder="讨论标题"
                    value={discussionForm.title}
                    onChange={(e) => setDiscussionForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] mb-3 focus:outline-none focus:border-[#B882B1] transition-colors"
                  />
                  <textarea
                    placeholder="想要讨论什么？"
                    value={discussionForm.content}
                    onChange={(e) => setDiscussionForm((prev) => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] mb-3 focus:outline-none focus:border-[#B882B1] transition-colors resize-none"
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDiscussionFormOpen(false)}
                      className="px-4 py-2 rounded-xl text-[#6a7282] hover:bg-gray-50 transition-colors text-[14px]"
                      disabled={processing}
                    >
                      取消
                    </button>
                    <button
                      onClick={createDiscussion}
                      className="px-4 py-2 rounded-xl bg-[#B882B1] text-white hover:opacity-90 transition-opacity text-[14px] flex items-center gap-2"
                      disabled={processing || !discussionForm.title.trim() || !discussionForm.content.trim() || classUnavailable}
                    >
                      {processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      发布
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingPosts ? (
              <div className="bg-white rounded-3xl p-10 shadow-sm text-center text-[#6a7282]">
                正在加载讨论...
              </div>
            ) : !activeTopic ? (
              <div className="bg-white rounded-3xl p-16 shadow-sm text-center">
                <MessageSquare className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6a7282] text-[16px]">请选择左侧话题后查看讨论</p>
              </div>
            ) : discussions.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 shadow-sm text-center">
                <MessageSquare className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6a7282] text-[16px]">当前话题暂无讨论</p>
                <p className="text-[#a5acb8] text-[14px] mt-2">创建首条讨论，邀请同学参与</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <motion.div
                    key={discussion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4 mb-4">
                      <img
                        src={discussion.authorAvatar || '/default-avatar.png'}
                        alt={discussion.authorName}
                        className="size-12 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[16px] text-[#101828]">{discussion.authorName}</h3>
                          {renderRoleBadge(discussion.role)}
                          {discussion.authorId === user?.id && (
                            <span className="text-[10px] bg-[#3FA11B] text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                          <span className="text-[12px] text-[#a5acb8]">· {formatRelativeTime(discussion.createdAt)}</span>
                        </div>
                        <h2 className="text-[18px] text-[#101828] mb-2">{discussion.title}</h2>
                        <p className="text-[14px] text-[#6a7282] leading-relaxed whitespace-pre-wrap">{discussion.content}</p>
                      </div>
                      {discussion.authorId === user?.id && (
                        <button
                          onClick={() => deletePost(discussion.id)}
                          className="size-8 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center shrink-0"
                          disabled={processing}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-6 mb-4 pl-16">
                      <button
                        onClick={() => toggleLike(discussion.id, discussion.userLiked)}
                        className={cn(
                          'flex items-center gap-1 text-[#6a7282] transition-colors',
                          discussion.userLiked ? 'text-[#3FA11B]' : 'hover:text-[#3FA11B]'
                        )}
                        disabled={processing}
                      >
                        <ThumbsUp className="size-4" />
                        <span className="text-[12px]">{discussion.likes}</span>
                      </button>
                      <button
                        onClick={() => setReplyContent((prev) => ({ ...prev, [discussion.id]: prev[discussion.id] || '' }))}
                        className="flex items-center gap-1 text-[#6a7282] hover:text-[#B882B1] transition-colors"
                      >
                        <MessageSquare className="size-4" />
                        <span className="text-[12px]">{discussion.children.length} 条评论</span>
                      </button>
                    </div>

                    {discussion.children.length > 0 && (
                      <div className="pl-16 border-l-2 border-gray-100 ml-6 space-y-4">
                        {discussion.children.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <img
                              src={comment.authorAvatar || '/default-avatar.png'}
                              alt={comment.authorName}
                              className="size-8 rounded-full object-cover shrink-0"
                            />
                            <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[13px] text-[#101828]">{comment.authorName}</span>
                                {renderRoleBadge(comment.role)}
                                {comment.authorId === user?.id && (
                                  <span className="text-[9px] bg-[#3FA11B] text-white px-1.5 py-0.5 rounded-full">You</span>
                                )}
                                <span className="text-[11px] text-[#a5acb8]">· {formatRelativeTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-[13px] text-[#6a7282] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => toggleLike(comment.id, comment.userLiked)}
                                  className={cn(
                                    'flex items-center gap-1 text-[#a5acb8] transition-colors',
                                    comment.userLiked ? 'text-[#3FA11B]' : 'hover:text-[#3FA11B]'
                                  )}
                                  disabled={processing}
                                >
                                  <ThumbsUp className="size-3" />
                                  <span className="text-[11px]">{comment.likes}</span>
                                </button>
                              </div>
                            </div>
                            {comment.authorId === user?.id && (
                              <button
                                onClick={() => deletePost(comment.id)}
                                className="size-6 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center shrink-0"
                                disabled={processing}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pl-16 ml-6 mt-4">
                      <div className="flex gap-3 items-center">
                        <img
                          src={teacherProfile.avatar}
                          alt={teacherProfile.name}
                          className="size-8 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="写下你的评论..."
                            value={replyContent[discussion.id] || ''}
                            onChange={(e) =>
                              setReplyContent((prev) => ({ ...prev, [discussion.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                createComment(discussion.id);
                              }
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#B882B1] transition-colors"
                            disabled={processing || classUnavailable || activeTopic?.is_locked}
                          />
                          <button
                            onClick={() => createComment(discussion.id)}
                            className="size-8 rounded-lg bg-[#B882B1] text-white hover:opacity-90 transition-opacity flex items-center justify-center shrink-0"
                            disabled={processing || classUnavailable || activeTopic?.is_locked}
                          >
                            <Send className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingActionMenu sessions={[]} />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
