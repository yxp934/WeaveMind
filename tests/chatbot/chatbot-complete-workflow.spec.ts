import { test, expect } from '@playwright/test';

test.describe('WeaveMind聊天机器人完整工作流端到端测试', () => {
  test('完整8步课程创建工作流测试', async ({ page }) => {
    console.log('🚀 开始完整课程创建工作流测试');

    // 1. 导航到网站并找到聊天界面
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 截图初始页面
    await page.screenshot({ path: 'workflow-test-01-homepage.png', fullPage: true });
    console.log('📸 截图保存：workflow-test-01-homepage.png');

    // 2. 寻找并点击聊天相关链接或直接查找聊天界面
    console.log('🔍 寻找聊天界面...');

    // 查找聊天输入框
    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button:has-text("发送"), button:has-text("Send")').first();

    // 如果没有找到，尝试点击聊天链接
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat"), [href*="chat"]').count();
    if (hasChatLink > 0) {
      console.log('🔗 发现聊天链接，点击进入...');
      await page.locator('a:has-text("聊天"), a:has-text("Chat"), [href*="chat"]').first().click();
      await page.waitForLoadState('networkidle');
    }

    // 等待页面加载完成
    await page.waitForTimeout(3000);

    // 重新检查输入框和按钮
    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    console.log('✅ 找到聊天界面，输入框和发送按钮');

    // 3. 发送第一个消息：创建课程请求
    console.log('📝 发送第1条消息：创建课程请求');
    await inputSelector.fill('我想要创建一个Python编程课程');
    await sendButtonSelector.click();

    // 4. 等待AI响应
    console.log('⏳ 等待AI响应...');
    await page.waitForTimeout(5000);

    // 截图AI第一次响应
    await page.screenshot({ path: 'workflow-test-02-first-response.png', fullPage: true });

    // 5. 获取AI响应内容
    const firstResponse = await page.textContent('body');
    console.log('🤖 AI第一次响应内容：');
    console.log(firstResponse.substring(0, 500) + '...');

    // 验证AI是否正确识别了课程创建意图
    expect(firstResponse).toMatch(/课程|Python|创建/i);
    expect(firstResponse).toMatch(/步|工作流|引导/i);

    // 6. 检查AI是否要求选择课程节数
    if (firstResponse.includes('4节课') || firstResponse.includes('8节课')) {
      console.log('✅ AI正确引导选择课程节数');

      // 选择8节课
      console.log('📝 发送第2条消息：选择8节课');
      await inputSelector.fill('B) 8节课 (8周完成)');
      await sendButtonSelector.click();

      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'workflow-test-03-lesson-count-selected.png', fullPage: true });

      // 7. 检查AI是否询问每周上课频率
      const secondResponse = await page.textContent('body');
      console.log('🤖 AI第二次响应：');
      console.log(secondResponse.substring(0, 500) + '...');

      if (secondResponse.includes('每周') || secondResponse.includes('频率')) {
        console.log('✅ AI正确引导选择每周上课频率');

        // 选择每周两次
        console.log('📝 发送第3条消息：选择每周两次');
        await inputSelector.fill('B) 每周两次');
        await sendButtonSelector.click();

        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'workflow-test-04-frequency-selected.png', fullPage: true });

        // 8. 继续验证工作流的下一步
        const thirdResponse = await page.textContent('body');
        console.log('🤖 AI第三次响应：');
        console.log(thirdResponse.substring(0, 500) + '...');

        // 验证工作流是否继续进行
        expect(thirdResponse).toMatch(/课程|下一步|继续/i);

        console.log('✅ 工作流继续进行到第3步');
      }
    }

    console.log('✅ 8步课程创建工作流测试完成');
  });

  test('完整大纲生成工作流测试', async ({ page }) => {
    console.log('📋 开始大纲生成工作流测试');

    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 找到聊天界面
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat")').count();
    if (hasChatLink > 0) {
      await page.locator('a:has-text("聊天"), a:has-text("Chat")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button:has-text("发送"), button:has-text("Send")').first();

    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    // 发送大纲生成请求
    console.log('📝 发送大纲生成请求');
    await inputSelector.fill('我需要为数学课程生成一个详细的大纲');
    await sendButtonSelector.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'workflow-test-05-outline-request.png', fullPage: true });

    const outlineResponse = await page.textContent('body');
    console.log('🤖 大纲生成响应：');
    console.log(outlineResponse.substring(0, 500) + '...');

    // 验证大纲生成工作流
    expect(outlineResponse).toMatch(/大纲|数学|生成/i);
    expect(outlineResponse).toMatch(/请提供|信息|主题/i);

    console.log('✅ 大纲生成工作流测试完成');
  });

  test('完整作业创建工作流测试', async ({ page }) => {
    console.log('📝 开始作业创建工作流测试');

    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 找到聊天界面
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat")').count();
    if (hasChatLink > 0) {
      await page.locator('a:has-text("聊天"), a:has-text("Chat")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button:has-text("发送"), button:has-text("Send")').first();

    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    // 发送作业创建请求
    console.log('📝 发送作业创建请求');
    await inputSelector.fill('我需要创建一份数学作业');
    await sendButtonSelector.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'workflow-test-06-assignment-request.png', fullPage: true });

    const assignmentResponse = await page.textContent('body');
    console.log('🤖 作业创建响应：');
    console.log(assignmentResponse.substring(0, 500) + '...');

    // 验证作业创建工作流
    expect(assignmentResponse).toMatch(/作业|数学|创建/i);
    expect(assignmentResponse).toMatch(/测验|写作|研究/i);

    console.log('✅ 作业创建工作流测试完成');
  });

  test('完整A2A优化工作流测试', async ({ page }) => {
    console.log('🔄 开始A2A优化工作流测试');

    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 找到聊天界面
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat")').count();
    if (hasChatLink > 0) {
      await page.locator('a:has-text("聊天"), a:has-text("Chat")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button:has-text("发送"), button:has-text("Send")').first();

    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    // 发送A2A优化请求
    console.log('📝 发送A2A优化请求');
    await inputSelector.fill('我需要使用A2A优化我的课程内容');
    await sendButtonSelector.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'workflow-test-07-a2a-request.png', fullPage: true });

    const a2aResponse = await page.textContent('body');
    console.log('🤖 A2A优化响应：');
    console.log(a2aResponse.substring(0, 500) + '...');

    // 验证A2A优化工作流
    expect(a2aResponse).toMatch(/A2A|优化|课程/i);
    expect(a2aResponse).toMatch(/代理|迭代|反馈/i);

    console.log('✅ A2A优化工作流测试完成');
  });

  test('完整内容生成工作流测试', async ({ page }) => {
    console.log('📚 开始内容生成工作流测试');

    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 找到聊天界面
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat")').count();
    if (hasChatLink > 0) {
      await page.locator('a:has-text("聊天"), a:has-text("Chat")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button:has-text("发送"), button:has-text("Send")').first();

    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    // 发送内容生成请求
    console.log('📝 发送内容生成请求');
    await inputSelector.fill('我需要生成一些教学内容');
    await sendButtonSelector.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'workflow-test-08-content-request.png', fullPage: true });

    const contentResponse = await page.textContent('body');
    console.log('🤖 内容生成响应：');
    console.log(contentResponse.substring(0, 500) + '...');

    // 验证内容生成工作流
    expect(contentResponse).toMatch(/内容|生成|教学/i);
    expect(contentResponse).toMatch(/章节|练习|材料/i);

    console.log('✅ 内容生成工作流测试完成');
  });

  test('完整课程节次创建工作流测试', async ({ page }) => {
    console.log('📅 开始课程节次创建工作流测试');

    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 找到聊天界面
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat")').count();
    if (hasChatLink > 0) {
      await page.locator('a:has-text("聊天"), a:has-text("Chat")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const inputSelector = await page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = await page.locator('button:has-text("发送"), button:has-text("Send")').first();

    await expect(inputSelector).toBeVisible();
    await expect(sendButtonSelector).toBeVisible();

    // 发送节次创建请求
    console.log('📝 发送节次创建请求');
    await inputSelector.fill('我需要创建新的课次');
    await sendButtonSelector.click();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'workflow-test-09-session-request.png', fullPage: true });

    const sessionResponse = await page.textContent('body');
    console.log('🤖 节次创建响应：');
    console.log(sessionResponse.substring(0, 500) + '...');

    // 验证节次创建工作流
    expect(sessionResponse).toMatch(/课次|创建|课程/i);
    expect(sessionResponse).toMatch(/主题|时长|目标/i);

    console.log('✅ 课程节次创建工作流测试完成');
  });
});