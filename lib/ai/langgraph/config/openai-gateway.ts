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
 * 默认的AI模型配置
 * 使用项目中实际可用的模型
 */
export const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite'
