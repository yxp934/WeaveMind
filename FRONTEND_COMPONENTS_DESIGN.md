# AI Chatbot工作流工具前端组件设计

## 1. 组件架构概览

### 1.1 设计原则
- **模块化设计**: 每个组件都是独立的、可复用的模块
- **响应式布局**: 适配桌面、平板、手机等多种设备
- **无障碍访问**: 遵循WCAG 2.1 AA标准
- **主题一致性**: 统一的设计语言和视觉风格
- **性能优化**: 懒加载、虚拟滚动、代码分割
- **TypeScript支持**: 完整的类型定义

### 1.2 技术栈
- **React 18**: 核心UI框架
- **Next.js 14**: 应用框架 (App Router)
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Framer Motion**: 动画库
- **Zustand**: 状态管理
- **React Query**: 数据获取和缓存
- **React Hook Form**: 表单处理
- **Lucide React**: 图标库

## 2. 核心组件设计

### 2.1 ChatbotInterface - 主聊天界面组件

```typescript
interface ChatbotInterfaceProps {
  // 基础配置
  userRole: 'teacher' | 'student'
  initialContext?: ChatContext
  theme?: 'light' | 'dark' | 'auto'
  language?: 'zh' | 'en'

  // 工作流配置
  defaultWorkflowType?: WorkflowType
  enableWorkflows?: boolean
  autoSaveWorkflows?: boolean

  // 交互配置
  showTypingIndicator?: boolean
  showMessageTimestamps?: boolean
  enableVoiceInput?: boolean
  enableFileUpload?: boolean

  // 回调函数
  onWorkflowCreate?: (workflow: WorkflowContext) => void
  onWorkflowUpdate?: (workflow: WorkflowContext) => void
  onMessageSent?: (message: ChatMessage) => void
  onToolExecute?: (tool: AITool, params: any) => void
  onError?: (error: Error) => void
}

const ChatbotInterface: React.FC<ChatbotInterfaceProps> = ({
  userRole,
  initialContext,
  theme = 'auto',
  language = 'zh',
  defaultWorkflowType = 'outline_generation',
  enableWorkflows = true,
  autoSaveWorkflows = true,
  showTypingIndicator = true,
  showMessageTimestamps = true,
  enableVoiceInput = false,
  enableFileUpload = true,
  onWorkflowCreate,
  onWorkflowUpdate,
  onMessageSent,
  onToolExecute,
  onError
}) => {
  // 状态管理
  const [isMinimized, setIsMinimized] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowContext | null>(null)

  // 组件实现
  return (
    <ThemeProvider theme={theme}>
      <div className="chatbot-interface">
        {!isMinimized && (
          <motion.div
            className="fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border z-50 flex flex-col"
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <ChatbotHeader
              userRole={userRole}
              currentWorkflow={currentWorkflow}
              onMinimize={() => setIsMinimized(true)}
              onToggleTools={() => setShowTools(!showTools)}
            />

            {showTools && (
              <ToolSelector
                userRole={userRole}
                currentWorkflow={currentWorkflow}
                onToolSelect={handleToolSelect}
                onWorkflowCreate={handleWorkflowCreate}
              />
            )}

            <ChatMessages
              messages={messages}
              showTimestamps={showMessageTimestamps}
              showTypingIndicator={showTypingIndicator}
              onMessageAction={handleMessageAction}
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              onVoiceInput={enableVoiceInput ? handleVoiceInput : undefined}
              onFileUpload={enableFileUpload ? handleFileUpload : undefined}
              disabled={isLoading}
            />
          </motion.div>
        )}

        {isMinimized && (
          <ChatbotMinimizedButton
            onClick={() => setIsMinimized(false)}
            unreadCount={unreadCount}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default ChatbotInterface
```

### 2.2 ChatbotHeader - 聊天头部组件

