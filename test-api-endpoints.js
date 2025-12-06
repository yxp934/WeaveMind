// API端点测试脚本
// 测试新创建的设置管理和自学习者API端点

const API_BASE = 'http://localhost:3000/api';

// 测试数据
const testData = {
  // 设置管理测试数据
  settings: {
    userSetting: {
      scope: 'user',
      setting_category: 'preferences',
      setting_key: 'theme',
      setting_value: 'dark',
      data_type: 'string',
      description: 'User theme preference'
    },
    updateData: {
      setting_value: 'light',
      description: 'Updated theme preference'
    }
  },

  // 引导进度测试数据
  onboarding: {
    progress: {
      template_id: 'template-uuid',
      status: 'in_progress',
      current_step_index: 1,
      completed_steps: 1,
      total_steps: 5,
      step_data: [{ step: 1, completed: true }]
    }
  },

  // 自学习者测试数据
  selfLearner: {
    pathway: {
      title: 'My Learning Path',
      description: 'A test learning pathway',
      difficulty_level: 'beginner',
      estimated_duration_hours: 10,
      is_public: false,
      tags: ['test', 'learning']
    },
    pathwayUpdate: {
      title: 'Updated Learning Path',
      description: 'Updated description'
    },
    favorite: {
      favorite_type: 'course',
      course_id: 'course-uuid',
      notes: 'Great course!'
    }
  }
};

// API测试函数
class APITester {
  constructor() {
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
    this.results.push({ timestamp, message, type });
  }

  async testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
    try {
      this.log(`Testing ${method} ${endpoint}`);

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          // 在实际测试中需要添加认证token
          // 'Authorization': 'Bearer your-token-here'
        }
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const responseData = await response.json();

      if (response.status === expectedStatus) {
        this.log(`${method} ${endpoint} - SUCCESS (${response.status})`, 'success');
        return { success: true, data: responseData, status: response.status };
      } else {
        this.log(`${method} ${endpoint} - FAILED (${response.status}): ${responseData.error || 'Unknown error'}`, 'error');
        return { success: false, data: responseData, status: response.status };
      }
    } catch (error) {
      this.log(`${method} ${endpoint} - ERROR: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    this.log('开始API端点测试');

    // 设置管理API测试
    this.log('\n=== 设置管理API测试 ===');

    // 1. 获取用户设置
    await this.testEndpoint('GET', '/settings?limit=10&offset=0');

    // 2. 创建用户设置
    await this.testEndpoint('PUT', '/settings', testData.settings.userSetting, 201);

    // 3. 获取引导进度
    await this.testEndpoint('GET', '/onboarding/progress?limit=10');

    // 4. 更新引导进度
    await this.testEndpoint('PUT', '/onboarding/progress', testData.onboarding.progress);

    // 自学习者API测试
    this.log('\n=== 自学习者API测试 ===');

    // 5. 获取学习路径列表
    await this.testEndpoint('GET', '/self-learner/pathways?limit=10');

    // 6. 创建学习路径
    await this.testEndpoint('POST', '/self-learner/pathways', testData.selfLearner.pathway, 201);

    // 7. 更新学习路径 (需要实际ID)
    // await this.testEndpoint('PUT', '/self-learner/pathways/pathway-uuid', testData.selfLearner.pathwayUpdate);

    // 8. 删除学习路径 (需要实际ID)
    // await this.testEndpoint('DELETE', '/self-learner/pathways/pathway-uuid');

    // 9. 获取收藏列表
    await this.testEndpoint('GET', '/self-learner/favorites?limit=10');

    // 10. 添加收藏
    await this.testEndpoint('POST', '/self-learner/favorites', testData.selfLearner.favorite, 201);

    this.log('\n=== 测试完成 ===');
    this.printSummary();
  }

  printSummary() {
    const total = this.results.length;
    const success = this.results.filter(r => r.type === 'success').length;
    const errors = this.results.filter(r => r.type === 'error').length;

    this.log(`\n测试总结:`);
    this.log(`总测试数: ${total}`);
    this.log(`成功: ${success}`);
    this.log(`失败: ${errors}`);
    this.log(`成功率: ${((success / total) * 100).toFixed(1)}%`);
  }
}

// 运行测试
async function runTests() {
  const tester = new APITester();
  await tester.runAllTests();
}

// 如果直接运行此文件
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { APITester, runTests };