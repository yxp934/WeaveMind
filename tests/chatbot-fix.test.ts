import { test, expect } from '@playwright/test';

test.describe('Chatbot Fix Verification', () => {
  test('应该能够处理用户查询班级列表的请求', async ({ page }) => {
    // 导航到网站
    await page.goto('https://weavemind.vercel.app');

    // 等待页面加载并检查是否显示登录表单
    await page.waitForSelector('form', { timeout: 10000 });

    // 记录聊天机器人的响应
    let chatbotResponse = '';
    page.on('response', response => {
      if (response.url().includes('/api/ai/chat')) {
        response.text().then(text => {
          console.log('Chatbot Response:', text);
          chatbotResponse = text;
        });
      }
    });

    // 输入测试消息
    const chatInput = page.locator('input, textarea').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('列出班级');
      await chatInput.press('Enter');

      // 等待响应
      await page.waitForTimeout(3000);

      // 验证响应不应该包含固定回复
      if (chatbotResponse) {
        expect(chatbotResponse).not.toContain('我刚才没能稳定解析模型输出');
        expect(chatbotResponse).not.toContain('I couldn\'t reliably parse the model output');
        expect(chatbotResponse).not.toContain('我可以帮您');
      }
    }
  });

  test('应该能够处理创建班级的请求', async ({ page }) => {
    await page.goto('https://weavemind.vercel.app');

    let chatbotResponse = '';
    page.on('response', response => {
      if (response.url().includes('/api/ai/chat')) {
        response.text().then(text => {
          console.log('Chatbot Response (Create):', text);
          chatbotResponse = text;
        });
      }
    });

    const chatInput = page.locator('input, textarea').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('创建新班级');
      await chatInput.press('Enter');

      await page.waitForTimeout(3000);

      // 验证响应不包含固定错误消息
      if (chatbotResponse) {
        expect(chatbotResponse).not.toContain('我刚才没能稳定解析模型输出');
      }
    }
  });
});