```typescript
interface ChatbotHeaderProps {
  userRole: 'teacher' | 'student'
  currentWorkflow?: WorkflowContext | null
  onMinimize: () => void
  onToggleTools: () => void
  onWorkflowPause?: () => void
  onWorkflowResume?: () => void
  onWorkflowCancel?: () => void
}

const ChatbotHeader: React.FC<ChatbotHeaderProps> = ({
  userRole,
  currentWorkflow,
  onMinimize,
  onToggleTools,
  onWorkflowPause,
  onWorkflowResume,
  onWorkflowCancel
}) => {
  const getRoleIcon = () => {
    switch (userRole) {
      case 'teacher': return <GraduationCap className="w-4 h-4" />
      case 'student': return <User className="w-4 h-4" />
      default: return <Bot className="w-4 h-4" />
    }
  }

  const getRoleLabel = () => {
    switch (userRole) {
      case 'teacher': return '教师助手'
      case 'student': return '学习助手'
      default: return 'AI助手'
    }
  }

  return (
    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-t-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {getRoleIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              {getRoleLabel()}
            </h3>
            {currentWorkflow && (
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {currentWorkflow.type}
                </Badge>
                <ProgressIndicator
                  progress={currentWorkflow.progress}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {currentWorkflow && (
            <WorkflowControls
              workflow={currentWorkflow}
              onPause={onWorkflowPause}
              onResume={onWorkflowResume}
              onCancel={onWorkflowCancel}
            />
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleTools}
                  className="h-8 w-8 p-0"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI工具</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMinimize}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>最小化</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
```

### 2.3 ToolSelector - 工具选择器组件

```typescript
interface ToolSelectorProps {
  userRole: 'teacher' | 'student'
  currentWorkflow?: WorkflowContext | null
  onToolSelect: (tool: AITool) => void
  onWorkflowCreate: (type: WorkflowType) => void
  className?: string
}

const ToolSelector: React.FC<ToolSelectorProps> = ({
  userRole,
  currentWorkflow,
  onToolSelect,
  onWorkflowCreate,
  className
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const availableTools = useMemo(() => {
    return getAvailableToolsForRole(userRole, currentWorkflow)
  }, [userRole, currentWorkflow])

  const categories = useMemo(() => {
    const cats = new Set(availableTools.map(tool => tool.category))
    return ['all', ...Array.from(cats)]
  }, [availableTools])

  const filteredTools = useMemo(() => {
    return selectedCategory === 'all'
      ? availableTools
      : availableTools.filter(tool => tool.category === selectedCategory)
  }, [availableTools, selectedCategory])

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={cn("border-b bg-gray-50 dark:bg-gray-800", className)}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            AI工具
          </h4>

          {/* 工作流快速创建 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-3 h-3 mr-1" />
                新建工作流
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onWorkflowCreate('outline_generation')}>
                <FileText className="w-4 h-4 mr-2" />
                课程大纲生成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onWorkflowCreate('a2a_session_generation')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                会话内容生成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onWorkflowCreate('combined')}>
                <Layers className="w-4 h-4 mr-2" />
                完整课程创建
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 类别筛选 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs"
            >
              {getCategoryLabel(category)}
            </Button>
          ))}
        </div>

        {/* 工具网格 */}
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {filteredTools.map(tool => (
            <TooltipProvider key={tool.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToolSelect(tool)}
                    className="justify-start text-xs h-auto p-2"
                    disabled={currentWorkflow?.status === 'running'}
                  >
                    <tool.icon className="w-3 h-3 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium truncate">{tool.name}</div>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs mt-1", getCategoryColor(tool.category))}
                      >
                        {getCategoryLabel(tool.category)}
                      </Badge>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tool.description}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    all: '全部',
    outline: '大纲生成',
    session: '会话生成',
    edit: '内容编辑',
    analyze: '分析工具',
    course: '课程管理',
    discussion: '讨论管理',
    assessment: '评估工具',
    progress: '进度分析',
    communication: '沟通工具'
  }
  return labels[category] || category
}
```

