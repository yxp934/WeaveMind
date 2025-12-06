# WeaveMind LMS 实时功能系统

## 概述

WeaveMind LMS实时功能系统为学习管理平台提供了完整的实时通信能力，支持讨论、通知、学习进度跟踪和AI聊天等功能的实时更新。系统采用现代化的技术栈，确保高性能、高可靠性和良好的用户体验。

## 技术架构

### 核心组件

1. **后端实时管理器**
   - `DiscussionRealtimeManager` - 讨论实时更新系统
   - `NotificationRealtimeManager` - 通知实时推送系统
   - `ProgressRealtimeManager` - 学习进度实时跟踪
   - `AIChatRealtimeManager` - AI聊天实时功能

2. **性能优化系统**
   - `RealtimeConnectionManager` - 连接池管理
   - `CacheManager` - 缓存策略管理
   - `RealtimeEventHandler` - 事件处理器

3. **前端UI组件**
   - `DiscussionRealtime` - 实时讨论组件
   - `NotificationRealtime` - 实时通知组件
   - `ProgressRealtime` - 实时进度组件
   - `AIChatRealtime` - 实时AI聊天组件

4. **实时上下文系统**
   - `RealtimeProvider` - 全局实时功能提供者
   - 自定义Hooks - 简化实时功能使用

### 技术栈

- **后端**: Next.js 15 + TypeScript + Supabase Realtime
- **前端**: React 18 + TypeScript + Tailwind CSS
- **数据库**: PostgreSQL + pgvector
- **实时通信**: Supabase Realtime + WebSocket
- **状态管理**: React Context + Custom Hooks

## 功能特性

### 1. 讨论实时更新系统

**功能特点**:
- 实时监听讨论帖子更新
- 实时显示新帖子和回复
- 在线用户状态显示
- 支持实时编辑和删除
- 实时通知和提示

**使用示例**:
```tsx
import { DiscussionRealtime } from '@/components/realtime';

function MyDiscussion() {
  return (
    <DiscussionRealtime
      threadId="thread-123"
      showOnlineUsers={true}
      allowPosting={true}
      onPostUpdate={(post) => console.log('新帖子:', post)}
    />
  );
}
```

### 2. 通知实时推送系统

**功能特点**:
- 实时推送新通知
- 实时显示通知状态更新
- 通知已读/未读状态同步
- 实时通知计数更新
- 支持批量通知操作

**使用示例**:
```tsx
import { NotificationRealtime } from '@/components/realtime';

function MyNotifications() {
  return (
    <NotificationRealtime
      userId="user-123"
      showBadge={true}
      position="dropdown"
      onNotificationClick={(notification) => {
        console.log('点击通知:', notification);
      }}
    />
  );
}
```

### 3. 学习进度实时跟踪

**功能特点**:
- 实时跟踪学习进度更新
- 实时显示任务完成状态
- 实时同步学习路径进度
- 实时显示学习活动
- 进度变化动画效果

**使用示例**:
```tsx
import { ProgressRealtime } from '@/components/realtime';

function MyProgress() {
  return (
    <ProgressRealtime
      userId="user-123"
      courseId="course-456"
      animated={true}
      showDetails={true}
      onProgressUpdate={(progress) => {
        console.log('进度更新:', progress);
      }}
    />
  );
}
```

### 4. AI聊天实时功能

**功能特点**:
- 实时AI响应流式传输
- 实时工具调用结果展示
- 实时对话状态同步
- 支持多用户AI对话
- 实时AI建议推送

**使用示例**:
```tsx
import { AIChatRealtime } from '@/components/realtime';

function MyAIChat() {
  return (
    <AIChatRealtime
      sessionId="session-789"
      userId="user-123"
      contextType="course"
      showSuggestions={true}
      onMessageSend={(message) => {
        console.log('发送消息:', message);
      }}
    />
  );
}
```

## 开发指南

### 环境设置

1. **安装依赖**
```bash
npm install @supabase/supabase-js date-fns lucide-react
```

