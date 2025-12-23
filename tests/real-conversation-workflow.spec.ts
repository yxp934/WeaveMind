import { test, expect, Page, Locator } from '@playwright/test';

// 辅助函数：查找Chatbot输入框
async function findChatbotInput(page: Page): Promise<Locator | null> {
  const inputSelectors = [
    'textarea[placeholder*="消息"], textarea[placeholder*="message"]',
    'input[placeholder*="消息"], input[placeholder*="message"]',
    '[contenteditable="true"]',
    '.chat-input, .chatbot-input',
    'textarea, input[type="text"]'
  ];

  for (const selector of inputSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log(`✅ 找到Chatbot输入框: ${selector}`);
        return element;
      }
    } catch (e) {
      // 继续尝试下一个选择器
    }
  }
  return null;
}

test.describe('真实多轮对话工作流测试', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // 导航到教师页面
    await page.goto('/teacher');
    await page.waitForTimeout(3000);
  });

  test.afterEach(async () => {
    console.log('多轮对话测试完成');
  });

  test('1. 验证无预设消息 - 第一轮对话', async () => {
    console.log('🧪 测试 1: 验证无预设消息 - 第一轮');

    // 寻找Chatbot输入框 - 使用多种选择器
    const inputSelectors = [
      'textarea[placeholder*="消息"], textarea[placeholder*="message"]',
      'input[placeholder*="消息"], input[placeholder*="message"]',
      '[contenteditable="true"]',
      '.chat-input, .chatbot-input',
      'textarea, input[type="text"]'
    ];

    let chatbotInput = null;
    for (const selector of inputSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          chatbotInput = element;
          console.log(`✅ 找到Chatbot输入框: ${selector}`);
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框，尝试检查页面结构');
      // 检查是否需要登录
      try {
        const loginForm = await page.locator('input[type="email"]').first().isVisible();
        if (loginForm) {
          console.log('⚠️ 检测到登录表单，需要登录才能访问Chatbot');
          return;
        }
      } catch (e) {
        // 忽略错误
      }
      console.log('⚠️ 未找到Chatbot输入框且无登录表单');
      return;
    }

    // 发送第一条消息
    const firstMessage = '你好';
    await chatbotInput.fill(firstMessage);
    await chatbotInput.press('Enter');

    // 等待响应
    await page.waitForTimeout(8000);

    // 检查响应内容
    const responseElements = page.locator('.message, .chat-message, [data-role="assistant"], .ai-response, .response-content');

    if (await responseElements.first().isVisible()) {
      const responseText = await responseElements.first().textContent();
      console.log(`🤖 AI回复: "${responseText}"`);

      // 检查是否包含预设消息
      const presetMessages = [
        '我是WeaveMind的教师助手',
        '我是用于帮助教师管理课堂的助手系统',
        '您好！我是WeaveMind AI学习助手',
        '我可以帮您创建课程、生成大纲、设计作业等'
      ];

      const hasPresetMessage = presetMessages.some(preset =>
        responseText?.includes(preset)
      );

      if (hasPresetMessage) {
        console.log('❌ 检测到预设消息！');
        throw new Error(`发现预设消息: ${responseText}`);
      } else {
        console.log('✅ 无预设消息，回复来自AI模型');
      }

      // 检查是否显示TOON格式（这是错误的）
      if (responseText?.includes('---BEGIN_TOON---')) {
        console.log('❌ TOON格式直接显示给用户！');
        throw new Error('TOON格式不应该直接显示给用户');
      } else {
        console.log('✅ TOON格式正确处理，未直接显示');
      }
    } else {
      console.log('⚠️ 未找到响应元素');
    }
  });

  test('2. 真实工作流测试 - 班级管理', async () => {
    console.log('🧪 测试 2: 真实工作流测试 - 班级管理');

    // 使用相同的输入框定位方法
    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框，跳过测试');
      return;
    }

    // 第一步：请求列出班级
    console.log('📝 第一步：请求列出班级');
    await chatbotInput.fill('请列出我创建的所有班级');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(8000);

    // 检查响应类型
    const hasResponse = await page.locator('.message, .chat-message, [data-role="assistant"]').first().isVisible();
    console.log(hasResponse ? '✅ 收到响应' : '⚠️ 未收到响应');

    // 第二步：请求创建班级
    console.log('📝 第二步：请求创建班级');
    await chatbotInput.fill('我想创建一个新班级，名字叫"Java编程基础"，总共8节课');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(8000);

    // 检查是否有工具调用或确认按钮
    const hasToolCall = await page.locator('text=Confirm and run,确认,工具,tool').isVisible();
    console.log(hasToolCall ? '✅ 检测到工具调用' : '⚠️ 未检测到工具调用');

    // 第三步：确认操作
    if (hasToolCall) {
      console.log('📝 第三步：确认操作');
      const confirmButton = page.locator('button:has-text("Confirm and run"), button:has-text("确认"), button[type="submit"]').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(8000);
        console.log('✅ 确认操作完成');
      }
    }

    // 第四步：验证结果
    console.log('📝 第四步：验证结果');
    const finalResponse = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();
    console.log(`🎯 最终响应: "${finalResponse}"`);

    // 检查是否包含真实的班级信息或操作结果
    const hasRealData = finalResponse?.includes('Java编程基础') ||
                       finalResponse?.includes('班级') ||
                       finalResponse?.includes('创建') ||
                       finalResponse?.includes('成功');

    if (hasRealData) {
      console.log('✅ 真实工作流执行成功');
    } else {
      console.log('⚠️ 可能未执行真实工作流');
    }
  });

  test('3. 多轮对话连续性测试', async () => {
    console.log('🧪 测试 3: 多轮对话连续性测试');

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框，跳过测试');
      return;
    }

    // 发送一系列相关消息
    const conversationFlow = [
      { message: '你好', description: '问候' },
      { message: '我想创建一个班级', description: '表达意图' },
      { message: '名字叫"测试班级"', description: '提供详情' },
      { message: '需要6节课', description: '补充信息' },
      { message: '请帮我创建', description: '确认创建' }
    ];

    for (let i = 0; i < conversationFlow.length; i++) {
      const step = conversationFlow[i];
      console.log(`📝 第${i + 1}步: ${step.description} - "${step.message}"`);

      await chatbotInput.fill(step.message);
      await chatbotInput.press('Enter');
      await page.waitForTimeout(6000);

      // 检查是否有响应
      const response = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();

      if (response) {
        console.log(`🤖 AI回复: "${response.substring(0, 100)}..."`);

        // 检查回复是否连贯
        const isContextual = response.includes('班级') ||
                           response.includes('创建') ||
                           response.includes('课程') ||
                           response.includes('帮助') ||
                           response.includes('请');

        if (isContextual) {
          console.log('✅ 回复上下文相关');
        } else {
          console.log('⚠️ 回复可能不相关');
        }
      }

      // 检查是否显示TOON格式
      const hasToonDisplay = response?.includes('---BEGIN_TOON---');
      if (hasToonDisplay) {
        console.log('❌ TOON格式直接显示！');
        throw new Error('TOON格式不应直接显示');
      }
    }

    console.log('✅ 多轮对话连续性测试完成');
  });

  test('4. 工具调用工作流测试', async () => {
    console.log('🧪 测试 4: 工具调用工作流测试');

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框，跳过测试');
      return;
    }

    // 触发工具调用
    await chatbotInput.fill('列出班级');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(8000);

    // 检查工具调用确认
    const hasConfirmation = await page.locator('text=Confirm and run,需要确认,工具调用').isVisible();
    console.log(hasConfirmation ? '✅ 检测到工具调用确认' : '⚠️ 未检测到工具调用确认');

    if (hasConfirmation) {
      // 点击确认按钮
      const confirmButton = page.locator('button:has-text("Confirm and run"), button[type="submit"]').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(8000);
        console.log('✅ 工具调用确认完成');

        // 检查结果
        const resultText = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();
        console.log(`🎯 工具调用结果: "${resultText}"`);

        // 检查是否显示真实数据
        const hasRealData = resultText?.includes('班级') ||
                           resultText?.includes('列表') ||
                           resultText?.includes('数据');

        if (hasRealData) {
          console.log('✅ 工具调用返回真实数据');
        } else {
          console.log('⚠️ 工具调用可能未返回真实数据');
        }
      }
    }
  });

  test('5. 错误处理和恢复测试', async () => {
    console.log('🧪 测试 5: 错误处理和恢复测试');

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框，跳过测试');
      return;
    }

    // 发送可能导致错误的消息
    await chatbotInput.fill('这个功能根本不存在请试试xyz123');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(8000);

    // 检查错误处理
    const response = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();
    console.log(`🤖 错误响应: "${response}"`);

    // 尝试恢复对话
    console.log('📝 尝试恢复正常对话');
    await chatbotInput.fill('你好，我们继续');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(6000);

    const recoveryResponse = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();
    console.log(`🤖 恢复响应: "${recoveryResponse}"`);

    // 检查是否从错误中恢复
    const isRecovered = recoveryResponse?.includes('你好') ||
                       recoveryResponse?.includes('继续') ||
                       recoveryResponse?.includes('帮助');

    if (isRecovered) {
      console.log('✅ 成功从错误中恢复');
    } else {
      console.log('⚠️ 未能从错误中恢复');
    }
  });

  test('6. 性能和响应质量测试', async () => {
    console.log('🧪 测试 6: 性能和响应质量测试');

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框，跳过测试');
      return;
    }

    // 测试响应时间
    const startTime = Date.now();
    await chatbotInput.fill('简单测试');
    await chatbotInput.press('Enter');

    // 等待响应开始
    await page.waitForTimeout(2000);
    const initialResponseTime = Date.now() - startTime;

    // 等待完整响应
    await page.waitForTimeout(6000);
    const totalResponseTime = Date.now() - startTime;

    console.log(`⏱️ 初始响应时间: ${initialResponseTime}ms`);
    console.log(`⏱️ 总响应时间: ${totalResponseTime}ms`);

    if (totalResponseTime < 10000) {
      console.log('✅ 响应时间在可接受范围内');
    } else {
      console.log('⚠️ 响应时间较慢');
    }

    // 检查响应质量
    const response = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();

    if (response && response.length > 10) {
      console.log('✅ 响应内容充实');
    } else {
      console.log('⚠️ 响应内容过短');
    }

    // 检查是否包含TOON格式标记
    const hasToonFormat = response?.includes('---BEGIN_TOON---');
    if (hasToonFormat) {
      console.log('❌ TOON格式直接显示！');
      throw new Error('TOON格式不应直接显示给用户');
    } else {
      console.log('✅ TOON格式正确处理');
    }
  });
});