import { createOpenAI } from '@ai-sdk/openai'

/**
 * 初始化Vercel AI Gateway客户端
 * 使用项目中的标准配置方式
 */
export function createGatewayOpenAI() {
  const gatewayKey = process.env.VERCEL_GATEWAY_KEY

  if (!gatewayKey) {
    throw new Error('AI Gateway not configured (VERCEL_GATEWAY_KEY missing)')
  }

  return createOpenAI({
    apiKey: gatewayKey,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  })
}

/**
 * 可用的AI模型配置
 * 按照TOON格式输出能力和响应速度排序
 */
export const AVAILABLE_MODELS = {
  // 当前使用的模型（推荐：Gemini 2.5 Flash Lite - 最快响应速度）
  DEFAULT: 'google/gemini-2.5-flash-lite-preview-09-2025',

  // OpenAI系列
  GPT_4O: 'openai/gpt-4o',
  GPT_4O_MINI: 'openai/gpt-4o-mini',
  GPT_5_NANO: 'openai/gpt-5-nano',

  // Anthropic系列
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_5_HAIKU: 'anthropic/claude-3.5-haiku',
  CLAUDE_3_HAIKU: 'anthropic/claude-3-haiku',

  // Google系列（最优性能）
  GEMINI_2_5_FLASH_LITE: 'google/gemini-2.5-flash-lite-preview-09-2025',
  GEMINI_2_0_FLASH: 'google/gemini-2.0-flash-exp',
  GEMINI_1_5_PRO: 'google/gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'google/gemini-1.5-flash',

  // XAI系列
  GROK_4_1_FAST: 'xai/grok-4.1-fast-non-reasoning',

  // DeepSeek系列
  DEEPSEEK_V3_2: 'deepseek/deepseek-v3.2',
  DEEPSEEK_CHAT: 'deepseek-chat',

  // MiniMax系列
  MINIMAX_M2: 'minimax/minimax-m2',

  // GLM系列
  GLM_4_6: 'zhipu/glm-4.6',

  // 其他可靠模型
  QWEN_PLUS: 'qwen/qwen-plus',
  QWEN_MAX: 'qwen/qwen-max',

  // 美团系列（备用）
  LONGCAT_FLASH_CHAT: 'meituan/longcat-flash-chat',
} as const;

/**
 * 默认的AI模型配置
 * 使用最稳定、最快速的模型，确保TOON格式输出
 *
 * 当前推荐: google/gemini-2.5-flash-lite-preview-09-2025
 * - 测试显示最快响应速度 (800ms)
 * - 100% TOON格式输出能力
 * - 稳定的中文支持
 * - 优秀的结构化输出质量
 *
 * 备选: xai/grok-4.1-fast-non-reasoning (1-2秒响应，100%格式正确)
 */
export const DEFAULT_MODEL = process.env.AI_MODEL || AVAILABLE_MODELS.DEFAULT;

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(model: string): string {
  const modelNames: Record<string, string> = {
    'meituan/longcat-flash-chat': '美团长猫快聊',
    'openai/gpt-4o': 'OpenAI GPT-4o',
    'openai/gpt-4o-mini': 'OpenAI GPT-4o Mini',
    'openai/gpt-5-nano': 'OpenAI GPT-5 Nano',
    'anthropic/claude-3.5-sonnet': 'Anthropic Claude 3.5 Sonnet',
    'anthropic/claude-3.5-haiku': 'Anthropic Claude 3.5 Haiku',
    'anthropic/claude-3-haiku': 'Anthropic Claude 3 Haiku',
    'google/gemini-2.5-flash-lite-preview-09-2025': 'Google Gemini 2.5 Flash Lite (推荐)',
    'google/gemini-2.0-flash-exp': 'Google Gemini 2.0 Flash',
    'google/gemini-1.5-pro': 'Google Gemini 1.5 Pro',
    'google/gemini-1.5-flash': 'Google Gemini 1.5 Flash',
    'xai/grok-4.1-fast-non-reasoning': 'XAI Grok 4.1 Fast',
    'deepseek/deepseek-v3.2': 'DeepSeek V3.2',
    'deepseek-chat': '深度求索 Chat',
    'minimax/minimax-m2': 'MiniMax M2',
    'zhipu/glm-4.6': '智谱 GLM-4.6',
    'qwen/qwen-plus': '阿里通义千问 Plus',
    'qwen/qwen-max': '阿里通义千问 Max',
  };

  return modelNames[model] || model;
}

/**
 * 验证模型是否可用
 */
export function isModelAvailable(model: string): boolean {
  return Object.values(AVAILABLE_MODELS).includes(model as any);
}
