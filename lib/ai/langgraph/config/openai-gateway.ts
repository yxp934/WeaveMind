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
 * 按照TOON格式输出能力排序
 */
export const AVAILABLE_MODELS = {
  // 当前使用的模型
  DEFAULT: 'meituan/longcat-flash-chat',

  // OpenAI系列
  GPT_4O: 'openai/gpt-4o',
  GPT_4O_MINI: 'openai/gpt-4o-mini',
  GPT_4O_MINI_TRANSLATE: 'openai/gpt-4o-mini-translate',

  // Anthropic系列
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_5_HAIKU: 'anthropic/claude-3.5-haiku',
  CLAUDE_3_HAIKU: 'anthropic/claude-3-haiku',

  // Google系列
  GEMINI_2_0_FLASH: 'google/gemini-2.0-flash-exp',
  GEMINI_1_5_PRO: 'google/gemini-1.5-pro',
  GEMINI_1_5_FLASH: 'google/gemini-1.5-flash',

  // 其他可靠模型
  QWEN_PLUS: 'qwen/qwen-plus',
  QWEN_MAX: 'qwen/qwen-max',
  DEEPSEEK_CHAT: 'deepseek-chat',
} as const;

/**
 * 默认的AI模型配置
 * 使用更稳定、更可靠的模型，确保TOON格式输出
 *
 * 当前推荐: openai/gpt-4o
 * - 测试显示最快响应速度 (1389ms)
 * - 100% TOON格式输出能力
 * - 稳定的中文支持
 * - 高质量的结构化输出
 *
 * 备选: openai/gpt-4o-mini (性价比更高，2003ms响应时间)
 */
export const DEFAULT_MODEL = process.env.AI_MODEL || AVAILABLE_MODELS.GPT_4O;

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(model: string): string {
  const modelNames: Record<string, string> = {
    'meituan/longcat-flash-chat': '美团长猫快聊',
    'openai/gpt-4o': 'OpenAI GPT-4o',
    'openai/gpt-4o-mini': 'OpenAI GPT-4o Mini',
    'openai/gpt-4o-mini-translate': 'OpenAI GPT-4o Mini翻译',
    'anthropic/claude-3.5-sonnet': 'Anthropic Claude 3.5 Sonnet',
    'anthropic/claude-3.5-haiku': 'Anthropic Claude 3.5 Haiku',
    'anthropic/claude-3-haiku': 'Anthropic Claude 3 Haiku',
    'google/gemini-2.0-flash-exp': 'Google Gemini 2.0 Flash',
    'google/gemini-1.5-pro': 'Google Gemini 1.5 Pro',
    'google/gemini-1.5-flash': 'Google Gemini 1.5 Flash',
    'qwen/qwen-plus': '阿里通义千问 Plus',
    'qwen/qwen-max': '阿里通义千问 Max',
    'deepseek-chat': '深度求索 Chat',
  };

  return modelNames[model] || model;
}

/**
 * 验证模型是否可用
 */
export function isModelAvailable(model: string): boolean {
  return Object.values(AVAILABLE_MODELS).includes(model as any);
}
