import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, Plus, BookOpen, Users, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import svgPaths from "../imports/svg-2v98ntahq0";
import { useLanguage } from "../contexts/LanguageContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatbotProps {
  showOutlineTag?: boolean;
  outlineTitle?: string;
  onRemoveOutlineTag?: () => void;
  prefilledInput?: string;
  onInputChange?: (value: string) => void;
  onSendMessage?: () => void;
  initialContext?: ContextItem;
}

interface ContextItem {
  id: number;
  title: string;
  type: 'class' | 'session' | 'assignment';
}

const suggestions = [
  "How is Jimmy's assignment progress?",
  "Create a schedule for my Machine Learning class",
  "What assignments are due this week?",
  "Show me my overall performance",
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
            d={svgPaths.p1c4d2300}
            fill="#3fa11b"
            id="Star 1"
          />
          <path
            d={svgPaths.p2128f680}
            fill="#3fa11b"
            id="Star 3"
          />
          <path
            d={svgPaths.p1c2ff500}
            fill="#3fa11b"
            id="Star 2"
          />
        </g>
      </svg>
    </div>
  );
}

export default function AIChatbot({
  showOutlineTag,
  outlineTitle,
  onRemoveOutlineTag,
  prefilledInput,
  onInputChange,
  onSendMessage,
  initialContext,
}: AIChatbotProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(prefilledInput || "");
  const [isTyping, setIsTyping] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<'class' | 'session' | 'assignment' | null>(null);
  const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>(initialContext ? [initialContext] : []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextButtonRef = useRef<HTMLButtonElement>(null);

  // Mock data for context items
  const contextData = {
    class: [
      { id: 0, title: 'Machine Learning Fundamentals', type: 'class' as const },
      { id: 1, title: 'Web Development & Design', type: 'class' as const },
    ],
    session: [
      { id: 0, title: 'Neural Networks Deep Dive', type: 'session' as const },
      { id: 1, title: 'Supervised Learning Basics', type: 'session' as const },
    ],
    assignment: [
      { id: 0, title: 'Neural Network Project', type: 'assignment' as const },
      { id: 1, title: 'ML Algorithm Implementation', type: 'assignment' as const },
    ],
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (prefilledInput !== undefined) {
      setInput(prefilledInput);
    }
  }, [prefilledInput]);

  useEffect(() => {
    if (initialContext && !selectedContexts.some(ctx => ctx.id === initialContext.id && ctx.type === initialContext.type)) {
      setSelectedContexts([initialContext]);
    }
  }, [initialContext]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm analyzing your request and will provide you with detailed insights. Based on the current data, I can help you track progress, create schedules, and optimize your learning experience.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);

    if (onSendMessage) {
      onSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    if (onInputChange) {
      onInputChange(suggestion);
    }
  };

  const handleContextSelect = (item: ContextItem) => {
    const exists = selectedContexts.find((c) => c.id === item.id && c.type === item.type);
    if (!exists) {
      setSelectedContexts([...selectedContexts, item]);
    }
    setShowContextMenu(false);
    setHoveredCategory(null);
  };

  const handleRemoveContext = (item: ContextItem) => {
    setSelectedContexts(selectedContexts.filter((c) => !(c.id === item.id && c.type === item.type)));
  };

  const getCategoryIcon = (category: 'class' | 'session' | 'assignment') => {
    switch (category) {
      case 'class':
        return <BookOpen className="size-4 text-[#B882B1]" />;
      case 'session':
        return <Users className="size-4 text-[#3FA11B]" />;
      case 'assignment':
        return <FileText className="size-4 text-[#B882B1]" />;
    }
  };

  const getCategoryColor = (category: 'class' | 'session' | 'assignment') => {
    switch (category) {
      case 'class':
        return '#B882B1';
      case 'session':
        return '#3FA11B';
      case 'assignment':
        return '#B882B1';
    }
  };

  return (
    <div className="h-full bg-white rounded-[20px] border border-gray-200 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-[#f3e8f4]">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h3 className="text-[#101828] text-[18px] font-['Slackey:Regular',sans-serif]">
              Weaver AI
            </h3>
            <p className="text-[#6a7282] text-[13px]">
              {t('ai.title')}
            </p>
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
                  onClick={() =>
                    handleSuggestionClick(suggestion)
                  }
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
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-3 ${message.isUser ? "flex-row-reverse" : "flex-row"} max-w-[85%]`}
                  >
                    {!message.isUser && (
                      <div className="size-8 rounded-full bg-[#B882B1] flex items-center justify-center shrink-0">
                        <Sparkles className="size-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`rounded-[10px] px-4 py-3 break-words ${ 
                        message.isUser
                          ? "bg-gray-100 text-[#101828]"
                          : "bg-[#f3e8f4] border border-[rgba(184,130,177,0.2)] text-[#101828]"
                      }`}
                    >
                      <p className="text-[14px] leading-[20px] break-words">
                        {message.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
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
          {(showOutlineTag && outlineTitle) || selectedContexts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {/* Outline Tag */}
              {showOutlineTag && outlineTitle && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full px-4 py-2">
                  <Sparkles className="size-3 text-[#3FA11B]" />
                  <span className="text-[12px] text-[#101828]">
                    Outline of {outlineTitle}
                  </span>
                  <button
                    onClick={onRemoveOutlineTag}
                    className="size-4 rounded-full hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="size-3 text-[#6a7282]" />
                  </button>
                </div>
              )}
              
              {/* Context Tags */}
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
            onChange={(e) => {
              setInput(e.target.value);
              if (onInputChange) {
                onInputChange(e.target.value);
              }
            }}
            onKeyPress={(e) =>
              e.key === "Enter" && handleSend()
            }
            placeholder={t('ai.placeholder')}
            className="flex-1 outline-none text-[14px] text-[#101828] placeholder:text-[#6a7282]"
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
            disabled={!input.trim()}
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
                onMouseEnter={() => setHoveredCategory('class')}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 transition-colors ${
                  hoveredCategory === 'class' 
                    ? 'bg-[#f3e8f4] text-[#B882B1] border-b-2 border-[#B882B1]' 
                    : 'text-[#6a7282] hover:bg-gray-50'
                }`}
              >
                <BookOpen className="size-4" />
                <span>Classes</span>
              </button>
              <button
                onMouseEnter={() => setHoveredCategory('session')}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 transition-colors ${
                  hoveredCategory === 'session' 
                    ? 'bg-[#E8F5E9] text-[#3FA11B] border-b-2 border-[#3FA11B]' 
                    : 'text-[#6a7282] hover:bg-gray-50'
                }`}
              >
                <Users className="size-4" />
                <span>Sessions</span>
              </button>
              <button
                onMouseEnter={() => setHoveredCategory('assignment')}
                className={`flex-1 px-4 py-3 text-[12px] flex items-center justify-center gap-2 transition-colors ${
                  hoveredCategory === 'assignment' 
                    ? 'bg-[#f3e8f4] text-[#B882B1] border-b-2 border-[#B882B1]' 
                    : 'text-[#6a7282] hover:bg-gray-50'
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
                        <div className={`size-8 rounded-lg flex items-center justify-center ${
                          item.type === 'session' ? 'bg-[#E8F5E9]' : 'bg-[#f3e8f4]'
                        }`}>
                          {getCategoryIcon(item.type)}
                        </div>
                        <span className="text-[13px] text-[#101828] flex-1">{item.title}</span>
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