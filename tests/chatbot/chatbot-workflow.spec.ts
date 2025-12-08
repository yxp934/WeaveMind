import { test, expect } from '@playwright/test';

test.describe('WeaveMind聊天机器人工作流测试', () => {
  test('应该能够加载主页并显示聊天机器人界面', async ({ page }) => {
    // 导航到主页
    await page.goto('https://weavemind.vercel.app');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 截图初始状态
    await page.screenshot({ path: 'test-01-homepage.png', fullPage: true });

    // 检查页面标题
    await expect(page).toHaveTitle(/WeaveMind/i);

    // 检查是否有聊天相关元素
    const hasChatElements = await page.locator('input, textarea, button').count();
    expect(hasChatElements).toBeGreaterThan(0);

    console.log('✅ 主页加载成功');
  });

  test('应该能够处理创建课程工作流', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 查找输入框
    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();

    // 检查输入框和发送按钮是否存在
    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    // 输入创建课程的请求
    await inputSelector.fill('我想要创建一个Python编程课程');

    // 点击发送按钮
    await sendButtonSelector.click();

    // 等待响应
    await page.waitForTimeout(3000);

    // 截图结果
    await page.screenshot({ path: 'test-02-course-creation.png', fullPage: true });

    // 检查是否有相关响应内容
    const responseText = await page.textContent('body');
    expect(responseText).toMatch(/课程|Python|创建/i);

    console.log('✅ 创建课程工作流测试完成');
  });

  test('应该能够处理生成大纲工作流', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();

    await inputSelector.fill('我需要为数学课程生成一个详细的大纲');
    await sendButtonSelector.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-03-outline-generation.png', fullPage: true });

    const responseText = await page.textContent('body');
    expect(responseText).toMatch(/大纲|数学|生成/i);

    console.log('✅ 生成大纲工作流测试完成');
  });

  test('应该能够处理创建作业工作流', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();

    await inputSelector.fill('我需要创建一份数学作业');
    await sendButtonSelector.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-04-assignment-creation.png', fullPage: true });

    const responseText = await page.textContent('body');
    expect(responseText).toMatch(/作业|数学|创建/i);

    console.log('✅ 创建作业工作流测试完成');
  });

  test('应该能够处理A2A优化工作流', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();

    await inputSelector.fill('我需要使用A2A优化我的课程内容');
    await sendButtonSelector.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-05-a2a-optimization.png', fullPage: true });

    const responseText = await page.textContent('body');
    expect(responseText).toMatch(/A2A|优化|课程/i);

    console.log('✅ A2A优化工作流测试完成');
  });

  test('应该能够处理内容生成工作流', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();

    await inputSelector.fill('我需要生成一些教学内容');
    await sendButtonSelector.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-06-content-generation.png', fullPage: true });

    const responseText = await page.textContent('body');
    expect(responseText).toMatch(/内容|生成|教学/i);

    console.log('✅ 内容生成工作流测试完成');
  });

  test('应该能够处理创建课程节次工作流', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();

    await inputSelector.fill('我需要创建新的课次');
    await sendButtonSelector.click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-07-session-creation.png', fullPage: true });

    const responseText = await page.textContent('body');
    expect(responseText).toMatch(/课次|创建|课程/i);

    console.log('✅ 创建课程节次工作流测试完成');
  });
});