/**
 * WeaveMind LMS 实时讨论组件测试
 *
 * 测试实时讨论组件的功能，包括帖子显示、回复同步和在线用户状态。
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscussionRealtime } from '../../components/realtime/DiscussionRealtime';

// Mock实时hooks
jest.mock('../../components/realtime/hooks', () => ({
  useDiscussionRealtime: jest.fn(() => ({
    posts: [
      {
        id: '1',
        content: '这是一个测试帖子',
        author_id: 'user1',
        created_at: new Date().toISOString(),
        is_edited: false,
        like_count: 0
      }
    ],
    onlineUsers: [
      {
        id: 'user1',
        username: '测试用户',
        role: 'student',
        is_active: true
      }
    ],
    thread: {
      id: 'thread1',
      title: '测试讨论',
      is_pinned: false,
      is_locked: false,
      participant_count: 1,
      reply_count: 1,
      last_activity_at: new Date().toISOString()
    },
    loading: false,
    error: null,
    connected: true,
    publishPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn()
  }))
}));

jest.mock('../../components/realtime/RealtimeProvider', () => ({
  useRealtime: jest.fn(() => ({
    recordMessage: jest.fn(),
    recordError: jest.fn(),
    handleError: jest.fn()
  }))
}));

// Mock UI组件
jest.mock('../../components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={`card ${className}`} data-testid="card">{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={`card-content ${className}`} data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={`card-header ${className}`} data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={`card-title ${className}`} data-testid="card-title">{children}</h3>
  )
}));

jest.mock('../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant} ${size} ${className}`}
    >
      {children}
    </button>
  )
}));

jest.mock('../../components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      data-testid="input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${className}`}
    />
  )
}));

jest.mock('../../components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, rows, className }: any) => (
    <textarea
      data-testid="textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`textarea ${className}`}
    />
  )
}));

jest.mock('../../components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">{children}</span>
  )
}));

jest.mock('../../components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={`scroll-area ${className}`} data-testid="scroll-area">{children}</div>
  )
}));

// Mock Lucide图标
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Send: () => <div data-testid="send-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Pin: () => <div data-testid="pin-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Clock: () => <div data-testid="clock-icon" />
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2分钟前')
}));

jest.mock('date-fns/locale', () => ({
  zhCN: {}
}));

describe('DiscussionRealtime', () => {
  const defaultProps = {
    threadId: 'thread1',
    className: '',
    onPostUpdate: jest.fn(),
    onThreadUpdate: jest.fn(),
    onOnlineUsersChange: jest.fn(),
    showOnlineUsers: true,
    showThreadInfo: true,
    allowPosting: true,
    allowEditing: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('渲染基本结构', () => {
    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  test('显示讨论帖子信息', () => {
    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByTestId('card-title')).toHaveTextContent('测试讨论');
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    expect(screen.getByTestId('message-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  test('显示在线用户', () => {
    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByText('在线用户:')).toBeInTheDocument();
    expect(screen.getByText('1 人在线')).toBeInTheDocument();
  });

  test('显示帖子列表', () => {
    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByText('这是一个测试帖子')).toBeInTheDocument();
  });

  test('显示连接状态', () => {
    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByText('已连接')).toBeInTheDocument();
  });

  test('点击写回复按钮显示表单', async () => {
    const user = userEvent.setup();
    render(<DiscussionRealtime {...defaultProps} />);

    const writeButton = screen.getByRole('button', { name: /写回复/i });
    await user.click(writeButton);

    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  test('发布新帖子', async () => {
    const user = userEvent.setup();
    const publishPostMock = jest.fn();

    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [],
      onlineUsers: [],
      thread: defaultProps.threadId,
      loading: false,
      error: null,
      connected: true,
      publishPost: publishPostMock,
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    // 打开回复表单
    const writeButton = screen.getByRole('button', { name: /写回复/i });
    await user.click(writeButton);

    // 输入内容
    const textarea = screen.getByTestId('textarea');
    await user.type(textarea, '这是一个新回复');

    // 点击发布
    const sendButton = screen.getByTestId('button');
    await user.click(sendButton);

    expect(publishPostMock).toHaveBeenCalledWith({
      thread_id: 'thread1',
      content: '这是一个新回复',
      author_id: 'current-user-id',
      parent_id: null
    });
  });

  test('编辑帖子', async () => {
    const user = userEvent.setup();
    const updatePostMock = jest.fn();

    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [
        {
          id: '1',
          content: '原始内容',
          author_id: 'user1',
          created_at: new Date().toISOString(),
          is_edited: false,
          like_count: 0
        }
      ],
      onlineUsers: [],
      thread: defaultProps.threadId,
      loading: false,
      error: null,
      connected: true,
      publishPost: jest.fn(),
      updatePost: updatePostMock,
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    // 悬停显示操作按钮
    const postItem = screen.getByText('原始内容').closest('div');
    fireEvent.mouseEnter(postItem!);

    // 点击编辑按钮
    const editButton = screen.getByTestId('edit-icon').closest('button');
    await user.click(editButton!);

    // 修改内容
    const editTextarea = screen.getByTestId('textarea');
    await user.clear(editTextarea);
    await user.type(editTextarea, '修改后的内容');

    // 保存修改
    const saveButton = screen.getByRole('button', { name: /保存/i });
    await user.click(saveButton);

    expect(updatePostMock).toHaveBeenCalledWith('1', '修改后的内容');
  });

  test('删除帖子', async () => {
    const user = userEvent.setup();
    const deletePostMock = jest.fn();
    global.confirm = jest.fn(() => true);

    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [
        {
          id: '1',
          content: '要删除的帖子',
          author_id: 'user1',
          created_at: new Date().toISOString(),
          is_edited: false,
          like_count: 0
        }
      ],
      onlineUsers: [],
      thread: defaultProps.threadId,
      loading: false,
      error: null,
      connected: true,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: deletePostMock
    });

    render(<DiscussionRealtime {...defaultProps} />);

    // 悬停显示操作按钮
    const postItem = screen.getByText('要删除的帖子').closest('div');
    fireEvent.mouseEnter(postItem!);

    // 点击删除按钮
    const deleteButton = screen.getByTestId('trash-icon').closest('button');
    await user.click(deleteButton!);

    expect(global.confirm).toHaveBeenCalledWith('确定要删除这个帖子吗？');
    expect(deletePostMock).toHaveBeenCalledWith('1');
  });

  test('加载状态显示', () => {
    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [],
      onlineUsers: [],
      thread: null,
      loading: true,
      error: null,
      connected: false,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByText(/正在连接实时讨论/i)).toBeInTheDocument();
  });

  test('错误状态显示', () => {
    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [],
      onlineUsers: [],
      thread: null,
      loading: false,
      error: new Error('连接失败'),
      connected: false,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByText(/连接失败: 连接失败/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新连接/i })).toBeInTheDocument();
  });

  test('空状态显示', () => {
    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [],
      onlineUsers: [],
      thread: {
        id: 'thread1',
        title: '测试讨论',
        is_pinned: false,
        is_locked: false,
        participant_count: 0,
        reply_count: 0,
        last_activity_at: new Date().toISOString()
      },
      loading: false,
      error: null,
      connected: true,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByText(/还没有帖子，成为第一个发帖的人吧！/i)).toBeInTheDocument();
  });

  test('禁用发帖功能', () => {
    render(<DiscussionRealtime {...defaultProps} allowPosting={false} />);

    expect(screen.queryByRole('button', { name: /写回复/i })).not.toBeInTheDocument();
  });

  test('帖子锁定状态', () => {
    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [],
      onlineUsers: [],
      thread: {
        id: 'thread1',
        title: '测试讨论',
        is_pinned: false,
        is_locked: true, // 锁定状态
        participant_count: 0,
        reply_count: 0,
        last_activity_at: new Date().toISOString()
      },
      loading: false,
      error: null,
      connected: true,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /写回复/i })).not.toBeInTheDocument();
  });

  test('帖子置顶状态', () => {
    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    useDiscussionRealtime.mockReturnValue({
      posts: [],
      onlineUsers: [],
      thread: {
        id: 'thread1',
        title: '测试讨论',
        is_pinned: true, // 置顶状态
        is_locked: false,
        participant_count: 0,
        reply_count: 0,
        last_activity_at: new Date().toISOString()
      },
      loading: false,
      error: null,
      connected: true,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    render(<DiscussionRealtime {...defaultProps} />);

    expect(screen.getByTestId('pin-icon')).toBeInTheDocument();
  });

  test('自动滚动到最新帖子', async () => {
    const { useDiscussionRealtime } = require('../../components/realtime/hooks');
    const mockScrollIntoView = jest.fn();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = mockScrollIntoView;

    const { rerender } = render(<DiscussionRealtime {...defaultProps} />);

    // 模拟新帖子添加
    useDiscussionRealtime.mockReturnValue({
      posts: [
        {
          id: '1',
          content: '第一个帖子',
          author_id: 'user1',
          created_at: new Date().toISOString(),
          is_edited: false,
          like_count: 0
        },
        {
          id: '2',
          content: '第二个帖子',
          author_id: 'user2',
          created_at: new Date().toISOString(),
          is_edited: false,
          like_count: 0
        }
      ],
      onlineUsers: [],
      thread: defaultProps.threadId,
      loading: false,
      error: null,
      connected: true,
      publishPost: jest.fn(),
      updatePost: jest.fn(),
      deletePost: jest.fn()
    });

    rerender(<DiscussionRealtime {...defaultProps} />);

    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });
});
