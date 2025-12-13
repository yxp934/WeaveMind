"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Sparkles,
  X,
  Plus,
  BookOpen,
  Users,
  FileText,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatbotStore } from "@/lib/store/chatbot-store";
import { cn } from "@/lib/utils";

interface SidebarChatbotProps {
  userRole?: "teacher" | "student" | "self-learner";
  classId?: string;
  courseId?: string;
  // 动态上下文数据：从TeacherDashboard传入真实的班级/课次/作业
  contexts?: {
    classes?: { id: string; title: string }[];
    sessions?: { id: string; title: string; className?: string }[];
    assignments?: { id: string; title: string; className?: string }[];
  };
  onClose?: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  tool: string;
  status: "pending" | "running" | "completed" | "error";
  result?: any;
  error?: string;
}

const suggestions = [
  "帮我创建一个神经科学的入门课",
  "生成课程大纲",
  "使用A2A优化内容",
  "分析学生学习进度",
];

function Logo() {
  return (
    <div className="h-[28px] w-[27px] shrink-0">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 36 38"
      >
        <g id="Logo">
          <path
            d="M18 0L22.5 13.5L36 18L22.5 22.5L18 36L13.5 22.5L0 18L13.5 13.5L18 0Z"
            fill="#B882B1"
          />
          <path
            d="M18 4L21 13L30 16L21 19L18 28L15 19L6 16L15 13L18 4Z"
            fill="#F3E8F4"
          />
          <path
            d="M18 8L20 13L25 15L20 17L18 22L16 17L11 15L16 13L18 8Z"
            fill="#FFFFFF"
          />
        </g>
      </svg>
    </div>
  );
}

