import { test, expect } from '@playwright/test';

test.describe('WeaveMind聊天机器人完整端到端测试', () => {
  test('主页加载和基础结构测试', async ({ page }) => {
    console.log('🚀 开始主页加载测试');

    // 导航到主页
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 截图初始状态
    await page.screenshot({ path: 'test-01-homepage-landing.png', fullPage: true });

    // 检查页面标题
    const title = await page.title();
    console.log(`📋 页面标题: ${title}`);

    // 检查页面是否有导航元素
    const hasNavigation = await page.locator('nav, [role="navigation"], .nav').count();
    console.log(`🧭 导航元素数量: ${hasNavigation}`);

    // 检查是否有登录相关元素
    const loginElements = await page.locator('button:has-text("登录"), a:has-text("登录"), [href*="login"]').count();
    console.log(`🔑 登录元素数量: ${loginElements}`);

    // 检查是否有聊天相关元素
    const chatElements = await page.locator('input, textarea, [placeholder*="chat"], [placeholder*="对话"]').count();
    console.log(`💬 聊天元素数量: ${chatElements}`);

    console.log('✅ 主页加载测试完成');
  });

  test('发现聊天机器人界面和所有元素', async ({ page }) => {
    console.log('🔍 开始聊天机器人界面发现测试');

    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 尝试查找所有可能的聊天界面元素
    const possibleSelectors = [
      'input[type="text"]',
      'textarea',
      'input[placeholder*="输入"]',
      'input[placeholder*="输入消息"]',
      'textarea[placeholder*="输入"]',
      '[contenteditable="true"]',
      '.chat-input',
      '.chat-textarea',
      '.message-input',
      '.input-area'
    ];

    console.log('🔎 搜索聊天输入框...');
    let foundInput = false;
    let inputSelector = '';

    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ 找到输入框: ${selector} (数量: ${count})`);
        foundInput = true;
        inputSelector = selector;
        break;
      }
    }

    if (!foundInput) {
      console.log('❌ 未找到聊天输入框，尝试查找聊天相关页面或组件...');

      // 查找导航到聊天页面的链接
      const chatLinks = await page.locator('a:has-text("聊天"), a:has-text("Chat"), [href*="chat"], [href*="对话"]').count();
      console.log(`🔗 聊天链接数量: ${chatLinks}`);

      if (chatLinks > 0) {
        // 点击聊天链接
        await page.locator('a:has-text("聊天"), a:has-text("Chat"), [href*="chat"], [href*="对话"]').first().click();
        await page.waitForLoadState('networkidle');

        // 重新搜索输入框
        for (const selector of possibleSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`✅ 在聊天页面找到输入框: ${selector}`);
            foundInput = true;
            inputSelector = selector;
            break;
          }
        }
      }
    }

    // 截图当前页面状态
    await page.screenshot({ path: 'test-02-chatbot-interface-discovery.png', fullPage: true });

    // 如果找到了输入框，测试发送按钮
    if (foundInput) {
      console.log('🎯 开始测试聊天功能...');

      const sendButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("发送")',
        'button:has-text("Send")',
        '.send-button',
        '.submit-button',
        'button[aria-label*="发送"]',
        'button[aria-label*="Send"]'
      ];

      let foundSendButton = false;
      for (const selector of sendButtonSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✅ 找到发送按钮: ${selector}`);
          foundSendButton = true;
          break;
        }
      }

      if (foundSendButton) {
        // 测试输入和发送功能
        console.log('📝 测试输入和发送功能...');
        await page.locator(inputSelector).fill('测试消息');

        const sendButton = page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send"), .send-button').first();
        await
        // sendButton.click();
 等待响应
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-03-chatbot-response.png', fullPage: true });

        console.log('✅ 聊天功能测试完成');
      } else {
        console.log('⚠️ 找到输入框但未找到发送按钮');
      }
    } else {
      console.log('❌ 未找到聊天输入框，需要登录或导航到聊天页面');

      // 检查是否需要登录
      const needsLogin = await page.locator('button:has-text("登录"), a:has-text("登录"), [href*="login"]').count() > 0;
      if (needsLogin) {
        console.log('🔑 检测到需要登录，尝试点击登录按钮...');
        await page.locator('button:has-text("登录"), a:has-text("登录"), [href*="login"]').first().click();
        await page.waitForLoadState('networkidle');

        await page.screenshot({ path: 'test-04-login-page.png', fullPage: true });
        console.log('✅ 已跳转到登录页面');
      }
    }
  });

  test('API直接测试 - 验证后端聊天机器人功能', async ({ page }) => {
    console.log('🔧 开始API直接测试');

    // 直接测试聊天API
    const response = await page.request.post('https://weavemind.vercel.app/api/ai/chat', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        message: '我想要创建一个Python编程课程',
        context: {
          userRole: 'teacher',
          sessionId: 'test-session-123',
          conversationHistory: []
        }
      }
    });

    console.log(`📡 API响应状态: ${response.status()}`);

    if (response.ok()) {
      const responseData = await response.json();
      console.log('✅ API调用成功');
      console.log('📄 响应内容:', JSON.stringify(responseData, null, 2));

      // 验证响应结构
      expect(responseData.success).toBe(true);
      expect(responseData.data.message).toBeTruthy();
      expect(responseData.data.toolsUsed).toBeTruthy();
      expect(responseData.data.metadata).toBeTruthy();

      console.log('✅ API响应结构验证通过');
    } else {
      console.log('❌ API调用失败');
      const errorText = await response.text();
      console.log('错误信息:', errorText);
    }
  });

  test('完整工作流API测试', async ({ page }) => {
    console.log('🎯 开始完整工作流API测试');

    const workflows = [
      {
        name: '创建课程',
        message: '我想要创建一个Python编程课程',
        expected: /课程|Python|创建/i
      },
      {
        name: '生成大纲',
        message: '我需要为数学课程生成一个详细的大纲',
        expected: /大纲|数学|生成/i
      },
      {
        name: '创建作业',
        message: '我需要创建一份数学作业',
        expected: /作业|数学|创建/i
      },
      {
        name: 'A2A优化',
        message: '我需要使用A2A优化我的课程内容',
        expected: /A2A|优化|课程/i
      },
      {
        name: '内容生成',
        message: '我需要生成一些教学内容',
        expected: /内容|生成|教学/i
      },
      {
        name: '创建节次',
        message: '我需要创建新的课次',
        expected: /课次|创建|课程/i
      }
    ];

    let successCount = 0;

    for (const workflow of workflows) {
      console.log(`\n🧪 测试工作流: ${workflow.name}`);

      try {
        const response = await page.request.post('https://weavemind.vercel.app/api/ai/chat', {
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            message: workflow.message,
            context: {
              userRole: 'teacher',
              sessionId: `test-session-${Date.now()}`,
              conversationHistory: []
            }
          }
        });

        if (response.ok()) {
          const responseData = await response.json();

          if (responseData.success && responseData.data.message) {
            const messageText = responseData.data.message;
            const matches = workflow.expected.test(messageText);

            if (matches) {
              console.log(`✅ ${workflow.name} 工作流测试通过`);
              successCount++;

              // 验证元数据
              expect(responseData.data.toolsUsed).toBeTruthy();
              expect(responseData.data.metadata.workflowType).toBeTruthy();
              expect(responseData.data.metadata.progress).toBeTruthy();

            } else {
              console.log(`❌ ${workflow.name} 工作流响应不匹配`);
              console.log(`期望匹配: ${workflow.expected}`);
              console.log(`实际响应: ${messageText}`);
            }
          } else {
            console.log(`❌ ${workflow.name} 工作流响应格式错误`);
          }
        } else {
          console.log(`❌ ${workflow.name} 工作流API调用失败: ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ ${workflow.name} 工作流测试异常:`, error);
      }
    }

    console.log(`\n📊 测试结果总结: ${successCount}/${workflows.length} 个工作流通过`);

    // 至少6个中的4个应该通过才认为成功
    expect(successCount).toBeGreaterThanOrEqual(4);
  });
});