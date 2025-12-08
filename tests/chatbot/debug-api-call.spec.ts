import { test, expect } from '@playwright/test';

test.describe('调试API调用问题', () => {
  test('调试浏览器中的API调用', async ({ page }) => {
    console.log('🔍 开始调试浏览器API调用问题');

    // 1. 导航到网站
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 2. 找到聊天界面
    console.log('🔍 寻找聊天界面...');

    // 尝试点击聊天链接
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat"), [href*="chat"]').count();
    if (hasChatLink > 0) {
      console.log('📍 发现聊天链接，点击进入...');
      await page.locator('a:has-text("聊天"), a:has-text("Chat"), [href*="chat"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    // 3. 检查页面是否有聊天输入框
    const inputSelector = page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = page.locator('button:has-text("发送"), button:has-text("Send")').first();

    console.log('🔍 检查输入框...');
    await expect(inputSelector).toBeVisible();
    console.log('✅ 输入框存在');

    console.log('🔍 检查发送按钮...');
    await expect(sendButtonSelector).toBeVisible();
    console.log('✅ 发送按钮存在');

    // 4. 在发送消息前，先检查网络请求
    console.log('📡 监听网络请求...');

    // 设置网络请求监听器
    const apiCalls: any[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/ai/chat')) {
        console.log('🎯 检测到AI聊天API调用:', url);
        apiCalls.push({
          url: url,
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });

    // 5. 监听响应
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/ai/chat')) {
        console.log('📨 AI聊天API响应:', response.status());

        try {
          const responseData = await response.text();
          console.log('📄 API响应内容:');
          console.log(responseData.substring(0, 1000) + '...');

          // 检查是否是有效的JSON响应
          try {
            const jsonData = JSON.parse(responseData);
            console.log('✅ 响应是有效的JSON格式');
            console.log('📊 响应结构:', Object.keys(jsonData));

            if (jsonData.success) {
              console.log('✅ API调用成功');
              console.log('🤖 AI响应内容:', jsonData.data.message.substring(0, 200) + '...');
            } else {
              console.log('❌ API调用失败');
              console.log('❌ 错误信息:', jsonData.error);
            }
          } catch (jsonError) {
            console.log('❌ 响应不是有效的JSON');
            console.log('🔍 响应内容预览:', responseData.substring(0, 200));
          }
        } catch (error) {
          console.log('❌ 无法读取响应内容:', error);
        }
      }
    });

    // 6. 发送测试消息
    console.log('📝 发送测试消息...');
    const testMessage = '我想要创建一个Python编程课程';
    await inputSelector.fill(testMessage);
    console.log('📝 已填入消息:', testMessage);

    // 7. 点击发送按钮
    console.log('🔘 点击发送按钮...');
    await sendButtonSelector.click();
    console.log('✅ 消息已发送');

    // 8. 等待响应
    console.log('⏳ 等待AI响应...');
    await page.waitForTimeout(8000);

    // 9. 检查页面上的AI响应
    console.log('🔍 检查页面上的AI响应...');
    const pageContent = await page.textContent('body');
    console.log('📄 页面内容长度:', pageContent.length);

    // 检查是否包含Next.js代码
    if (pageContent.includes('self.__next_f')) {
      console.log('❌ 发现Next.js代码 - 这表明有问题');
      console.log('🔍 Next.js代码预览:', pageContent.substring(0, 500));
    } else if (pageContent.includes('Python') || pageContent.includes('课程')) {
      console.log('✅ 发现预期的AI响应内容');
      console.log('🤖 AI响应预览:', pageContent.substring(0, 500));
    } else {
      console.log('⚠️ 响应内容不明确');
      console.log('🔍 页面内容预览:', pageContent.substring(0, 300));
    }

    // 10. 截图最终状态
    await page.screenshot({ path: 'debug-api-call-final.png', fullPage: true });
    console.log('📸 截图已保存: debug-api-call-final.png');

    // 11. 输出调试信息
    console.log('📊 API调用总结:');
    console.log('- 检测到的API调用数量:', apiCalls.length);
    if (apiCalls.length > 0) {
      const call = apiCalls[0];
      console.log('- API端点:', call.url);
      console.log('- 请求方法:', call.method);
      console.log('- 请求头:', JSON.stringify(call.headers, null, 2));
    }

    console.log('✅ 调试完成');
  });

  test('对比：直接API调用vs浏览器调用', async ({ page }) => {
    console.log('🔄 对比直接API调用和浏览器调用...');

    // 1. 直接API调用（模拟之前的成功测试）
    console.log('📡 测试1：直接API调用');
    const directResponse = await page.request.post('https://weavemind.vercel.app/api/ai/chat', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        message: '我想要创建一个Python编程课程',
        context: {
          userRole: 'teacher',
          sessionId: 'debug-session-123',
          conversationHistory: []
        }
      }
    });

    console.log('📡 直接API调用状态:', directResponse.status());
    const directData = await directResponse.json();
    console.log('✅ 直接API调用成功');
    console.log('🤖 直接API响应:', directData.data.message.substring(0, 200) + '...');

    // 2. 浏览器调用
    console.log('🖥️ 测试2：浏览器调用');
    await page.goto('https://weavemind.vercel.app');
    await page.waitForLoadState('networkidle');

    // 找到聊天界面
    const hasChatLink = await page.locator('a:has-text("聊天"), a:has-text("Chat")').count();
    if (hasChatLink > 0) {
      await page.locator('a:has-text("聊天"), a:has-text("Chat")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }

    const inputSelector = page.locator('input[type="text"], textarea').first();
    const sendButtonSelector = page.locator('button:has-text("发送"), button:has-text("Send")').first();

    await inputSelector.fill('我想要创建一个Python编程课程');
    await sendButtonSelector.click();
    await page.waitForTimeout(8000);

    const browserContent = await page.textContent('body');
    console.log('🖥️ 浏览器调用响应预览:', browserContent.substring(0, 200) + '...');

    // 3. 对比结果
    console.log('📊 结果对比:');
    if (browserContent.includes('self.__next_f')) {
      console.log('❌ 浏览器调用返回了Next.js代码 - 这是问题所在');
    } else if (browserContent.includes('Python') || browserContent.includes('课程')) {
      console.log('✅ 浏览器调用正常工作');
    } else {
      console.log('⚠️ 浏览器调用结果不明确');
    }
  });
});