2. **环境变量配置**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. **数据库配置**
确保Supabase数据库中已创建以下表：
- `discussion_threads` - 讨论帖子
- `discussion_posts` - 讨论回复
- `notifications` - 通知系统
- `self_learner_pathway_progress` - 学习路径进度
- `self_learner_activities` - 学习活动
- `ai_chat_sessions` - AI聊天会话
- `chat_messages` - 聊天消息

### 快速开始

1. **包装实时Provider**
```tsx
import { RealtimeProvider } from '@/components/realtime';

export default function App({ children }) {
  return (
    <RealtimeProvider enableAutoConnect={true}>
      {children}
    </RealtimeProvider>
  );
}
```

2. **使用实时组件**
```tsx
import { DiscussionRealtime, NotificationRealtime } from '@/components/realtime';

export default function Dashboard() {
  return (
    <div>
      <NotificationRealtime position="dropdown" />
      <DiscussionRealtime threadId="thread-123" />
    </div>
  );
}
```

### 自定义Hook使用

```tsx
import { useDiscussionRealtime } from '@/components/realtime';

function CustomComponent() {
  const {
    posts,
    onlineUsers,
    connected,
    publishPost,
    loading,
    error
  } = useDiscussionRealtime('thread-123');

  const handlePublish = async () => {
    await publishPost({
      thread_id: 'thread-123',
      content: '新帖子内容',
      author_id: 'user-123',
      parent_id: null
    });
  };

  return (
    <div>
      {loading ? <div>加载中...</div> : null}
      {error ? <div>错误: {error.message}</div> : null}
      <div>连接状态: {connected ? '已连接' : '已断开'}</div>
      <div>帖子数量: {posts.length}</div>
      <div>在线用户: {onlineUsers.length}</div>
    </div>
  );
}
```

## API参考

### 实时管理器API

#### DiscussionRealtimeManager
```typescript
// 订阅讨论帖子
subscribeToThread(threadId: string, callback: (update: ThreadUpdate) => void): Promise<UnsubscribeFunction>

// 订阅帖子更新
subscribeToPosts(threadId: string, callback: (post: Post) => void): Promise<UnsubscribeFunction>

// 订阅在线用户
subscribeToOnlineUsers(threadId: string, callback: (users: OnlineUser[]) => void): Promise<UnsubscribeFunction>

// 发布新帖子
publishNewPost(threadId: string, postData: PostData): Promise<void>

// 更新帖子
updatePost(postId: string, content: string): Promise<void>

// 删除帖子
deletePost(postId: string, threadId: string): Promise<void>
```

#### NotificationRealtimeManager
```typescript
// 订阅用户通知
subscribeToUserNotifications(userId: string, callback: (notification: Notification) => void): Promise<UnsubscribeFunction>

// 发送通知
sendNotification(notificationData: NotificationData): Promise<void>

// 标记为已读
markAsRead(notificationId: string): Promise<void>

// 批量标记为已读
markAllAsRead(userId: string): Promise<void>

// 批量操作通知
batchOperation(operation: BatchNotificationOperation): Promise<void>

// 获取通知统计
getNotificationStats(userId: string): Promise<NotificationStats>
```

### 前端组件API

#### DiscussionRealtimeProps
```typescript
interface DiscussionRealtimeProps {
  threadId: string;                    // 讨论帖子ID
  className?: string;                  // CSS类名
  onPostUpdate?: (post: Post) => void; // 帖子更新回调
  onThreadUpdate?: (update: ThreadUpdate) => void; // 帖子更新回调
  onOnlineUsersChange?: (users: OnlineUser[]) => void; // 在线用户变更回调
  showOnlineUsers?: boolean;           // 是否显示在线用户
  showThreadInfo?: boolean;            // 是否显示帖子信息
  allowPosting?: boolean;              // 是否允许发帖
  allowEditing?: boolean;              // 是否允许编辑
}
```