export default function SidebarChatbot({
  userRole = "teacher",
  classId,
  courseId,
  contexts,
  onClose,
}: SidebarChatbotProps) {
  const { messages, isLoading, workflow, error, sendMessage, clearMessages } =
    useChatbotStore();

  const [input, setInput] = useState("");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<
    "class" | "session" | "assignment" | null
  >(null);
  const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextButtonRef = useRef<HTMLButtonElement>(null);

  // 真实上下文数据（从Teacher Dashboard传入）；如果无数据，回退为空数组
  const contextData = useMemo(
    () => ({
      class: (contexts?.classes || []).map((c) => ({
        id: c.id,
        title: c.title,
        type: "class" as const,
      })),
      session: (contexts?.sessions || []).map((s) => ({
        id: s.id,
        title: s.className ? `${s.className} - ${s.title}` : s.title,
        type: "session" as const,
      })),
      assignment: (contexts?.assignments || []).map((a) => ({
        id: a.id,
        title: a.className ? `${a.className} - ${a.title}` : a.title,
        type: "assignment" as const,
      })),
    }),
    [contexts],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const messageContent = input.trim();
    setInput("");

    // 选中的上下文透传到后端，便于LangGraph执行真实CRUD
    const selectedClassId =
      selectedContexts.find((c) => c.type === "class")?.id || classId;
    const selectedSessionId =
      selectedContexts.find((c) => c.type === "session")?.id || undefined;
    const selectedAssignmentId =
      selectedContexts.find((c) => c.type === "assignment")?.id || undefined;

    await sendMessage(messageContent, {
      userRole,
      classId: selectedClassId,
      courseId,
      selectedClassId,
      selectedSessionId,
      selectedAssignmentId,
      selectedContexts,
      stream: true, // 启用流式输出
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleContextSelect = (item: ContextItem) => {
    const exists = selectedContexts.find(
      (c) => c.id === item.id && c.type === item.type,
    );
    if (!exists) {
      setSelectedContexts([...selectedContexts, item]);
    }
    setShowContextMenu(false);
    setHoveredCategory(null);
  };

  const handleRemoveContext = (item: ContextItem) => {
    setSelectedContexts(
      selectedContexts.filter(
        (c) => !(c.id === item.id && c.type === item.type),
      ),
    );
  };

  const handleClearChat = () => {
    if (confirm("确定要清除所有聊天记录吗？")) {
      clearMessages();
    }
  };

  const getCategoryIcon = (category: "class" | "session" | "assignment") => {
    switch (category) {
      case "class":
        return <BookOpen className="size-4 text-[#B882B1]" />;
      case "session":
        return <Users className="size-4 text-[#3FA11B]" />;
      case "assignment":
        return <FileText className="size-4 text-[#B882B1]" />;
    }
  };

  const getCategoryColor = (category: "class" | "session" | "assignment") => {
    switch (category) {
      case "class":
        return "#B882B1";
      case "session":
        return "#3FA11B";
      case "assignment":
        return "#B882B1";
    }
  };

  // 渲染消息内容，支持Markdown格式
  const renderMessageContent = (content: string) => {
    return content.split("\n").map((line, index) => {
      // 处理标题 (# ## ###)
      if (line.startsWith("### ")) {
        return (
          <h3
            key={index}
            className="text-[16px] font-semibold mt-3 mb-2 text-[#101828]"
          >
            {line.substring(4)}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2
            key={index}
            className="text-[18px] font-semibold mt-4 mb-2 text-[#101828]"
          >
            {line.substring(3)}
          </h2>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h1
            key={index}
            className="text-[20px] font-bold mt-4 mb-3 text-[#101828]"
          >
            {line.substring(2)}
          </h1>
        );
      }

      // 处理粗体文本
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = line.split(boldRegex);

      return (
        <p key={index} className="text-[14px] leading-[20px] break-words mb-1">
          {parts.map((part, partIndex) =>
            partIndex % 2 === 1 ? (
              <strong key={partIndex} className="font-semibold">
                {part}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      );
    });
  };

  return (
    <div className="h-full bg-white rounded-[20px] border border-gray-200 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-[#f3e8f4]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h3 className="text-[#101828] text-[18px] font-['Slackey:Regular',sans-serif]">
                Weaver AI
              </h3>
              <p className="text-[#6a7282] text-[13px]">智能学习助手</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              title="清除聊天"
            >
              <Trash2 className="size-4 text-[#6a7282]" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="size-4 text-[#6a7282]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#89BCFF]/20 to-[#FF86E1]/20 blur-3xl" />
              <Logo />
            </div>
            <p className="text-[#101828] text-[20px] mb-6 font-['Slackey:Regular',sans-serif]">
              How can I help you?
            </p>
            <p className="text-[#6a7282] text-[14px] mb-6">
              Suggestions on what to ask
            </p>
            <div className="grid grid-cols-1 gap-3 w-full">
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-[12px] px-4 py-3 text-left text-[#101828] text-[14px] hover:bg-white/60 hover:shadow-lg hover:border-gray-300 transition-all hover:-translate-y-0.5"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"} max-w-[85%]`}
                  >
                    {message.role !== "user" && (
                      <div className="size-8 rounded-full bg-[#B882B1] flex items-center justify-center shrink-0">
                        <Sparkles className="size-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`rounded-[10px] px-4 py-3 break-words ${
                        message.role === "user"
                          ? "bg-gray-100 text-[#101828]"
                          : "bg-[#f3e8f4] border border-[rgba(184,130,177,0.2)] text-[#101828]"
                      }`}
                    >
                      {/* 工具调用圆块 */}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {message.toolCalls.map((toolCall, index) => (
                            <div
                              key={index}
                              className="inline-flex items-center gap-1 bg-white/80 rounded-full px-2 py-1 text-xs"
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  toolCall.status === "completed"
                                    ? "bg-[#3FA11B]"
                                    : toolCall.status === "error"
                                      ? "bg-red-500"
                                      : toolCall.status === "running"
                                        ? "bg-[#B882B1] animate-pulse"
                                        : "bg-gray-400"
                                }`}
                              />
                              <span className="text-[#101828]">
                                {toolCall.tool}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 消息内容 */}
                      <div>{renderMessageContent(message.content)}</div>

                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="size-8 rounded-full bg-[#B882B1] flex items-center justify-center shrink-0">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div className="bg-[#f3e8f4] border border-[rgba(184,130,177,0.2)] rounded-[10px] px-4 py-3">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0,
                      }}
                      className="size-2 bg-[#B882B1] rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                      className="size-2 bg-[#B882B1] rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.4,
                      }}
                      className="size-2 bg-[#B882B1] rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200">
        {/* Context Tags and Outline Tag */}
        <AnimatePresence>
          {selectedContexts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {selectedContexts.map((context) => (
                <div
                  key={`${context.type}-${context.id}`}
                  className="inline-flex items-center gap-2 bg-white/40 backdrop-blur-xl border border-white/40 rounded-full px-4 py-2"
                >
                  {getCategoryIcon(context.type)}
                  <span className="text-[12px] text-[#101828]">
                    {context.title}
                  </span>
                  <button
                    onClick={() => handleRemoveContext(context)}
                    className="size-4 rounded-full hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="size-3 text-[#6a7282]" />
                  </button>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-[8px] px-4 py-3 focus-within:border-[#B882B1] transition-colors relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的问题或需求..."
            className="flex-1 outline-none text-[14px] text-[#101828] placeholder:text-[#6a7282]"
            disabled={isLoading}
          />
          <button
            ref={contextButtonRef}
            onClick={() => setShowContextMenu(!showContextMenu)}
            className="size-9 rounded-lg border border-gray-300 flex items-center justify-center hover:border-[#B882B1] hover:bg-[#f3e8f4] transition-colors"
          >
            <Plus className="size-4 text-[#6a7282]" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="size-9 rounded-lg bg-[#B882B1] flex items-center justify-center hover:bg-[#a06e9d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="size-4 text-white" />
          </button>
        </div>
      </div>

      {/* Context Selection Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-24 right-6 bg-white rounded-xl border border-gray-200 shadow-lg z-50 w-[420px]"
          >
            {/* Category Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onMouseEnter={() => setHoveredCategory("class")}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 transition-colors ${
                  hoveredCategory === "class"
                    ? "bg-[#f3e8f4] text-[#B882B1] border-b-2 border-[#B882B1]"
                    : "text-[#6a7282] hover:bg-gray-50"
                }`}
              >
                <BookOpen className="size-4" />
                <span>Classes</span>
              </button>
              <button
                onMouseEnter={() => setHoveredCategory("session")}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 transition-colors ${
                  hoveredCategory === "session"
                    ? "bg-[#E8F5E9] text-[#3FA11B] border-b-2 border-[#3FA11B]"
                    : "text-[#6a7282] hover:bg-gray-50"
                }`}
              >
                <Users className="size-4" />
                <span>Sessions</span>
              </button>
              <button
                onMouseEnter={() => setHoveredCategory("assignment")}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 transition-colors ${
                  hoveredCategory === "assignment"
                    ? "bg-[#f3e8f4] text-[#B882B1] border-b-2 border-[#B882B1]"
                    : "text-[#6a7282] hover:bg-gray-50"
                }`}
              >
                <FileText className="size-4" />
                <span>Assignments</span>
              </button>
            </div>

            {/* List Items */}
            <div className="p-3 max-h-[240px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {hoveredCategory ? (
                  <motion.div
                    key={hoveredCategory}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2"
                  >
                    {contextData[hoveredCategory].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleContextSelect(item)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                      >
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center ${
                            item.type === "session"
                              ? "bg-[#E8F5E9]"
                              : "bg-[#f3e8f4]"
                          }`}
                        >
                          {getCategoryIcon(item.type)}
                        </div>
                        <span className="text-[13px] text-[#101828] flex-1">
                          {item.title}
                        </span>
                        <Plus className="size-4 text-[#6a7282] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-[13px] text-[#6a7282]">
                    Hover over a category to see items
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ContextItem {
  id: string;
  title: string;
  type: "class" | "session" | "assignment";
}