### 2.4 ChatMessages - 聊天消息组件

```typescript
interface ChatMessagesProps {
  messages: ChatMessage[]
  showTimestamps?: boolean
  showTypingIndicator?: boolean
  onMessageAction?: (messageId: string, action: MessageAction) => void
  className?: string
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  showTimestamps = true,
  showTypingIndicator = true,
  onMessageAction,
  className
}) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <ScrollArea className={cn("flex-1 p-4", className)}>
      <div className="space-y-4">
        {messages.length === 0 && (
          <WelcomeMessage userRole={getCurrentUserRole()} />
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              showTimestamp={showTimestamps}
              onAction={onMessageAction}
              isLast={index === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* 打字指示器 */}
        {showTypingIndicator && typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  showTimestamp: boolean
  onAction?: (messageId: string, action: MessageAction) => void
  isLast: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  showTimestamp,
  onAction,
  isLast
}) => {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3",
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* 头像 */}
      {!isUser && (
        <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600">
          <Bot className="w-4 h-4 text-white" />
        </Avatar>
      )}

      <div className={cn(
        "max-w-[80%] group",
        isUser ? 'ml-auto' : ''
      )}>
        <div className={cn(
          "rounded-lg p-3 relative",
          isUser
            ? 'bg-blue-500 text-white'
            : isSystem
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
        )}>
          <MessageContent message={message} />

          {/* 消息操作按钮 */}
          {onAction && message.actions && (
            <MessageActions
              actions={message.actions}
              onAction={(action) => onAction(message.id, action)}
            />
          )}
        </div>

        {/* 时间戳 */}
        {showTimestamp && (
          <div className={cn(
            "text-xs text-muted-foreground mt-1",
            isUser ? 'text-right' : 'text-left'
          )}>
            {formatMessageTime(message.timestamp)}
          </div>
        )}
      </div>

      {/* 用户头像 */}
      {isUser && (
        <Avatar className="w-8 h-8 bg-gray-500">
          <User className="w-4 h-4 text-white" />
        </Avatar>
      )}
    </motion.div>
  )
}

const MessageContent: React.FC<{ message: ChatMessage }> = ({ message }) => {
  return (
    <div className="text-sm whitespace-pre-wrap">
      {message.type === 'text' && (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            code: ({ children, className }) => {
              const isInline = !className
              return isInline ? (
                <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs">
                  {children}
                </code>
              ) : (
                <pre className="bg-gray-200 dark:bg-gray-600 p-2 rounded text-xs overflow-x-auto">
                  <code>{children}</code>
                </pre>
              )
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}

      {message.type === 'tool_suggestion' && (
        <ToolSuggestionDisplay suggestion={message.toolSuggestion} />
      )}

      {message.type === 'workflow_update' && (
        <WorkflowUpdateDisplay update={message.workflowUpdate} />
      )}

      {message.attachments && (
        <MessageAttachments attachments={message.attachments} />
      )}
    </div>
  )
}
```

### 2.5 ChatInput - 聊天输入组件

```typescript
interface ChatInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void
  onVoiceInput?: () => void
  onFileUpload?: (files: File[]) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onVoiceInput,
  onFileUpload,
  disabled = false,
  placeholder = "输入你的消息...",
  maxLength = 4000,
  className
}) => {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() && files.length === 0) return

    onSendMessage(input.trim(), files)
    setInput('')
    setFiles([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
    onFileUpload?.(selectedFiles)
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleRecording = () => {
    if (isRecording) {
      // 停止录音
      setIsRecording(false)
      onVoiceInput?.()
    } else {
      // 开始录音
      setIsRecording(true)
    }
  }

  return (
    <div className={cn("p-4 border-t bg-white dark:bg-gray-900", className)}>
      {/* 文件附件预览 */}
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <FilePreview
              key={index}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className="pr-20 resize-none min-h-[40px] max-h-32"
            rows={1}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
            {/* 文件上传 */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <Paperclip className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>添加附件</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* 语音输入 */}
            {onVoiceInput && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-6 w-6 p-0",
                        isRecording && "text-red-500"
                      )}
                      onClick={toggleRecording}
                    >
                      <Mic className={cn("w-3 h-3", isRecording && "animate-pulse")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isRecording ? '停止录音' : '语音输入'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={disabled || (!input.trim() && files.length === 0)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* 隐藏的文件输入 */}
      <input
        id="file-input"
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.txt"
      />
    </div>
  )
}
```