#### NotificationRealtimeProps
```typescript
interface NotificationRealtimeProps {
  userId?: string;                     // 用户ID
  className?: string;                  // CSS类名
  maxNotifications?: number;           // 最大通知数量
  showBadge?: boolean;                 // 是否显示徽章
  showActions?: boolean;               // 是否显示操作按钮
  showFilter?: boolean;                // 是否显示过滤器
  autoOpen?: boolean;                  // 是否自动打开
  position?: 'dropdown' | 'sidebar' | 'overlay'; // 位置
  onNotificationClick?: (notification: Notification) => void; // 点击回调
  onMarkAsRead?: (notificationId: string) => void; // 标记已读回调
  onMarkAllAsRead?: () => void;        // 全部标记已读回调
}
```

## 性能优化

### 连接管理
- 连接池管理，自动清理空闲连接
- 自动重连机制，支持指数退避
- 连接状态监控和健康检查

### 数据优化
- 增量数据更新，避免全量刷新
- 数据压缩和序列化
- 智能缓存策略（LRU/LFU/TTL）
- 批量更新处理

### UI优化
- 虚拟滚动支持大量数据
- 防抖处理用户输入
- 懒加载非关键组件
- 内存泄漏防护

## 错误处理

### 连接错误
- 自动重连机制
- 友好的错误提示
- 离线状态检测
- 网络恢复处理

### 数据错误
- 完整的错误边界
- 数据验证和清理
- 回退机制
- 错误日志记录

## 安全考虑

### 数据安全
- 基于用户角色的访问控制
- 多租户数据隔离
- 敏感信息过滤
- 实时操作审计

### 网络安全
- 传输加密
- 输入验证
- SQL注入防护
- XSS攻击防护

## 测试

### 单元测试
```bash
npm run test:realtime
```

### 集成测试
```bash
npm run test:integration
```

### E2E测试
```bash
npm run test:e2e
```

## 监控和日志

### 性能监控
- 连接建立时间
- 消息延迟统计
- 吞吐量监控
- 错误率统计

### 日志系统
- 结构化日志记录
- 错误追踪
- 性能指标收集
- 用户行为分析

## 故障排除

### 常见问题

1. **连接失败**
   - 检查网络连接
   - 验证Supabase配置
   - 查看错误日志

2. **消息延迟**
   - 检查服务器性能
   - 优化网络带宽
   - 调整批量处理大小

3. **内存泄漏**
   - 及时取消订阅
   - 清理无用引用
   - 监控内存使用

### 调试工具
- 实时连接状态监控
- 消息流追踪
- 性能指标查看
- 错误日志分析

## 部署指南

### 生产环境配置
```typescript
const productionConfig = {
  connection: {
    heartbeat_interval: 30000,
    reconnect_interval: 5000,
    max_reconnect_attempts: 5
  },
  performance: {
    batch_size: 10,
    compression_enabled: true,
    cache_ttl: 300000
  },
  security: {
    enable_rls: true,
    audit_logging: true,
    rate_limiting: true
  }
};
```

### 监控配置
- 性能指标告警
- 错误率阈值设置
- 连接状态监控
- 用户体验追踪

## 版本历史

### v1.0.0 (当前版本)
- ✅ 讨论实时更新系统
- ✅ 通知实时推送系统
- ✅ 学习进度实时跟踪
- ✅ AI聊天实时功能
- ✅ 性能优化和错误处理
- ✅ 完整的UI组件库
- ✅ 测试套件

### 计划功能
- 🔄 语音通话实时功能
- 🔄 视频会议实时功能
- 🔄 白板协作实时功能
- 🔄 文件共享实时功能

## 贡献指南

### 开发环境设置
1. Fork项目仓库
2. 创建功能分支
3. 提交代码更改
4. 创建Pull Request

### 代码规范
- 遵循TypeScript严格模式
- 使用ESLint和Prettier
- 编写完整的测试用例
- 提供详细的文档

## 许可证

本项目采用MIT许可证。详情请参阅LICENSE文件。

## 联系方式

- 项目主页: https://github.com/your-org/weavemind-lms
- 问题反馈: https://github.com/your-org/weavemind-lms/issues
- 讨论区: https://github.com/your-org/weavemind-lms/discussions

---

**注意**: 本文档会随着项目发展持续更新。如有问题或建议，请通过上述渠道联系我们。
