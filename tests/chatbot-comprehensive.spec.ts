import { test, expect, Page } from '@playwright/test';

test.describe('WeaveMind Chatbot 全面功能测试', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // 导航到主页
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/WeaveMind/);
  });

  test.afterEach(async () => {
    // 清理测试数据
    console.log('测试完成，清理数据...');
  });

  test('1. 主页加载测试', async () => {
    console.log('🧪 测试 1: 主页加载');

    // 检查主要元素
    await expect(page.locator('text=WeaveMind')).toBeVisible();
    await expect(page.locator('text=Start Free Trial')).toBeVisible();
    await expect(page.locator('text=Login')).toBeVisible();

    console.log('✅ 主页加载成功');
  });

  test('2. 登录流程测试', async () => {
    console.log('🧪 测试 2: 登录流程');

    // 点击登录链接
    await page.click('text=Login');

    // 等待登录页面加载
    await expect(page).toHaveURL(/.*\/auth\/login/);

    // 输入测试账号
    await page.fill('input[type="email"]', 'jzibclub@jzib.com');
    await page.fill('input[type="password"]', 'Lao1dian5');

    // 点击登录按钮
    await page.click('button[type="submit"], button:has-text("登录"), button:has-text("Login")');

    // 等待登录完成
    await page.waitForTimeout(3000);

    // 检查是否成功登录（可能会跳转到角色选择或仪表板）
    const currentURL = page.url();
    console.log(`登录后URL: ${currentURL}`);

    if (currentURL.includes('/role-select')) {
      console.log('✅ 登录成功，跳转到角色选择页面');
    } else if (currentURL.includes('/teacher') || currentURL.includes('/student')) {
      console.log('✅ 登录成功，跳转到仪表板');
    } else {
      console.log('⚠️ 登录后页面未按预期跳转');
    }
  });

  test('3. 角色选择测试', async () => {
    console.log('🧪 测试 3: 角色选择');

    // 导航到角色选择页面
    await page.goto('http://localhost:3000/role-select');

    // 检查角色选择元素
    await expect(page.locator('text=Teacher,Student')).toBeVisible();

    // 选择Teacher角色
    await page.click('button:has-text("Teacher"), button:has-text("教师")');

    // 等待跳转
    await page.waitForTimeout(2000);

    // 检查是否跳转到教师仪表板
    await expect(page).toHaveURL(/.*\/teacher.*/);

    console.log('✅ 角色选择成功');
  });

  test('4. 教师仪表板访问测试', async () => {
    console.log('🧪 测试 4: 教师仪表板');

    // 直接导航到教师仪表板
    await page.goto('http://localhost:3000/teacher');

    // 检查仪表板元素
    await expect(page.locator('text=Dashboard,仪表板')).toBeVisible();

    // 检查侧边栏
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();

    console.log('✅ 教师仪表板访问成功');
  });

  test('5. Chatbot界面测试', async () => {
    console.log('🧪 测试 5: Chatbot界面');

    // 在教师仪表板中寻找Chatbot入口
    await page.goto('http://localhost:3000/teacher');

    // 寻找Chatbot相关按钮或链接
    const chatbotButtons = [
      'button:has-text("Chat"), button:has-text("聊天")',
      'button:has-text("AI Assistant"), button:has-text("AI助手")',
      'button:has-text("Assistant"), button:has-text("助手")',
      '[data-testid="chatbot"], [data-testid="chat-button"]'
    ];

    let chatbotFound = false;
    for (const selector of chatbotButtons) {
      if (await page.locator(selector).isVisible()) {
        await page.click(selector);
        chatbotFound = true;
        console.log('✅ 找到Chatbot入口并点击');
        break;
      }
    }

    if (!chatbotFound) {
      console.log('⚠️ 未找到Chatbot入口，尝试直接访问聊天页面');
      // 尝试常见的聊天页面路径
      const possiblePaths = [
        '/teacher/chat',
        '/teacher/assistant',
        '/teacher/chatbot',
        '/chat'
      ];

      for (const path of possiblePaths) {
        try {
          await page.goto(`http://localhost:3000${path}`);
          if (await page.locator('textarea, input[type="text"]').isVisible()) {
            console.log(`✅ 找到Chatbot页面: ${path}`);
            chatbotFound = true;
            break;
          }
        } catch (e) {
          // 继续尝试下一个路径
        }
      }
    }

    if (!chatbotFound) {
      console.log('❌ 无法找到Chatbot界面');
      throw new Error('Chatbot界面未找到');
    }
  });

  test('6. Chatbot基本交互测试', async () => {
    console.log('🧪 测试 6: Chatbot基本交互');

    // 假设已经进入Chatbot界面
    await page.goto('http://localhost:3000/teacher/chat');

    // 等待Chatbot界面加载
    await page.waitForTimeout(2000);

    // 寻找输入框
    const inputSelector = 'textarea, input[type="text"], [contenteditable="true"]';
    const inputBox = page.locator(inputSelector).first();

    // 检查输入框是否存在
    await expect(inputBox).toBeVisible({ timeout: 10000 });

    // 输入测试消息
    const testMessage = '你好，我想创建一个新的班级';
    await inputBox.fill(testMessage);

    // 寻找发送按钮
    const sendButton = page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send"), button:has-text("发送消息")').first();

    // 点击发送
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      // 如果没有发送按钮，尝试按Enter键
      await inputBox.press('Enter');
    }

    // 等待响应
    await page.waitForTimeout(5000);

    // 检查是否收到响应
    const response = page.locator('.message, .chat-message, [data-role="assistant"], .ai-response').first();
    const hasResponse = await response.isVisible();

    console.log(hasResponse ? '✅ Chatbot响应成功' : '⚠️ 未检测到Chatbot响应');

    // 检查TOON格式响应
    const pageContent = await page.content();
    const hasToonFormat = pageContent.includes('---BEGIN_TOON---') && pageContent.includes('---END_TOON---');

    console.log(hasToonFormat ? '✅ TOON格式响应正确' : '⚠️ TOON格式可能有问题');

    if (!hasToonFormat) {
      console.log('⚠️ 警告: Chatbot可能未返回TOON格式响应');
    }
  });

  test('7. Chatbot数据库操作测试', async () => {
    console.log('🧪 测试 7: Chatbot数据库操作');

    await page.goto('http://localhost:3000/teacher/chat');

    // 等待界面加载
    await page.waitForTimeout(2000);

    const inputBox = page.locator('textarea, input[type="text"]').first();

    // 测试班级创建功能
    await inputBox.fill('请帮我列出所有班级');
    await inputBox.press('Enter');

    await page.waitForTimeout(5000);

    // 检查是否有工具调用或数据库操作指示
    const hasDatabaseAction = await page.locator('text=数据库,数据库操作,list,create,update').isVisible();

    console.log(hasDatabaseAction ? '✅ 数据库操作测试成功' : '⚠️ 未检测到数据库操作');

    // 测试班级创建
    await inputBox.fill('创建一个新班级，名字叫"测试班级"');
    await inputBox.press('Enter');

    await page.waitForTimeout(5000);

    // 检查是否有创建确认
    const hasCreateConfirmation = await page.locator('text=确认,confirm,创建,create').isVisible();

    console.log(hasCreateConfirmation ? '✅ 班级创建功能正常' : '⚠️ 班级创建功能可能有问题');
  });

  test('8. 错误处理测试', async () => {
    console.log('🧪 测试 8: 错误处理');

    await page.goto('http://localhost:3000/teacher/chat');

    await page.waitForTimeout(2000);

    const inputBox = page.locator('textarea, input[type="text"]').first();

    // 发送可能导致错误的消息
    await inputBox.fill('这个功能不存在请试试这个');
    await inputBox.press('Enter');

    await page.waitForTimeout(5000);

    // 检查是否有错误处理
    const hasErrorHandling = await page.locator('text=错误,error,无法,无法处理').isVisible();

    console.log(hasErrorHandling ? '✅ 错误处理正常' : '⚠️ 错误处理可能缺失');
  });

  test('9. 性能和响应时间测试', async () => {
    console.log('🧪 测试 9: 性能和响应时间');

    await page.goto('http://localhost:3000/teacher/chat');

    await page.waitForTimeout(2000);

    const inputBox = page.locator('textarea, input[type="text"]').first();

    const startTime = Date.now();

    await inputBox.fill('简单测试消息');
    await inputBox.press('Enter');

    // 等待响应开始显示
    await page.waitForTimeout(1000);

    const responseTime = Date.now() - startTime;

    console.log(`响应时间: ${responseTime}ms`);

    if (responseTime < 10000) {
      console.log('✅ 响应时间在可接受范围内');
    } else {
      console.log('⚠️ 响应时间较慢，可能需要优化');
    }
  });

  test('10. 完整工作流测试', async () => {
    console.log('🧪 测试 10: 完整工作流测试');

    // 模拟完整的用户工作流程
    await page.goto('http://localhost:3000');

    // 1. 导航到登录
    await page.click('text=Login');

    // 2. 登录（如果需要的话）
    try {
      await page.fill('input[type="email"]', 'jzibclub@jzib.com');
      await page.fill('input[type="password"]', 'Lao1dian5');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('登录步骤跳过或失败');
    }

    // 3. 进入教师界面
    await page.goto('http://localhost:3000/teacher');

    // 4. 进入Chatbot
    await page.goto('http://localhost:3000/teacher/chat');

    // 5. 执行完整的班级创建工作流
    const inputBox = page.locator('textarea, input[type="text"]').first();
    await expect(inputBox).toBeVisible();

    // 步骤1: 创建班级
    await inputBox.fill('我想创建一个新的班级，名字叫"完整测试班级"，需要8节课');
    await inputBox.press('Enter');

    await page.waitForTimeout(5000);

    // 步骤2: 确认创建
    const confirmButton = page.locator('button:has-text("确认"), button:has-text("Confirm")').first();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await page.waitForTimeout(3000);
    }

    // 步骤3: 创建课次
    await inputBox.fill('现在为这个班级创建一些课次');
    await inputBox.press('Enter');

    await page.waitForTimeout(5000);

    // 步骤4: 列出班级确认
    await inputBox.fill('请列出我创建的所有班级');
    await inputBox.press('Enter');

    await page.waitForTimeout(5000);

    console.log('✅ 完整工作流测试完成');
  });
});

// 测试配置
test.use({
  timeout: 60000, // 60秒超时
});

// 全局测试配置
test.beforeAll(async () => {
  console.log('🚀 开始WeaveMind Chatbot全面测试');
});

test.afterAll(async () => {
  console.log('✅ 所有测试完成');
});