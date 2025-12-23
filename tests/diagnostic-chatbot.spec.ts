import { test, expect, Page, Locator } from '@playwright/test';

test.describe('Chatbot诊断测试 - 网络请求监控', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // 启用网络监控
    page.on('request', request => {
      console.log(`🔗 网络请求: ${request.method()} ${request.url()}`);
      if (request.url().includes('/api/') || request.url().includes('/trigger/')) {
        console.log(`   API调用: ${request.method()} ${request.url()}`);
        console.log(`   请求头: ${JSON.stringify(request.headers())}`);
      }
    });

    page.on('response', async response => {
      const status = response.status();
      const url = response.url();
      console.log(`📡 网络响应: ${status} ${url}`);

      if (status >= 400) {
        console.log(`❌ HTTP错误 ${status}: ${url}`);
        try {
          const body = await response.text();
          console.log(`   错误响应: ${body.substring(0, 200)}...`);
        } catch (e) {
          console.log(`   无法读取错误响应体: ${e}`);
        }
      }
    });

    // 监控控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🚨 控制台错误: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.log(`⚠️ 控制台警告: ${msg.text()}`);
      } else {
        console.log(`ℹ️ 控制台消息: ${msg.text()}`);
      }
    });

    // 监控页面错误
    page.on('pageerror', error => {
      console.log(`💥 页面错误: ${error.message}`);
      console.log(`   错误堆栈: ${error.stack}`);
    });
  });

  test('1. 登录并监控聊天功能', async () => {
    console.log('🧪 开始诊断测试: 登录并监控聊天功能');

    // 登录流程
    await page.goto('/auth/login');
    await page.waitForTimeout(2000);

    console.log('📝 执行登录...');
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');

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
    await page.goto('/teacher');
    await page.waitForTimeout(3000);

    console.log('✅ 成功访问教师页面');
  });

  test('2. 详细监控聊天消息发送', async () => {
    console.log('🧪 详细监控聊天消息发送');

    // 登录
    await page.goto('/auth/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    await page.goto('/teacher');
    await page.waitForTimeout(3000);

    // 查找聊天输入框
    const chatbotInputSelectors = [
      'textarea[placeholder*="消息"]',
      'textarea[placeholder*="message"]',
      'input[placeholder*="消息"]',
      'input[placeholder*="message"]',
      '[contenteditable="true"]',
      '.chat-input',
      '.chatbot-input',
      'textarea',
      'input[type="text"]'
    ];

    let chatbotInput: Locator | null = null;

    for (const selector of chatbotInputSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ 找到聊天输入框: ${selector}`);
          chatbotInput = element;
          break;
        }
      } catch (e) {
        // 继续尝试
      }
    }

    if (!chatbotInput) {
      console.log('❌ 未找到聊天输入框');
      // 尝试截图
      await page.screenshot({ path: 'chatbot-input-not-found.png' });
      throw new Error('未找到聊天输入框');
    }

    // 发送第一条测试消息
    console.log('📝 发送测试消息: "你好"');
    await chatbotInput.fill('你好');
    await chatbotInput.press('Enter');

    console.log('⏳ 等待AI响应...');
    // 等待更长时间观察网络请求
    await page.waitForTimeout(15000);

    // 检查是否有新的消息元素出现
    const messageSelectors = [
      '.message',
      '.chat-message',
      '[data-role="assistant"]',
      '.ai-response',
      '.response',
      '.chatbot-response'
    ];

    let foundMessage = false;
    for (const selector of messageSelectors) {
      try {
        const message = page.locator(selector);
        if (await message.isVisible({ timeout: 1000 })) {
          const messageText = await message.textContent();
          console.log(`📨 找到消息: ${selector} - "${messageText?.substring(0, 100)}..."`);
          foundMessage = true;
        }
      } catch (e) {
        // 继续尝试
      }
    }

    if (!foundMessage) {
      console.log('❌ 未找到任何AI回复消息');
      await page.screenshot({ path: 'no-ai-response.png' });
    }

    // 检查是否有加载状态
    const loadingSelectors = [
      '.loading',
      '.typing',
      '.spinner',
      '[data-testid="loading"]',
      '[data-testid="typing"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        if (await page.locator(selector).isVisible()) {
          console.log(`⏳ 检测到加载状态: ${selector}`);
        }
      } catch (e) {
        // 继续
      }
    }

    console.log('✅ 详细监控完成');
  });

  test('3. 监控特定API端点', async () => {
    console.log('🧪 监控特定API端点');

    // 登录
    await page.goto('/auth/login');
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    await page.goto('/teacher');
    await page.waitForTimeout(3000);

    // 查找输入框并发送消息
    const chatbotInput = page.locator('textarea, input[type="text"]').first();
    if (await chatbotInput.isVisible()) {
      console.log('📝 发送消息触发API调用');
      await chatbotInput.fill('测试API调用');
      await chatbotInput.press('Enter');

      // 等待并监控API调用
      console.log('⏳ 等待API响应...');
      await page.waitForTimeout(20000);

      // 检查网络面板中是否有相关请求
      console.log('📊 检查网络请求历史...');
    }

    console.log('✅ API端点监控完成');
  });

  test('4. 手动测试API端点', async () => {
    console.log('🧪 手动测试API端点');

    const apiEndpoints = [
      '/api/trigger/chat',
      '/api/teacher/chat',
      '/api/student/chat',
      '/api/chat'
    ];

    for (const endpoint of apiEndpoints) {
      console.log(`🔗 测试端点: ${endpoint}`);

      try {
        const response = await page.request.get(`https://weavemind.vercel.app${endpoint}`);
        const status = response.status();
        const text = await response.text();

        console.log(`   状态码: ${status}`);
        console.log(`   响应: ${text.substring(0, 200)}...`);

        if (status === 404) {
          console.log(`   ❌ 端点不存在`);
        } else if (status === 401) {
          console.log(`   ⚠️ 需要认证`);
        } else if (status === 500) {
          console.log(`   💥 服务器错误`);
        } else {
          console.log(`   ✅ 端点可访问`);
        }
      } catch (error) {
        console.log(`   🚨 请求失败: ${error.message}`);
      }
    }

    console.log('✅ API端点测试完成');
  });
});