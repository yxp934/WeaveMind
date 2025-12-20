'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  ThumbsUp,
  Trash2,
  Send,
  GraduationCap,
  User,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DiscussionTopic {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_role: 'teacher' | 'student';
  created_at: string;
  profiles?: {
    full_name: string;
  };
  like_count: number;
  discussion_comments?: {
    id: string;
  }[];
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_role: 'teacher' | 'student';
  created_at: string;
  profiles?: {
    full_name: string;
  };
  like_count: number;
}

interface LikeStatus {
  liked: boolean;
  likeId: string | null;
}

export default function TeacherDiscussionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<string>('');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likeStatuses, setLikeStatuses] = useState<Record<string, LikeStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [showNewDiscussionForm, setShowNewDiscussionForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newDiscussionTitle, setNewDiscussionTitle] = useState('');
  const [newDiscussionContent, setNewDiscussionContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentClassId, setCurrentClassId] = useState<string>('');

  // 加载当前用户信息
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // 加载topics
  useEffect(() => {
    if (currentClassId) {
      loadTopics();
    }
  }, [currentClassId]);

  // 加载discussions
  useEffect(() => {
    if (activeTopic) {
      loadDiscussions();
    }
  }, [activeTopic]);

  // 加载comments
  useEffect(() => {
    if (selectedDiscussion) {
      loadComments();
      loadLikeStatus(selectedDiscussion.id, 'discussion');
    }
  }, [selectedDiscussion]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // 这里应该从上下文或路由参数获取classId
        // 临时使用模拟值
        const mockClassId = 'mock-class-id';
        setCurrentClassId(mockClassId);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadTopics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/discussions/topics?classId=${currentClassId}`);
      const data = await response.json();
      if (data.topics) {
        setTopics(data.topics);
        if (data.topics.length > 0) {
          setActiveTopic(data.topics[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiscussions = async () => {
    try {
      const response = await fetch(`/api/discussions/topics/${activeTopic}/discussions`);
      const data = await response.json();
      if (data.discussions) {
        setDiscussions(data.discussions);
      }
    } catch (error) {
      console.error('Error loading discussions:', error);
      toast.error('Failed to load discussions');
    }
  };

  const loadComments = async () => {
    if (!selectedDiscussion) return;
    try {
      const response = await fetch(`/api/discussions/${selectedDiscussion.id}/comments`);
      const data = await response.json();
      if (data.comments) {
        setComments(data.comments);
        // 为每个comment加载like状态
        data.comments.forEach((comment: Comment) => {
          loadLikeStatus(comment.id, 'comment');
        });
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    }
  };

  const loadLikeStatus = async (targetId: string, targetType: 'discussion' | 'comment') => {
    try {
      const response = await fetch(`/api/discussions/likes?targetType=${targetType}&targetId=${targetId}`);
      const data = await response.json();
      setLikeStatuses(prev => ({
        ...prev,
        [targetId]: data
      }));
    } catch (error) {
      console.error('Error loading like status:', error);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) {
      toast.error('Please enter a topic name');
      return;
    }

    try {
      const response = await fetch('/api/discussions/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTopicName,
          classId: currentClassId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setTopics([data.topic, ...topics]);
      setNewTopicName('');
      setShowNewTopicForm(false);
      toast.success('Topic created successfully');
    } catch (error: any) {
      console.error('Error creating topic:', error);
      toast.error(error.message || 'Failed to create topic');
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussionTitle.trim() || !newDiscussionContent.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    try {
      const response = await fetch(`/api/discussions/topics/${activeTopic}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDiscussionTitle,
          content: newDiscussionContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setDiscussions([data.discussion, ...discussions]);
      setNewDiscussionTitle('');
      setNewDiscussionContent('');
      setShowNewDiscussionForm(false);
      toast.success('Discussion posted successfully');
    } catch (error: any) {
      console.error('Error creating discussion:', error);
      toast.error(error.message || 'Failed to create discussion');
    }
  };

  const handleAddComment = async () => {
    if (!selectedDiscussion || !replyContent.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const response = await fetch(`/api/discussions/${selectedDiscussion.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setComments([...comments, data.comment]);
      setReplyContent('');
      toast.success('Comment added successfully');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    try {
      const response = await fetch(`/api/discussions/${discussionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setDiscussions(discussions.filter(d => d.id !== discussionId));
      if (selectedDiscussion?.id === discussionId) {
        setSelectedDiscussion(null);
        setComments([]);
      }
      toast.success('Discussion deleted successfully');
    } catch (error: any) {
      console.error('Error deleting discussion:', error);
      toast.error(error.message || 'Failed to delete discussion');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/discussions/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      setComments(comments.filter(c => c.id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast.error(error.message || 'Failed to delete comment');
    }
  };

  const handleToggleLike = async (targetId: string, targetType: 'discussion' | 'comment') => {
    try {
      const currentStatus = likeStatuses[targetId];
      const action = currentStatus?.liked ? 'unlike' : 'like';

      const response = await fetch('/api/discussions/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          action
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      setLikeStatuses(prev => ({
        ...prev,
        [targetId]: data
      }));

      // 更新计数
      if (targetType === 'discussion') {
        setDiscussions(discussions.map(d => {
          if (d.id === targetId) {
            return {
              ...d,
              like_count: data.liked ? d.like_count + 1 : Math.max(0, d.like_count - 1)
            };
          }
          return d;
        }));
      } else {
        setComments(comments.map(c => {
          if (c.id === targetId) {
            return {
              ...c,
              like_count: data.liked ? c.like_count + 1 : Math.max(0, c.like_count - 1)
            };
          }
          return c;
        }));
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error(error.message || 'Failed to toggle like');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3e8f4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B882B1] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discussions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3e8f4]">
      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors mb-6"
        >
          <ArrowLeft className="size-5" />
          <span className="text-[14px]">Back to Dashboard</span>
        </button>

        <div className="flex gap-6">
          {/* Left Sidebar - Topics */}
          <div className="w-[280px] shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-sm sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[24px] leading-[1.1]">
                  Topics
                </h2>
                <button
                  onClick={() => setShowNewTopicForm(!showNewTopicForm)}
                  className="size-8 rounded-full bg-[#B882B1] text-white hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <AnimatePresence>
                {showNewTopicForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <Input
                      placeholder="Topic name..."
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateTopic}
                        className="flex-1 bg-[#B882B1] hover:opacity-90"
                      >
                        Create
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewTopicForm(false);
                          setNewTopicName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopic(topic.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      activeTopic === topic.id
                        ? 'bg-[#B882B1] text-white shadow-md'
                        : 'text-[#6a7282] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="size-4" />
                      <span className="text-[14px] line-clamp-2">{topic.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[42px] leading-[1.1] mb-2">
                  Discussions
                </h1>
                <p className="text-[#6a7282] text-[16px]">
                  {topics.find(t => t.id === activeTopic)?.name || 'Select a topic'}
                </p>
              </div>
              {activeTopic && (
                <Button
                  onClick={() => setShowNewDiscussionForm(!showNewDiscussionForm)}
                  className="px-6 py-3 rounded-xl bg-[#B882B1] text-white text-[14px] hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
                >
                  <MessageSquare className="size-4" />
                  New Discussion
                </Button>
              )}
            </div>

            {/* New Discussion Form */}
            <AnimatePresence>
              {showNewDiscussionForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <h3 className="text-[#101828] text-[18px] mb-4">Create New Discussion</h3>
                  <Input
                    placeholder="Discussion title..."
                    value={newDiscussionTitle}
                    onChange={(e) => setNewDiscussionTitle(e.target.value)}
                    className="mb-3"
                  />
                  <Textarea
                    placeholder="What would you like to discuss?"
                    value={newDiscussionContent}
                    onChange={(e) => setNewDiscussionContent(e.target.value)}
                    rows={4}
                    className="mb-3"
                  />
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewDiscussionForm(false);
                        setNewDiscussionTitle('');
                        setNewDiscussionContent('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateDiscussion}
                      className="bg-[#B882B1] hover:opacity-90"
                    >
                      Post Discussion
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discussions List */}
            {discussions.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 shadow-sm text-center">
                <MessageSquare className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6a7282] text-[16px]">No discussions yet</p>
                <p className="text-[#a5acb8] text-[14px] mt-2">Be the first to start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map(discussion => (
                  <motion.div
                    key={discussion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedDiscussion(discussion)}
                  >
                    {/* Discussion Header */}
                    <div className="flex gap-4 mb-4">
                      <div className="size-12 rounded-full bg-gradient-to-br from-[#B882B1] to-[#9A6BA0] flex items-center justify-center text-white font-semibold">
                        {(discussion.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[16px] text-[#101828]">
                            {discussion.profiles?.full_name || 'Unknown User'}
                          </h3>
                          {discussion.author_role === 'teacher' ? (
                            <div className="size-5 rounded-full bg-[#B882B1] flex items-center justify-center">
                              <GraduationCap className="size-3 text-white" />
                            </div>
                          ) : (
                            <div className="size-5 rounded-full bg-[#6a7282] flex items-center justify-center">
                              <User className="size-3 text-white" />
                            </div>
                          )}
                          {discussion.author_id === currentUserId && (
                            <span className="text-[10px] bg-[#3FA11B] text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                          <span className="text-[12px] text-[#a5acb8]">
                            · {formatTimestamp(discussion.created_at)}
                          </span>
                        </div>
                        <h2 className="text-[18px] text-[#101828] mb-2">{discussion.title}</h2>
                        <p className="text-[14px] text-[#6a7282] leading-relaxed">{discussion.content}</p>
                      </div>
                      {discussion.author_id === currentUserId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDiscussion(discussion.id);
                          }}
                          className="size-8 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>

                    {/* Discussion Actions */}
                    <div className="flex items-center gap-6 pl-16">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(discussion.id, 'discussion');
                        }}
                        className="flex items-center gap-1 text-[#6a7282] hover:text-[#3FA11B] transition-colors"
                      >
                        <ThumbsUp className={`size-4 ${likeStatuses[discussion.id]?.liked ? 'fill-current text-[#3FA11B]' : ''}`} />
                        <span className="text-[12px]">{discussion.like_count}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDiscussion(discussion);
                        }}
                        className="flex items-center gap-1 text-[#6a7282] hover:text-[#B882B1] transition-colors"
                      >
                        <MessageSquare className="size-4" />
                        <span className="text-[12px]">
                          {discussion.discussion_comments?.length || 0} comments
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Discussion Detail & Comments */}
            {selectedDiscussion && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h3 className="text-[#101828] text-[20px] mb-6">Comments</h3>

                {/* Comments List */}
                <div className="space-y-4 mb-6">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="size-8 rounded-full bg-gradient-to-br from-[#3FA11B] to-[#2D7F0F] flex items-center justify-center text-white text-sm font-semibold">
                        {(comment.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] text-[#101828]">
                            {comment.profiles?.full_name || 'Unknown User'}
                          </span>
                          {comment.author_role === 'teacher' ? (
                            <div className="size-4 rounded-full bg-[#B882B1] flex items-center justify-center">
                              <GraduationCap className="size-2.5 text-white" />
                            </div>
                          ) : (
                            <div className="size-4 rounded-full bg-[#6a7282] flex items-center justify-center">
                              <User className="size-2.5 text-white" />
                            </div>
                          )}
                          {comment.author_id === currentUserId && (
                            <span className="text-[9px] bg-[#3FA11B] text-white px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                          <span className="text-[11px] text-[#a5acb8]">
                            · {formatTimestamp(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#6a7282] leading-relaxed mb-2">{comment.content}</p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleLike(comment.id, 'comment')}
                            className="flex items-center gap-1 text-[#a5acb8] hover:text-[#3FA11B] transition-colors"
                          >
                            <ThumbsUp className={`size-3 ${likeStatuses[comment.id]?.liked ? 'fill-current text-[#3FA11B]' : ''}`} />
                            <span className="text-[11px]">{comment.like_count}</span>
                          </button>
                        </div>
                      </div>
                      {comment.author_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="size-6 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-gradient-to-br from-[#B882B1] to-[#9A6BA0] flex items-center justify-center text-white text-sm font-semibold">
                    Me
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddComment}
                      size="icon"
                      className="size-8 rounded-lg bg-[#B882B1] hover:opacity-90"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}