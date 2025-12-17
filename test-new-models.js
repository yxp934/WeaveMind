#!/usr/bin/env node

/**
 * 测试新AI模型并选择最优模型
 * 测试模型：deepseek-v3.2, gpt-5-nano, gemini-2.5-flash-lite, grok-4.1-fast, minimax-m2, glm-4.6
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { writeFileSync } from 'fs';

const gatewayKey = process.env.VERCEL_GATEWAY_KEY;
if (!gatewayKey) {
  console.error('错误: 缺少VERCEL_GATEWAY_KEY环境变量');
  process.exit(1);
}

const openai = createOpenAI({
  apiKey: gatewayKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// 新模型列表
const modelsToTest = [
  'deepseek/deepseek-v3.2',
  'openai/gpt-5-nano',
  'google/gemini-2.5-flash-lite-preview-09-2025',
  'xai/grok-4.1-fast-non-reasoning',
  'minimax/minimax-m2',
  'zhipu/glm-4.6',
];

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
  '我想创建一个新的班级，名字叫"Java编程基础"，总共需要8节课。请帮我创建这个班级。',
  '请列出我创建的所有班级',
  '帮我创建一个作业，标题是"第一章练习题"',
];

// TOON格式验证函数
function validateToonFormat(text) {
  const result = {
    isValid: false,
    hasBeginTag: false,
    hasEndTag: false,
    hasMessage: false,
    hasNextAction: false,
    message: '',
    nextAction: '',
    errors: []
  };

  if (text.includes('---BEGIN_TOON---')) {
    result.hasBeginTag = true;
  } else {
    result.errors.push('缺少---BEGIN_TOON---标记');
  }

  if (text.includes('---END_TOON---')) {
    result.hasEndTag = true;
  } else {
    result.errors.push('缺少---END_TOON---标记');
  }

  const beginIndex = text.indexOf('---BEGIN_TOON---');
  const endIndex = text.indexOf('---END_TOON---');

  if (beginIndex !== -1 && endIndex !== -1 && endIndex > beginIndex) {
    const toonContent = text.substring(beginIndex + '---BEGIN_TOON---'.length, endIndex).trim();

    const messageMatch = toonContent.match(/message:\s*([^\n]+)/i);
    if (messageMatch && messageMatch[1]) {
      result.message = messageMatch[1].trim();
      result.hasMessage = true;
    } else {
      result.errors.push('缺少或无效的message字段');
    }

    const actionMatch = toonContent.match(/next_action:\s*([^\n]+)/i);
    if (actionMatch && actionMatch[1]) {
      result.nextAction = actionMatch[1].trim();
      result.hasNextAction = true;
    } else {
      result.errors.push('缺少或无效的next_action字段');
    }

    result.isValid = result.hasBeginTag && result.hasEndTag && result.hasMessage && result.hasNextAction;
  }

  return result;
}

// 测试单个模型
async function testModel(modelName, message, index) {
  console.log(`\n🔍 测试模型 ${index + 1}/${modelsToTest.length}: ${modelName}`);
  console.log(`📝 测试消息: "${message}"`);

  try {
    const startTime = Date.now();
    const { text } = await generateText({
      model: openai.chat(modelName),
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
      maxTokens: 800,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(30000),
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const validation = validateToonFormat(text);

    console.log(`⏱️ 响应时间: ${responseTime}ms`);
    console.log(`📊 格式验证:`);
    console.log(`   - 开始标记: ${validation.hasBeginTag ? '✅' : '❌'}`);
    console.log(`   - 结束标记: ${validation.hasEndTag ? '✅' : '❌'}`);
    console.log(`   - message字段: ${validation.hasMessage ? '✅' : '❌'}`);
    console.log(`   - next_action字段: ${validation.hasNextAction ? '✅' : '❌'}`);
    console.log(`   - 整体有效性: ${validation.isValid ? '✅' : '❌'}`);

    if (validation.errors.length > 0) {
      console.log(`❌ 错误: ${validation.errors.join(', ')}`);
    }

    if (validation.message) {
      console.log(`💬 message: "${validation.message}"`);
    }
    if (validation.nextAction) {
      console.log(`🎯 next_action: "${validation.nextAction}"`);
    }

    // 检查是否直接显示了TOON格式（这是问题）
    if (text.includes('---BEGIN_TOON---') && text.includes('---END_TOON---')) {
      const lines = text.split('\n');
      const hasDirectDisplay = lines.some(line =>
        line.includes('---BEGIN_TOON---') && !line.includes('message:')
      );
      if (hasDirectDisplay) {
        console.log(`⚠️ 警告: 检测到TOON格式直接显示`);
      }
    }

    return {
      model: modelName,
      message,
      success: true,
      responseTime,
      isValidFormat: validation.isValid,
      hasBeginTag: validation.hasBeginTag,
      hasEndTag: validation.hasEndTag,
      hasMessage: validation.hasMessage,
      hasNextAction: validation.hasNextAction,
      messageContent: validation.message,
      nextActionValue: validation.nextAction,
      errors: validation.errors,
      fullResponse: text,
      hasDirectToonDisplay: text.includes('---BEGIN_TOON---') && text.includes('---END_TOON---')
    };

  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    return {
      model: modelName,
      message,
      success: false,
      error: error.message,
      responseTime: 0,
      isValidFormat: false,
      hasBeginTag: false,
      hasEndTag: false,
      hasMessage: false,
      hasNextAction: false,
    };
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始新AI模型TOON格式测试');
  console.log(`📋 将测试 ${modelsToTest.length} 个模型，每个模型测试 ${testMessages.length} 个场景`);
  console.log('='.repeat(80));

  const results = [];
  let testIndex = 0;

  for (const model of modelsToTest) {
    for (const message of testMessages) {
      const result = await testModel(model, message, testIndex);
      results.push(result);
      testIndex++;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// 生成测试报告
function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(80));

  const modelStats = {};

  for (const result of results) {
    if (!modelStats[result.model]) {
      modelStats[result.model] = {
        total: 0,
        success: 0,
        validFormat: 0,
        hasDirectDisplay: 0,
        avgResponseTime: 0,
        responseTimes: [],
        errors: []
      };
    }

    const stats = modelStats[result.model];
    stats.total++;
    if (result.success) {
      stats.success++;
      if (result.isValidFormat) {
        stats.validFormat++;
      }
      if (result.hasDirectToonDisplay) {
        stats.hasDirectDisplay++;
      }
      if (result.responseTime > 0) {
        stats.responseTimes.push(result.responseTime);
      }
    }
    if (result.errors && result.errors.length > 0) {
      stats.errors.push(...result.errors);
    }
  }

  for (const model in modelStats) {
    const stats = modelStats[model];
    if (stats.responseTimes.length > 0) {
      stats.avgResponseTime = stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length;
    }
  }

  const modelRanking = Object.entries(modelStats)
    .map(([model, stats]) => ({
      model,
      successRate: stats.total > 0 ? (stats.success / stats.total * 100).toFixed(1) : '0.0',
      formatValidity: stats.success > 0 ? (stats.validFormat / stats.success * 100).toFixed(1) : '0.0',
      directDisplayRate: stats.success > 0 ? (stats.hasDirectDisplay / stats.success * 100).toFixed(1) : '0.0',
      avgResponseTime: stats.avgResponseTime.toFixed(0),
      totalTests: stats.total
    }))
    .sort((a, b) => {
      // 首先按格式有效性排序，然后按直接显示率排序（越低越好），最后按成功率排序
      if (b.formatValidity !== a.formatValidity) {
        return parseFloat(b.formatValidity) - parseFloat(a.formatValidity);
      }
      if (a.directDisplayRate !== b.directDisplayRate) {
        return parseFloat(a.directDisplayRate) - parseFloat(b.directDisplayRate);
      }
      return parseFloat(b.successRate) - parseFloat(a.successRate);
    });

  console.log('\n🏆 模型性能排名:');
  console.log('模型名称'.padEnd(35) + '成功率'.padEnd(8) + '格式有效'.padEnd(8) + '直接显示率'.padEnd(10) + '响应时间'.padEnd(8) + '测试次数');
  console.log('-'.repeat(85));

  for (const rank of modelRanking) {
    console.log(
      rank.model.padEnd(35) +
      rank.successRate + '%'.padEnd(7) +
      rank.formatValidity + '%'.padEnd(7) +
      rank.directDisplayRate + '%'.padEnd(9) +
      rank.avgResponseTime + 'ms'.padEnd(7) +
      rank.totalTests
    );
  }

  const bestModel = modelRanking[0];
  console.log(`\n💡 推荐模型: ${bestModel.model}`);
  console.log(`   - 成功率: ${bestModel.successRate}%`);
  console.log(`   - 格式有效性: ${bestModel.formatValidity}%`);
  console.log(`   - 直接显示率: ${bestModel.directDisplayRate}% (越低越好)`);
  console.log(`   - 平均响应时间: ${bestModel.avgResponseTime}ms`);

  return {
    summary: {
      totalTests: results.length,
      totalModels: modelsToTest.length,
      totalScenarios: testMessages.length,
      bestModel: bestModel.model,
      bestModelStats: bestModel
    },
    modelStats,
    modelRanking,
    detailedResults: results
  };
}

// 主函数
async function main() {
  try {
    const results = await runAllTests();
    const report = generateReport(results);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `new-model-test-results-${timestamp}.json`;
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 详细测试结果已保存到: ${filename}`);

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

main();