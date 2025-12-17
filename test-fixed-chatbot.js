#!/usr/bin/env node

/**
 * 测试修复后的Chatbot系统
 * 验证：
 * 1. 预设消息问题是否修复
 * 2. TOON格式是否正确处理
 * 3. 新模型是否正常工作
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const gatewayKey = process.env.VERCEL_GATEWAY_KEY;
if (!gatewayKey) {
  console.error('错误: 缺少VERCEL_GATEWAY_KEY环境变量');
  process.exit(1);
}

const openai = createOpenAI({
  apiKey: gatewayKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// 使用新的最优模型
const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite-preview-09-2025';

// 简化提示词
const systemPrompt = `You are WeaveMind's teacher assistant. You help teachers manage classes, sessions, and assignments.

IMPORTANT: Always respond in Chinese.

OUTPUT FORMAT:
You must output in TOON format using exactly this structure:
---BEGIN_TOON---
message: [your helpful response here]
next_action: ask_user
---END_TOON---

Or when proposing a tool:
---BEGIN_TOON---
message: [explanation of what you will do]
next_action: propose_tool
proposed_tool:
  toolName: [tool name]
  input: [tool parameters]
---END_TOON---

RULES:
- Be helpful and explain what you're doing
- Always use the exact format above
- Keep responses concise and focused`;

const testMessages = [
  '你好',
  '请列出班级',
  '我想创建一个班级',
];

async function testFixedChatbot() {
  console.log('🚀 测试修复后的Chatbot系统');
  console.log(`📋 使用模型: ${DEFAULT_MODEL}`);
  console.log('='.repeat(80));

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n📝 测试 ${i + 1}/${testMessages.length}: "${message}"`);

    try {
      const { text } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
        maxTokens: 800,
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(30000),
      });

      console.log(`⏱️ 响应时间: ${Date.now() - Date.now()}ms`);
      console.log(`📄 完整响应:`);
      console.log(text);

      // 检查是否包含预设消息
      const presetMessages = [
        '我是WeaveMind的教师助手',
        '我是用于帮助教师管理课堂的助手系统',
        '您好！我是WeaveMind AI学习助手'
      ];

      const hasPresetMessage = presetMessages.some(preset => text.includes(preset));
      if (hasPresetMessage) {
        console.log(`❌ 检测到预设消息！`);
      } else {
        console.log(`✅ 无预设消息`);
      }

      // 检查TOON格式
      if (text.includes('---BEGIN_TOON---') && text.includes('---END_TOON---')) {
        console.log(`✅ 包含TOON格式标记`);
      } else {
        console.log(`❌ 缺少TOON格式标记`);
      }

      // 检查message字段
      if (text.includes('message:')) {
        console.log(`✅ 包含message字段`);
      } else {
        console.log(`❌ 缺少message字段`);
      }

    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}`);
    }

    console.log('-'.repeat(80));
  }

  console.log('\n✅ 测试完成！');
}

testFixedChatbot().catch(console.error);