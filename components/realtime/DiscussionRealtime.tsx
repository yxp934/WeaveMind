/**
 * WeaveMind LMS 实时讨论组件
 *
 * 这个组件提供实时讨论功能，包括帖子更新、回复同步和在线用户状态显示。
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  Users,
  MessageCircle,
  Send,
  Edit3,
  Trash2,
  Pin,
  Lock,
  Eye,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 导入实时hooks
import { useDiscussionRealtime } from './hooks';
import { useRealtime } from './RealtimeProvider';

// 类型定义
interface DiscussionRealtimeProps {
  threadId: string;
  className?: string;
  onPostUpdate?: (post: any) => void;
  onThreadUpdate?: (update: any) => void;
  onOnlineUsersChange?: (users: any[]) => void;
  showOnlineUsers?: boolean;
  showThreadInfo?: boolean;
  allowPosting?: boolean;
  allowEditing?: boolean;
}

/**
 * 实时讨论组件
 *
 * 提供完整的实时讨论功能，包括帖子显示、回复同步和在线用户状态。
 */
export function DiscussionRealtime({
  threadId,
  className = '',
  onPostUpdate,
  onThreadUpdate,
  onOnlineUsersChange,
  showOnlineUsers = true,
  showThreadInfo = true,
  allowPosting = true,
  allowEditing = true
}: DiscussionRealtimeProps) {
  // 状态管理
  const [newPostContent, setNewPostContent] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);

  // 使用实时hooks
  const {
    posts,
    onlineUsers,
    thread,
    loading,
    error,
    connected,
    publishPost,
    updatePost,
    deletePost
  } = useDiscussionRealtime(threadId);

  // 使用实时上下文
  const { recordMessage, recordError, handleError } = useRealtime();

  // 引用
  const postsEndRef = useRef<HTMLDivElement>(null);
  const newPostInputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    postsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 自动滚动
  useEffect(() => {
    if (posts.length > 0) {
      scrollToBottom();
    }
  }, [posts, scrollToBottom]);

  // 回调处理
  useEffect(() => {
    if (onPostUpdate && posts.length > 0) {
      const latestPost = posts[posts.length - 1];
      onPostUpdate(latestPost);
    }
  }, [posts, onPostUpdate]);

  useEffect(() => {
    if (onThreadUpdate && thread) {
      onThreadUpdate(thread);
    }
  }, [thread, onThreadUpdate]);

  useEffect(() => {
    if (onOnlineUsersChange) {
      onOnlineUsersChange(onlineUsers);
    }
  }, [onlineUsers, onOnlineUsersChange]);

  // 发布新帖子
  const handlePublishPost = useCallback(async () => {
    if (!newPostContent.trim()) return;

    try {
      await publishPost({
        thread_id: threadId,
        content: newPostContent.trim(),
        author_id: 'current-user-id', // 实际应该从认证上下文获取
        parent_id: null
      });

      setNewPostContent('');
      setShowNewPostForm(false);
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('发布帖子失败'));
      recordError();
    }
  }, [newPostContent, threadId, publishPost, recordMessage, handleError]);

  // 编辑帖子
  const handleEditPost = useCallback(async (postId: string) => {
    if (!editContent.trim()) return;

    try {
      await updatePost(postId, editContent.trim());
      setEditingPostId(null);
      setEditContent('');
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('更新帖子失败'));
      recordError();
    }
  }, [editContent, updatePost, recordMessage, handleError]);

  // 删除帖子
  const handleDeletePost = useCallback(async (postId: string) => {
    if (!confirm('确定要删除这个帖子吗？')) return;

    try {
      await deletePost(postId);
      recordMessage();
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('删除帖子失败'));
      recordError();
    }
  }, [deletePost, recordMessage, handleError]);

  // 开始编辑
  const startEditing = useCallback((post: any) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  }, []);

  // 取消编辑
  const cancelEditing = useCallback(() => {
    setEditingPostId(null);
    setEditContent('');
  }, []);

  // 连接状态显示
  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">正在连接实时讨论...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>连接失败: {error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              重新连接
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${!connected ? 'opacity-75' : ''}`}>
      {/* 头部信息 */}
      {(showThreadInfo && thread) && (
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center space-x-2">
                <span>{thread.title}</span>
                {thread.is_pinned && <Pin className="h-4 w-4 text-yellow-500" />}
                {thread.is_locked && <Lock className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{thread.participant_count} 参与者</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>{thread.reply_count} 回复</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDistanceToNow(new Date(thread.last_activity_at), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </span>
                </span>
              </div>
            </div>

            {/* 连接状态指示器 */}
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xs text-gray-500">
                {connected ? '已连接' : '已断开'}
              </span>
            </div>
          </div>

          {/* 在线用户 */}
          {showOnlineUsers && onlineUsers.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">在线用户:</span>
                <div className="flex -space-x-2">
                  {onlineUsers.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="h-8 w-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                      title={user.username}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {onlineUsers.length > 5 && (
                    <div className="h-8 w-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs">
                      +{onlineUsers.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {onlineUsers.length} 人在线
                </span>
              </div>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="p-0">
        {/* 帖子列表 */}
        <ScrollArea className="h-96 p-6">
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>还没有帖子，成为第一个发帖的人吧！</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  isEditing={editingPostId === post.id}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onEdit={() => startEditing(post)}
                  onCancelEdit={cancelEditing}
                  onSaveEdit={() => handleEditPost(post.id)}
                  onDelete={() => handleDeletePost(post.id)}
                  allowEditing={allowEditing}
                />
              ))
            )}
            <div ref={postsEndRef} />
          </div>
        </ScrollArea>

        {/* 新帖子表单 */}
        {allowPosting && !thread?.is_locked && (
          <div className="border-t p-6">
            {!showNewPostForm ? (
              <Button
                variant="outline"
                onClick={() => setShowNewPostForm(true)}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                写回复...
              </Button>
            ) : (
              <div className="space-y-4">
                <Textarea
                  ref={newPostInputRef}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="写下你的想法..."
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewPostForm(false);
                      setNewPostContent('');
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePublishPost}
                    disabled={!newPostContent.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    发布
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 帖子项组件
 */
interface PostItemProps {
  post: any;
  isEditing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  allowEditing: boolean;
}

function PostItem({
  post,
  isEditing,
  editContent,
  setEditContent,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  allowEditing
}: PostItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex space-x-3">
        {/* 头像 */}
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
          {post.author_id?.charAt(0).toUpperCase() || 'U'}
        </div>

        {/* 帖子内容 */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-3">
            {/* 帖子头部 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">用户 {post.author_id?.slice(-4)}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: zhCN
                  })}
                </span>
                {post.is_edited && (
                  <Badge variant="secondary" className="text-xs">
                    已编辑
                  </Badge>
                )}
              </div>

              {/* 操作按钮 */}
              {showActions && allowEditing && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="h-6 w-6 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* 帖子内容 */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={onCancelEdit}>
                    取消
                  </Button>
                  <Button size="sm" onClick={onSaveEdit}>
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap break-words">
                {post.content}
              </div>
            )}
          </div>

          {/* 帖子底部 */}
          {!isEditing && (
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                {post.parent_id && (
                  <span>回复给帖子 {post.parent_id.slice(-4)}</span>
                )}
                <span className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{post.like_count || 0}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