## 3. 工作流组件设计

### 3.1 WorkflowPanel - 工作流面板组件

```typescript
interface WorkflowPanelProps {
  workflow?: WorkflowContext | null
  onWorkflowStart?: (type: WorkflowType) => void
  onWorkflowPause?: () => void
  onWorkflowResume?: () => void
  onWorkflowCancel?: () => void
  onWorkflowStepClick?: (stepId: string) => void
  className?: string
}

const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  workflow,
  onWorkflowStart,
  onWorkflowPause,
  onWorkflowResume,
  onWorkflowCancel,
  onWorkflowStepClick,
  className
}) => {
  if (!workflow) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center">
          <WorkflowIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">AI工作流</h3>
          <p className="text-sm text-muted-foreground mb-4">
            创建和管理AI辅助的内容生成工作流
          </p>

          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => onWorkflowStart?.('outline_generation')}
              className="justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              创建课程大纲
            </Button>

            <Button
              onClick={() => onWorkflowStart?.('a2a_session_generation')}
              variant="outline"
              className="justify-start"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              生成会话内容
            </Button>

            <Button
              onClick={() => onWorkflowStart?.('combined')}
              variant="outline"
              className="justify-start"
            >
              <Layers className="w-4 h-4 mr-2" />
              完整课程创建
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* 工作流头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <WorkflowStatusBadge status={workflow.status} />
            <div>
              <h3 className="font-semibold">{getWorkflowTypeLabel(workflow.type)}</h3>
              <p className="text-sm text-muted-foreground">
                {workflow.progress.completedSteps.length} / {workflow.steps.length} 步骤完成
              </p>
            </div>
          </div>

          <WorkflowControls
            workflow={workflow}
            onPause={onWorkflowPause}
            onResume={onWorkflowResume}
            onCancel={onWorkflowCancel}
          />
        </div>

        {/* 进度条 */}
        <WorkflowProgressBar
          progress={workflow.progress}
          className="mb-4"
        />

        {/* 步骤指示器 */}
        <WorkflowSteps
          steps={workflow.steps}
          currentStepId={workflow.currentStep.id}
          completedStepIds={workflow.progress.completedSteps}
          onStepClick={onWorkflowStepClick}
        />

        {/* 当前步骤详情 */}
        {workflow.currentStep && (
          <CurrentStepDetails
            step={workflow.currentStep}
            onAction={handleStepAction}
          />
        )}

        {/* 错误信息 */}
        {workflow.error && (
          <WorkflowErrorDisplay
            error={workflow.error}
            onRetry={handleRetry}
            onDismiss={handleDismissError}
          />
        )}
      </div>
    </Card>
  )
}
```

### 3.2 WorkflowProgressBar - 工作流进度条组件

