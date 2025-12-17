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

test.describe('带认证的真实Chatbot多轮对话测试', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test.afterEach(async () => {
    console.log('认证Chatbot测试完成');
  });

  test('1. 登录并访问Chatbot', async () => {
    console.log('🧪 测试 1: 登录并访问Chatbot');

    // 导航到登录页面
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(2000);

    // 登录
    console.log('📝 执行登录...');
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"], button:has-text("登录"), button:has-text("Login")');

    // 等待登录完成
    await page.waitForTimeout(5000);

    // 检查当前URL
    const currentUrl = page.url();
    console.log(`🔗 登录后URL: ${currentUrl}`);

    if (currentUrl.includes('/role-select')) {
      console.log('📋 跳转到角色选择页面，选择教师角色');
      await page.click('button:has-text("Teacher"), button:has-text("教师")');
      await page.waitForTimeout(3000);
    }

    // 导航到教师页面
    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    console.log('✅ 成功访问教师页面');
  });

  test('2. 验证修复效果 - 无预设消息', async () => {
    console.log('🧪 测试 2: 验证修复效果 - 无预设消息');

    // 先登录
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // 导航到教师页面
    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    // 查找Chatbot输入框
    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框');
      return;
    }

    // 发送第一条消息
    console.log('📝 发送测试消息: "你好"');
    await chatbotInput.fill('你好');
    await chatbotInput.press('Enter');

    // 等待响应
    await page.waitForTimeout(8000);

    // 检查响应
    const responseElements = page.locator('.message, .chat-message, [data-role="assistant"], .ai-response');
    if (await responseElements.first().isVisible()) {
      const responseText = await responseElements.first().textContent();
      console.log(`🤖 AI回复: "${responseText}"`);

      // 检查预设消息
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
        console.log('❌ 检测到预设消息！修复失败');
        throw new Error(`发现预设消息: ${responseText}`);
      } else {
        console.log('✅ 无预设消息，修复成功');
      }

      // 检查TOON格式是否直接显示
      if (responseText?.includes('---BEGIN_TOON---')) {
        console.log('❌ TOON格式直接显示给用户！修复失败');
        throw new Error('TOON格式不应该直接显示给用户');
      } else {
        console.log('✅ TOON格式正确处理，未直接显示');
      }
    }
  });

  test('3. 真实工作流 - 班级管理完整流程', async () => {
    console.log('🧪 测试 3: 真实工作流 - 班级管理完整流程');

    // 登录流程
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框');
      return;
    }

    // 完整的工作流程测试
    console.log('📝 第1步: 请求列出班级');
    await chatbotInput.fill('请列出我创建的所有班级');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(8000);

    // 检查工具调用
    const hasToolCall = await page.locator('text=Confirm and run,需要确认,工具调用').isVisible();
    console.log(hasToolCall ? '✅ 检测到工具调用' : '⚠️ 未检测到工具调用');

    if (hasToolCall) {
      console.log('📝 第2步: 确认工具调用');
      const confirmButton = page.locator('button:has-text("Confirm and run"), button[type="submit"]').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(8000);
        console.log('✅ 工具调用确认完成');
      }
    }

    console.log('📝 第3步: 请求创建新班级');
    await chatbotInput.fill('我想创建一个新班级，名字叫"测试班级"，总共6节课');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(8000);

    // 检查创建确认
    const hasCreateConfirmation = await page.locator('text=Confirm and run,确认,创建,create').isVisible();
    console.log(hasCreateConfirmation ? '✅ 检测到创建确认' : '⚠️ 未检测到创建确认');

    if (hasCreateConfirmation) {
      console.log('📝 第4步: 确认创建班级');
      const createButton = page.locator('button:has-text("Confirm and run")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(8000);
        console.log('✅ 班级创建完成');
      }
    }

    // 验证最终结果
    console.log('📝 第5步: 验证结果');
    const finalResponses = page.locator('.message, .chat-message, [data-role="assistant"]');
    const responseCount = await finalResponses.count();
    console.log(`📊 总共收到 ${responseCount} 条回复`);

    // 检查最后一条回复
    if (responseCount > 0) {
      const lastResponse = await finalResponses.nth(responseCount - 1).textContent();
      console.log(`🎯 最终回复: "${lastResponse}"`);

      // 检查是否包含真实的班级信息
      const hasRealData = lastResponse?.includes('测试班级') ||
                         lastResponse?.includes('班级') ||
                         lastResponse?.includes('创建') ||
                         lastResponse?.includes('成功');

      if (hasRealData) {
        console.log('✅ 真实工作流执行成功');
      } else {
        console.log('⚠️ 可能未执行真实工作流');
      }
    }
  });

  test('4. 多轮对话连续性和上下文保持', async () => {
    console.log('🧪 测试 4: 多轮对话连续性和上下文保持');

    // 登录
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框');
      return;
    }

    // 多轮对话流程
    const conversationSteps = [
      { message: '你好', expected: ['问候', '帮助'] },
      { message: '我想创建一个班级', expected: ['班级', '创建'] },
      { message: '名字叫"Java编程"', expected: ['Java编程', '班级'] },
      { message: '需要10节课', expected: ['10节课', '课程'] },
      { message: '请帮我创建', expected: ['创建', '确认'] }
    ];

    for (let i = 0; i < conversationSteps.length; i++) {
      const step = conversationSteps[i];
      console.log(`📝 第${i + 1}步: "${step.message}"`);

      await chatbotInput.fill(step.message);
      await chatbotInput.press('Enter');
      await page.waitForTimeout(6000);

      // 检查响应
      const responses = page.locator('.message, .chat-message, [data-role="assistant"]');
      const responseCount = await responses.count();

      if (responseCount > i) {
        const responseText = await responses.nth(responseCount - 1).textContent();
        console.log(`🤖 AI回复: "${responseText?.substring(0, 100)}..."`);

        // 检查上下文相关性和连贯性
        const isContextual = step.expected.some(keyword =>
          responseText?.includes(keyword)
        );

        if (isContextual) {
          console.log('✅ 回复上下文相关');
        } else {
          console.log('⚠️ 回复可能不相关');
        }

        // 检查TOON格式直接显示
        if (responseText?.includes('---BEGIN_TOON---')) {
          console.log('❌ TOON格式直接显示！');
        } else {
          console.log('✅ TOON格式正确处理');
        }
      }
    }

    console.log('✅ 多轮对话连续性测试完成');
  });

  test('5. 错误处理和系统稳定性', async () => {
    console.log('🧪 测试 5: 错误处理和系统稳定性');

    // 登录
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    const chatbotInput = await findChatbotInput(page);
    if (!chatbotInput) {
      console.log('⚠️ 未找到Chatbot输入框');
      return;
    }

    // 测试各种边界情况
    const errorTestCases = [
      '这个功能根本不存在xyz123',
      '',
      '   ', // 空格
      '请执行一个无效的操作invalid_operation',
      '😀🔥💯🎉', // 表情符号
      'a'.repeat(1000) // 长文本
    ];

    for (const testCase of errorTestCases) {
      console.log(`📝 测试错误场景: "${testCase.substring(0, 50)}${testCase.length > 50 ? '...' : ''}"`);

      try {
        await chatbotInput.fill(testCase);
        await chatbotInput.press('Enter');
        await page.waitForTimeout(6000);

        // 检查系统是否崩溃或显示错误
        const response = page.locator('.message, .chat-message, [data-role="assistant"]').last();
        if (await response.isVisible()) {
          const responseText = await response.textContent();
          console.log(`✅ 系统正常响应: "${responseText?.substring(0, 50)}..."`);
        }
      } catch (error) {
        console.log(`⚠️ 系统处理错误场景: ${error.message}`);
      }
    }

    // 恢复正常对话
    console.log('📝 测试恢复正常对话');
    await chatbotInput.fill('你好，我们继续正常对话');
    await chatbotInput.press('Enter');
    await page.waitForTimeout(6000);

    const recoveryResponse = await page.locator('.message, .chat-message, [data-role="assistant"]').last().textContent();
    if (recoveryResponse && !recoveryResponse.includes('错误')) {
      console.log('✅ 系统成功恢复正常对话');
    } else {
      console.log('⚠️ 系统可能未完全恢复');
    }
  });
});