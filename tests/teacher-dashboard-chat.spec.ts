import { test, expect } from '@playwright/test';

test.describe('Teacher Dashboard Chatbot Testing', () => {
  test('测试teacher dashboard中的SidebarChatbot功能', async ({ page }) => {
    console.log('🔍 开始测试teacher dashboard中的聊天机器人...');

    // 1. 访问teacher dashboard
    await page.goto('https://weavemind.vercel.app/teacher');
    console.log('📱 已访问teacher dashboard页面');

    // 2. 等待页面加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 3. 检查SidebarChatbot是否存在
    const sidebarChatbot = page.locator('[data-testid="sidebar-chatbot"], .sidebar-chatbot, [class*="SidebarChatbot"]');
    const chatbotExists = await sidebarChatbot.count();
    console.log('🤖 找到SidebarChatbot数量:', chatbotExists);

    // 4. 查找聊天输入框
    const inputLocator = page.locator('input[type="text"]').filter({ hasText: /输入您的问题或需求/ });
    const inputExists = await inputLocator.count();
    console.log('📝 找到聊天输入框数量:', inputExists);

    if (inputExists > 0) {
      console.log('✅ 找到聊天输入框');

      // 5. 发送测试消息
      await inputLocator.fill('帮我创建一个神经科学的入门课');
      console.log('📝 已填入测试消息');

      // 6. 查找并点击发送按钮
      const sendButton = page.locator('button').filter({ hasText: /发送/ });
      await sendButton.click();
      console.log('🔘 已点击发送按钮');

      // 7. 等待AI响应
      console.log('⏳ 等待AI响应...');
      await page.waitForTimeout(8000);

      // 8. 检查页面内容
      const pageContent = await page.textContent('body');
      console.log('📄 页面内容长度:', pageContent.length);

      // 9. 检查是否有AI响应内容
      const hasAIResponse = pageContent.includes('神经科学') ||
                           pageContent.includes('课程') ||
                           pageContent.includes('好的！我来帮您');

      if (hasAIResponse) {
        console.log('✅ 检测到AI响应内容');

        // 10. 查找具体消息内容
        const messages = page.locator('[data-testid="chat-message"], .message, [class*="message"]').all();
        const messageCount = await messages.length;
        console.log('💬 找到消息数量:', messageCount);

        // 逐个检查消息
        for (let i = 0; i < Math.min(messageCount, 5); i++) {
          const message = messages[i];
          const messageText = await message.textContent();
          console.log(`💬 消息${i + 1}:`, messageText?.substring(0, 200) + '...');
        }
      } else {
        console.log('❌ 未检测到AI响应内容');
        console.log('🔍 页面内容预览:', pageContent.substring(0, 500));
      }

      // 11. 截图记录
      await page.screenshot({ path: 'teacher-dashboard-chat-test.png', fullPage: true });
      console.log('📸 截图已保存: teacher-dashboard-chat-test.png');

    } else {
      console.log('❌ 未找到聊天输入框');
      // 截图记录
      await page.screenshot({ path: 'teacher-dashboard-no-chat.png', fullPage: true });
    }
  });
});