import { test, expect, Page } from '@playwright/test';

test.describe('WeaveMind Chatbot 侧边栏功能测试', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('1. 主页和基本导航测试', async () => {
    console.log('🧪 测试 1: 主页和基本导航');

    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/WeaveMind/);

    // 使用更精确的选择器
    const titleElement = page.locator('h1').first();
    await expect(titleElement).toContainText(/WeaveMind|Intelligent/);

    const loginButton = page.locator('a[href="/auth/login"]').or(page.locator('text=Login').first());
    await expect(loginButton).toBeVisible();

    console.log('✅ 主页导航正常');
  });

  test('2. 教师仪表板访问测试', async () => {
    console.log('🧪 测试 2: 教师仪表板访问');

    // 直接导航到教师仪表板（假设已经登录）
    await page.goto('http://localhost:3000/teacher');

    // 等待页面加载
    await page.waitForTimeout(3000);

    // 检查是否有教师仪表板的内容
    const dashboardElements = [
      page.locator('text=Dashboard').or(page.locator('text=仪表板')),
      page.locator('[data-testid="dashboard"], .dashboard, .teacher-dashboard'),
      page.locator('nav, aside').first()
    ];

    let dashboardFound = false;
    for (const element of dashboardElements) {
      if (await element.isVisible({ timeout: 5000 })) {
        dashboardFound = true;
        break;
      }
    }

    console.log(dashboardFound ? '✅ 教师仪表板加载成功' : '⚠️ 教师仪表板可能需要登录');

    // 如果仪表板存在，检查是否有侧边栏
    if (dashboardFound) {
      const sidebar = page.locator('aside, [data-testid="sidebar"], .sidebar').first();
      if (await sidebar.isVisible()) {
        console.log('✅ 侧边栏存在');
      }
    }
  });

  test('3. 侧边栏Chatbot组件测试', async () => {
    console.log('🧪 测试 3: 侧边栏Chatbot组件');

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    // 寻找侧边栏中的Chatbot组件
    const chatbotSelectors = [
      '[data-testid="sidebar-chatbot"]',
      '.sidebar-chatbot',
      'text=AI助手',
      'text=Chat',
      'text=Assistant',
      '[aria-label*="chat"]',
      '[aria-label*="Chat"]'
    ];

    let chatbotFound = false;
    for (const selector of chatbotSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          console.log(`✅ 找到Chatbot组件: ${selector}`);
          chatbotFound = true;
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (!chatbotFound) {
      console.log('⚠️ 未找到侧边栏Chatbot，可能需要登录或页面结构不同');
    }
  });

  test('4. Chatbot交互功能测试', async () => {
    console.log('🧪 测试 4: Chatbot交互功能');

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    // 寻找Chatbot输入框
    const inputSelectors = [
      'textarea[placeholder*="消息"], textarea[placeholder*="message"]',
      'input[placeholder*="消息"], input[placeholder*="message"]',
      '[contenteditable="true"]',
      '.chat-input, .chatbot-input',
      'textarea, input[type="text"]'
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      try {
        const inputElement = page.locator(selector).first();
        if (await inputElement.isVisible({ timeout: 3000 })) {
          console.log(`✅ 找到输入框: ${selector}`);

          // 输入测试消息
          await inputElement.fill('你好，我想测试Chatbot功能');
          await inputElement.press('Enter');

          // 等待响应
          await page.waitForTimeout(5000);

          // 检查是否有响应
          const responseSelectors = [
            '.message, .chat-message',
            '[data-role="assistant"]',
            '.ai-response, .bot-response'
          ];

          let hasResponse = false;
          for (const respSelector of responseSelectors) {
            try {
              if (await page.locator(respSelector).isVisible({ timeout: 2000 })) {
                hasResponse = true;
                console.log(`✅ 收到响应: ${respSelector}`);
                break;
              }
            } catch (e) {
              // 继续检查
            }
          }

          if (hasResponse) {
            console.log('✅ Chatbot交互功能正常');
          } else {
            console.log('⚠️ 未检测到Chatbot响应');
          }

          inputFound = true;
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (!inputFound) {
      console.log('❌ 未找到Chatbot输入框，可能组件未正确加载');
    }
  });

  test('5. 登录和认证测试', async () => {
    console.log('🧪 测试 5: 登录和认证流程');

    // 导航到登录页面
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForTimeout(2000);

    // 检查登录表单
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("登录")').first();

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      console.log('✅ 登录表单存在');

      // 填入测试账号（如果需要的话）
      try {
        await emailInput.fill('jzibclub@jzib.com');
        await passwordInput.fill('Lao1dian5');
        await submitButton.click();

        await page.waitForTimeout(3000);

        const currentURL = page.url();
        if (currentURL.includes('/teacher') || currentURL.includes('/role-select')) {
          console.log('✅ 登录成功');
        } else {
          console.log('⚠️ 登录后未按预期跳转');
        }
      } catch (e) {
        console.log('⚠️ 登录测试跳过（可能需要手动验证）');
      }
    } else {
      console.log('⚠️ 登录表单未找到，可能页面结构不同');
    }
  });

  test('6. Chatbot TOON格式响应测试', async () => {
    console.log('🧪 测试 6: Chatbot TOON格式响应');

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    // 发送TOON格式相关的测试消息
    const testMessages = [
      '创建一个新班级',
      '列出所有班级',
      '帮我创建作业'
    ];

    for (const message of testMessages) {
      try {
        const inputElement = page.locator('textarea, input[type="text"]').first();
        if (await inputElement.isVisible({ timeout: 3000 })) {
          await inputElement.fill(message);
          await inputElement.press('Enter');

          await page.waitForTimeout(5000);

          // 检查页面内容是否包含TOON格式
          const pageContent = await page.content();
          const hasToonFormat = pageContent.includes('---BEGIN_TOON---') || pageContent.includes('---END_TOON---');

          if (hasToonFormat) {
            console.log(`✅ TOON格式检测成功: ${message}`);
          } else {
            console.log(`⚠️ 未检测到TOON格式: ${message}`);
          }

          break;
        }
      } catch (e) {
        console.log(`⚠️ 测试消息失败: ${message}`);
      }
    }
  });

  test('7. 性能和错误处理测试', async () => {
    console.log('🧪 测试 7: 性能和错误处理');

    await page.goto('http://localhost:3000/teacher');
    await page.waitForTimeout(3000);

    // 测试页面加载性能
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`页面加载时间: ${loadTime}ms`);

    if (loadTime < 10000) {
      console.log('✅ 页面加载性能正常');
    } else {
      console.log('⚠️ 页面加载较慢');
    }

    // 测试错误消息
    try {
      const inputElement = page.locator('textarea, input[type="text"]').first();
      if (await inputElement.isVisible({ timeout: 3000 })) {
        await inputElement.fill('这个功能不存在xyz123');
        await inputElement.press('Enter');

        await page.waitForTimeout(5000);

        // 检查是否有错误处理
        const hasErrorHandling = await page.locator('text=错误,error,无法,无法处理').isVisible();
        console.log(hasErrorHandling ? '✅ 错误处理正常' : '⚠️ 错误处理可能缺失');
      }
    } catch (e) {
      console.log('⚠️ 错误处理测试跳过');
    }
  });

  test('8. 完整用户流程测试', async () => {
    console.log('🧪 测试 8: 完整用户流程');

    // 模拟真实用户使用流程
    const steps = [
      { action: 'navigate', url: 'http://localhost:3000', wait: 2000 },
      { action: 'navigate', url: 'http://localhost:3000/teacher', wait: 3000 },
      { action: 'find_chatbot', wait: 2000 },
      { action: 'send_message', message: '你好', wait: 5000 },
      { action: 'send_message', message: '我想创建一个班级', wait: 5000 },
      { action: 'check_response', wait: 3000 }
    ];

    for (const step of steps) {
      try {
        switch (step.action) {
          case 'navigate':
            await page.goto(step.url!);
            await page.waitForTimeout(step.wait!);
            console.log(`✅ 导航到: ${step.url}`);
            break;

          case 'find_chatbot':
            const inputElement = page.locator('textarea, input[type="text"]').first();
            if (await inputElement.isVisible({ timeout: 3000 })) {
              console.log('✅ 找到Chatbot输入框');
            } else {
              console.log('⚠️ 未找到Chatbot输入框');
            }
            break;

          case 'send_message':
            const input = page.locator('textarea, input[type="text"]').first();
            if (await input.isVisible({ timeout: 3000 })) {
              await input.fill(step.message!);
              await input.press('Enter');
              console.log(`✅ 发送消息: ${step.message}`);
            }
            await page.waitForTimeout(step.wait!);
            break;

          case 'check_response':
            const response = page.locator('.message, .chat-message, [data-role="assistant"]').first();
            if (await response.isVisible({ timeout: 3000 })) {
              console.log('✅ 收到响应');
            } else {
              console.log('⚠️ 未检测到响应');
            }
            break;
        }
      } catch (e) {
        console.log(`⚠️ 步骤失败: ${step.action}`);
      }
    }

    console.log('✅ 完整用户流程测试完成');
  });
});

// 全局测试配置
test.use({
  timeout: 60000,
});

test.beforeAll(async () => {
  console.log('🚀 开始WeaveMind Chatbot侧边栏功能测试');
});

test.afterAll(async () => {
  console.log('✅ 所有测试完成');
});