```typescript
interface WorkflowProgressBarProps {
  progress: ProgressMetrics
  showPercentage?: boolean
  showTimeEstimate?: boolean
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({
  progress,
  showPercentage = true,
  showTimeEstimate = true,
  animated = true,
  size = 'md',
  className
}) => {
  const getStatusColor = () => {
    if (progress.percentage >= 100) return 'green'
    if (progress.percentage >= 70) return 'blue'
    if (progress.percentage >= 30) return 'yellow'
    return 'gray'
  }

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500'
  }

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">进度</span>
        <div className="flex items-center space-x-3">
          {showPercentage && (
            <span className="text-muted-foreground">
              {progress.percentage}%
            </span>
          )}
          {showTimeEstimate && progress.estimatedTimeRemaining > 0 && (
            <span className="text-muted-foreground">
              预计剩余 {formatDuration(progress.estimatedTimeRemaining)}
            </span>
          )}
        </div>
      </div>

      <div className={cn(
        "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <motion.div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            colorClasses[getStatusColor()],
            animated && "animate-pulse"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* 分段进度指示器 */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {progress.milestones?.map((milestone, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col items-center",
              progress.percentage >= milestone.percentage && "text-foreground"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full mb-1",
              progress.percentage >= milestone.percentage
                ? colorClasses[getStatusColor()]
                : "bg-gray-300"
            )} />
            <span className="text-center">{milestone.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3.3 WorkflowSteps - 工作流步骤组件

```typescript
interface WorkflowStepsProps {
  steps: WorkflowStep[]
  currentStepId?: string
  completedStepIds: string[]
  failedStepIds?: string[]
  onStepClick?: (stepId: string) => void
  orientation?: 'horizontal' | 'vertical'
  showDescriptions?: boolean
  className?: string
}

