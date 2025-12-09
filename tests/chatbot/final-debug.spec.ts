import { test, expect } from '@playwright/test';

test.describe('最终调试测试', () => {
  test('深度调试页面内容', async ({ page }) => {
    console.log('🔍 开始深度调试页面内容...');

    // 访问聊天页面
    await page.goto('https://weavemind.vercel.app/chatbot');
    console.log('📱 已访问聊天页面');

    // 等待页面加载
    await page.waitForTimeout(3000);

    // 查找输入框
    const inputLocator = page.locator('input[type="text"]').first();
    await inputLocator.waitFor({ timeout: 10000 });
    console.log('✅ 找到输入框');

    // 发送测试消息
    await inputLocator.fill('我想要创建一个Python编程课程');
    console.log('📝 已填入测试消息');

    // 查找并点击发送按钮
    const sendButton = page.locator('button').filter({ hasText: /发送/ });
    await sendButton.click();
    console.log('🔘 已点击发送按钮');

    // 等待AI响应
    console.log('⏳ 等待AI响应...');
    await page.waitForTimeout(8000);

    // 详细检查页面内容
    const pageContent = await page.content();
    console.log('📄 完整页面内容长度:', pageContent.length);
    console.log('📄 页面内容开头:', pageContent.substring(0, 500));

    // 查找聊天消息元素
    const chatMessages = page.locator('[data-testid="chat-message"], .message, .chat-message').all();
    const messageCount = await chatMessages.length;
    console.log('💬 找到聊天消息数量:', messageCount);

    // 逐个检查消息内容
    for (let i = 0; i < messageCount; i++) {
      const message = chatMessages[i];
      const messageText = await message.textContent();
      console.log(`💬 消息${i + 1}:`, messageText?.substring(0, 200) + '...');
    }

    // 检查是否有Next.js水合代码（不是正常的HTML）
    const hasNextJSHydrationCode = (
      pageContent.includes('self.__next_f=self.__next_f||[]') &&
      pageContent.includes('push([0])') &&
      pageContent.length < 2000 // 正常HTML不应该只有这么短的Next.js代码
    );

    if (hasNextJSHydrationCode) {
      console.log('❌ 检测到Next.js水合代码:', pageContent.substring(0, 300));
      throw new Error('页面仍显示Next.js水合代码');
    }

    // 检查是否有AI响应内容
    const hasAIResponse = pageContent.includes('Python') && pageContent.includes('课程');
    if (hasAIResponse) {
      console.log('✅ 检测到AI响应内容');
      // 找到AI响应内容
      const aiResponseIndex = pageContent.indexOf('好的！我来帮您创建');
      if (aiResponseIndex !== -1) {
        const responseContent = pageContent.substring(aiResponseIndex, aiResponseIndex + 500);
        console.log('🤖 AI响应内容:', responseContent);
      }
    } else {
      console.log('❌ 未检测到AI响应内容');
      throw new Error('页面未显示AI响应');
    }
  });
});