const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  steps,
  currentStepId,
  completedStepIds = [],
  failedStepIds = [],
  onStepClick,
  orientation = 'horizontal',
  showDescriptions = true,
  className
}) => {
  const getStepStatus = (step: WorkflowStep) => {
    if (failedStepIds.includes(step.id)) return 'failed'
    if (completedStepIds.includes(step.id)) return 'completed'
    if (step.id === currentStepId) return 'current'
    return 'pending'
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4" />
      case 'current': return <Play className="w-4 h-4" />
      case 'failed': return <X className="w-4 h-4" />
      default: return <div className="w-4 h-4 rounded-full border-2" />
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 border-green-500 text-white'
      case 'current': return 'bg-blue-500 border-blue-500 text-white'
      case 'failed': return 'bg-red-500 border-red-500 text-white'
      default: return 'bg-gray-100 border-gray-300 text-gray-500'
    }
  }

  return (
    <div className={cn(
      "flex",
      orientation === 'vertical' ? 'flex-col space-y-4' : 'flex-row items-center space-x-4',
      className
    )}>
      {steps.map((step, index) => {
        const status = getStepStatus(step)
        const isClickable = onStepClick && (status === 'completed' || status === 'current')
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className={cn(
            "flex items-center",
            orientation === 'vertical' ? 'mb-4' : 'mr-4'
          )}>
            <button
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                getStepColor(status),
                isClickable && "hover:scale-110 cursor-pointer",
                !isClickable && "cursor-not-allowed opacity-50"
              )}
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
            >
              {getStepIcon(status)}
            </button>

            <div className={cn(
              "ml-3 text-sm",
              orientation === 'vertical' && "text-left",
              (status === 'completed' || status === 'current') ? "font-medium" : "text-muted-foreground"
            )}>
              <div>{step.title}</div>
              {showDescriptions && step.description && (
                <div className="text-xs text-muted-foreground mt-1 max-w-48">
                  {step.description}
                </div>
              )}
            </div>

            {/* 连接线 */}
            {!isLast && orientation === 'horizontal' && (
              <div className={cn(
                "ml-4 w-8 h-px",
                completedStepIds.includes(step.id) ? "bg-green-500" : "bg-gray-300"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

## 4. 交互组件设计

### 4.1 MultiChoiceGroup - 多选按钮组组件

```typescript
interface MultiChoiceGroupProps {
  question: string
  description?: string
  options: ChoiceOption[]
  selected?: string[]
  onSelectionChange?: (selection: string[]) => void
  allowMultiple?: boolean
  layout?: 'vertical' | 'horizontal' | 'grid'
  required?: boolean
  error?: string
  className?: string
}

interface ChoiceOption {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<any>
  disabled?: boolean
}

const MultiChoiceGroup: React.FC<MultiChoiceGroupProps> = ({
  question,
  description,
  options,
  selected = [],
  onSelectionChange,
  allowMultiple = false,
  layout = 'vertical',
  required = false,
  error,
  className
}) => {
  const handleSelection = (optionId: string) => {
    if (allowMultiple) {
      const newSelection = selected.includes(optionId)
        ? selected.filter(id => id !== optionId)
        : [...selected, optionId]
      onSelectionChange?.(newSelection)
    } else {
      onSelectionChange?.([optionId])
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="font-medium text-sm">{question}</h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>

      <div className={cn(
        "space-y-2",
        layout === 'grid' && "grid grid-cols-2 gap-2",
        layout === 'horizontal' && "flex gap-2 flex-wrap"
      )}>
        {options.map(option => (
          <Button
            key={option.id}
            variant={selected.includes(option.id) ? "default" : "outline"}
            className={cn(
              "justify-start text-left h-auto p-3",
              option.disabled && "opacity-50 cursor-not-allowed",
              layout === 'horizontal' && "flex-1 min-w-0"
            )}
            onClick={() => !option.disabled && handleSelection(option.id)}
            disabled={option.disabled}
          >
            <div className="flex items-start space-x-3 w-full">
              {option.icon && (
                <option.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                )}
              </div>
              {selected.includes(option.id) && (
                <Check className="w-4 h-4 flex-shrink-0" />
              )}
            </div>
          </Button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
```

### 4.2 SliderInput - 滑块输入组件

```typescript
interface SliderInputProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange?: (value: number) => void
  showValue?: boolean
  showMarks?: boolean
  marks?: { [key: number]: string }
  disabled?: boolean
  required?: boolean
  error?: string
  className?: string
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  showValue = true,
  showMarks = false,
  marks = {},
  disabled = false,
  required = false,
  error,
  className
}) => {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (newValue: number) => {
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  const formatMarkValue = (val: number) => {
    return marks[val] || val.toString()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {showValue && (
          <span className="text-sm text-muted-foreground">
            {internalValue}{unit}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="relative px-2">
        <Slider
          value={[internalValue]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onValueChange={(values) => handleChange(values[0])}
          className="w-full"
        />

        {showMarks && Object.keys(marks).length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {Object.keys(marks).map((markValue) => (
              <div key={markValue} className="flex flex-col items-center">
                <div className="w-px h-2 bg-gray-300 mb-1" />
                <span>{formatMarkValue(parseInt(markValue))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
```

### 4.3 InteractiveForm - 交互式表单组件

```typescript
interface InteractiveFormProps {
  title: string
  description?: string
  steps: FormStep[]
  initialData?: Record<string, any>
  onComplete: (data: Record<string, any>) => void
  onCancel?: () => void
  showProgress?: boolean
  allowBack?: boolean
  className?: string
}

interface FormStep {
  id: string
  title: string
  description?: string
  component: React.ComponentType<FormStepProps>
  validation?: (data: any) => ValidationResult
  required?: boolean
}

interface FormStepProps {
  data: Record<string, any>
  onChange: (data: Record<string, any>) => void
  onNext?: () => void
  onBack?: () => void
  isValid?: boolean
  isFirst?: boolean
  isLast?: boolean
}

const InteractiveForm: React.FC<InteractiveFormProps> = ({
  title,
  description,
  steps,
  initialData = {},
  onComplete,
  onCancel,
  showProgress = true,
  allowBack = true,
  className
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [formData, setFormData] = useState(initialData)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const currentStep = steps[currentStepIndex]
  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === steps.length - 1
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleDataChange = (newData: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...newData }))
  }

  const validateCurrentStep = (): boolean => {
    if (!currentStep.validation) return true

    const result = currentStep.validation(formData)
    setValidationErrors(result.errors)
    return result.isValid
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return

    if (isLast) {
      onComplete(formData)
    } else {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (allowBack && !isFirst) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const StepComponent = currentStep.component

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* 头部 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* 进度条 */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>步骤 {currentStepIndex + 1} / {steps.length}</span>
            <span>{Math.round(progress)}% 完成</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              index < currentStepIndex ? "bg-green-500 text-white" :
              index === currentStepIndex ? "bg-blue-500 text-white" :
              "bg-gray-200 text-gray-600"
            )}>
              {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 h-px mx-2",
                index < currentStepIndex ? "bg-green-500" : "bg-gray-300"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 当前步骤内容 */}
      <Card className="p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">{currentStep.title}</h3>
          {currentStep.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {currentStep.description}
            </p>
          )}
        </div>

        <StepComponent
          data={formData}
          onChange={handleDataChange}
          onNext={handleNext}
          onBack={handleBack}
          isValid={Object.keys(validationErrors).length === 0}
          isFirst={isFirst}
          isLast={isLast}
        />
      </Card>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          {allowBack && !isFirst && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              上一步
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}

          <Button onClick={handleNext}>
            {isLast ? '完成' : '下一步'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## 5. 状态可视化组件

### 5.1 StatusBadge - 状态徽章组件

```typescript
interface StatusBadgeProps {
  status: WorkflowState | ToolStatus | string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  animated?: boolean
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  size = 'md',
  showIcon = true,
  animated = false,
  className
}) => {
  const statusConfig = getStatusConfig(status)

  return (
    <Badge
      variant={variant}
      className={cn(
        "inline-flex items-center gap-1",
        size === 'sm' && "text-xs px-2 py-0.5",
        size === 'lg' && "text-sm px-3 py-1",
        animated && "animate-pulse",
        className
      )}
      style={{
        backgroundColor: statusConfig.color,
        borderColor: statusConfig.color,
        color: 'white'
      }}
    >
      {showIcon && (
        <statusConfig.icon className={cn(
          size === 'sm' && "w-3 h-3",
          size === 'md' && "w-3.5 h-3.5",
          size === 'lg' && "w-4 h-4"
        )} />
      )}
      {statusConfig.label}
    </Badge>
  )
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; icon: any; color: string }> = {
    // 工作流状态
    initializing: { label: '初始化', icon: Clock, color: '#6B7280' },
    collecting_requirements: { label: '收集中', icon: MessageSquare, color: '#3B82F6' },
    generating_outline: { label: '生成大纲', icon: FileText, color: '#8B5CF6' },
    confirming_outline: { label: '确认大纲', icon: CheckCircle, color: '#10B981' },
    planning_sessions: { label: '规划会话', icon: Calendar, color: '#F59E0B' },
    generating_content: { label: '生成内容', icon: Sparkles, color: '#EC4899' },
    refining_content: { label: '细化内容', icon: Settings, color: '#6366F1' },
    finalizing: { label: '最终确定', icon: Check, color: '#059669' },
    completed: { label: '已完成', icon: CheckCircle, color: '#059669' },
    error: { label: '错误', icon: XCircle, color: '#EF4444' },
    cancelled: { label: '已取消', icon: X, color: '#6B7280' },

    // 工具状态
    queued: { label: '队列中', icon: Clock, color: '#6B7280' },
    running: { label: '运行中', icon: Play, color: '#3B82F6' },
    failed: { label: '失败', icon: XCircle, color: '#EF4444' },

    // 默认状态
    pending: { label: '待处理', icon: Clock, color: '#6B7280' },
    success: { label: '成功', icon: CheckCircle, color: '#059669' },
    warning: { label: '警告', icon: AlertTriangle, color: '#F59E0B' },
    info: { label: '信息', icon: Info, color: '#3B82F6' }
  }

  return configs[status] || { label: status, icon: Info, color: '#6B7280' }
}
```

### 5.2 ProgressRing - 环形进度组件

```typescript
interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  showPercentage?: boolean
  animated?: boolean
  children?: React.ReactNode
  className?: string
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  showPercentage = true,
  animated = true,
  children,
  className
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className={cn(
          "transform -rotate-90",
          animated && "transition-all duration-500 ease-in-out"
        )}
      >
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>

      {/* 中心内容 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <div className="text-center">
            <div className="text-xl font-bold">{Math.round(progress)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 6. 动画和过渡效果

### 6.1 页面过渡动画

```typescript
const pageTransitions = {
  // 淡入淡出
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },

  // 滑动进入
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: "easeOut" }
  },

  // 缩放动画
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2 }
  },

  // 组合动画
  slideScale: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.3, ease: "easeOut" }
  }
}
```

### 6.2 交互动画

```typescript
// 按钮悬停效果
const buttonHoverVariants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
}

// 卡片悬停效果
const cardHoverVariants = {
  hover: {
    y: -4,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.3 }
  }
}

// 加载动画
const loadingSpinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

// 进度条动画
const progressBarVariants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.8, ease: "easeOut" }
  })
}
```

## 7. 响应式设计

### 7.1 断点配置

```typescript
const breakpoints = {
  sm: '640px',   // 小型设备
  md: '768px',   // 平板设备
  lg: '1024px',  // 桌面设备
  xl: '1280px',  // 大桌面设备
  '2xl': '1536px' // 超大桌面设备
}

// 响应式工具类
const responsiveUtils = {
  // 隐藏/显示
  hideOnMobile: 'hidden sm:block',
  showOnMobile: 'block sm:hidden',

  // 布局调整
  gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  flexDirection: 'flex-col sm:flex-row',

  // 间距调整
  padding: 'p-4 sm:p-6 lg:p-8',
  margin: 'mx-4 sm:mx-6 lg:mx-8'
}
```

### 7.2 移动端优化

```typescript
// 移动端聊天界面
const MobileChatbotInterface: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
      {/* 全屏聊天界面 */}
      <div className="h-full flex flex-col">
        <MobileHeader />
        <ChatMessages className="flex-1" />
        <MobileInput />
      </div>
    </div>
  )
}

// 响应式工具面板
const ResponsiveToolSelector: React.FC = () => {
  return (
    <>
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:block w-80 border-r bg-gray-50 dark:bg-gray-800">
        <ToolSelector />
      </div>

      {/* 移动端底部抽屉 */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="lg:hidden fixed bottom-4 right-4 z-40">
            <Zap className="w-4 h-4 mr-2" />
            AI工具
          </Button>
        </SheetTrigger>
        <SheetContent>
          <ToolSelector />
        </SheetContent>
      </Sheet>
    </>
  )
}
```

## 8. 性能优化

### 8.1 组件懒加载

```typescript
// 路由级别的代码分割
const LazyChatbotInterface = lazy(() => import('./ChatbotInterface'))
const LazyWorkflowPanel = lazy(() => import('./WorkflowPanel'))
const LazyToolSelector = lazy(() => import('./ToolSelector'))

// 组件懒加载包装器
const LazyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense fallback={<ComponentSkeleton />}>
      {children}
    </Suspense>
  )
}

// 使用示例
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/chat" element={
          <LazyWrapper>
            <LazyChatbotInterface />
          </LazyWrapper>
        } />
      </Routes>
    </Router>
  )
}
```

### 8.2 虚拟滚动

```typescript
import { FixedSizeList as List } from 'react-window'

// 消息列表虚拟滚动
const VirtualizedMessageList: React.FC<{
  messages: ChatMessage[]
  height: number
  itemHeight: number
}> = ({ messages, height, itemHeight }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  )

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

这个前端组件设计文档提供了完整的AI chatbot工作流工具前端组件架构，包括了所有核心组件的设计规范、交互模式、状态管理、动画效果和性能优化策略。设计遵循现代React最佳实践，具有良好的可维护性和可扩展性。