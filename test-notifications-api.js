/**
 * WeaveMind LMS - 通知系统API测试脚本
 * 使用Playwright MCP进行端到端测试
 */

const API_BASE_URL = 'http://localhost:3000/api/notifications'

// 测试数据
const testUserId = '123e4567-e89b-12d3-a456-426614174000'
const testNotificationId = '987fcdeb-51a2-43d1-9c4f-123456789abc'
const testClassId = '555e4567-e89b-12d3-a456-426614174111'
const testCourseId = '666e4567-e89b-12d3-a456-426614174222'

// 测试用例
const testCases = [
  {
    name: 'GET /api/notifications - 获取通知列表',
    method: 'GET',
    url: `${API_BASE_URL}?page=1&limit=10&status=unread`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             Array.isArray(response.data.notifications) &&
             response.data.pagination
    }
  },
  {
    name: 'GET /api/notifications - 带过滤参数',
    method: 'GET',
    url: `${API_BASE_URL}?type=assignment_due&priority=high&status=all`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success && response.data
    }
  },
  {
    name: 'PUT /api/notifications/read-all - 批量标记已读',
    method: 'PUT',
    url: `${API_BASE_URL}/read-all`,
    body: {
      status: 'read',
      scope: 'unread'
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             typeof response.data.updated_count === 'number'
    }
  },
  {
    name: 'PUT /api/notifications/[id]/read - 标记单个通知已读',
    method: 'PUT',
    url: `${API_BASE_URL}/${testNotificationId}/read`,
    body: {
      read_at: new Date().toISOString()
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.notification &&
             response.data.notification.is_read === true
    }
  },
  {
    name: 'GET /api/notifications/[id]/read - 获取通知阅读状态',
    method: 'GET',
    url: `${API_BASE_URL}/${testNotificationId}/read`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.read_status
    }
  },
  {
    name: 'DELETE /api/notifications/[id] - 删除通知',
    method: 'DELETE',
    url: `${API_BASE_URL}/${testNotificationId}`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.operation &&
             response.data.operation.action === 'archive'
    }
  },
  {
    name: 'GET /api/notifications/[id] - 获取通知详情',
    method: 'GET',
    url: `${API_BASE_URL}/${testNotificationId}`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.notification &&
             response.data.notification.id === testNotificationId
    }
  },
  {
    name: 'GET /api/notifications/preferences - 获取通知偏好',
    method: 'GET',
    url: `${API_BASE_URL}/preferences`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             Array.isArray(response.data.preferences)
    }
  },
  {
    name: 'PUT /api/notifications/preferences - 更新通知偏好',
    method: 'PUT',
    url: `${API_BASE_URL}/preferences`,
    body: {
      notification_type: 'assignment_due',
      delivery_preferences: {
        in_app: true,
        email: true,
        push: false
      },
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00'
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.preference &&
             response.data.preference.notification_type === 'assignment_due'
    }
  },
  {
    name: 'POST /api/notifications/preferences - 批量更新偏好',
    method: 'POST',
    url: `${API_BASE_URL}/preferences`,
    body: {
      preferences: [
        {
          notification_type: 'course_update',
          delivery_preferences: {
            in_app: true,
            email: false,
            push: true
          }
        },
        {
          notification_type: 'grade_posted',
          delivery_preferences: {
            in_app: true,
            email: true,
            push: true
          }
        }
      ]
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.summary &&
             typeof response.data.summary.total === 'number'
    }
  },
  {
    name: 'DELETE /api/notifications/preferences - 删除偏好设置',
    method: 'DELETE',
    url: `${API_BASE_URL}/preferences`,
    body: {
      preference_id: testNotificationId
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.preference_id
    }
  },
  {
    name: 'POST /api/notifications/send - 发送通知',
    method: 'POST',
    url: `${API_BASE_URL}/send`,
    body: {
      recipients: [
        {
          type: 'user',
          id: testUserId
        }
      ],
      title: '测试通知',
      content: '这是一条测试通知的内容',
      type: 'system_alert',
      priority: 'normal',
      delivery_methods: ['in_app']
    },
    expectedStatus: 201,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             Array.isArray(response.data.notifications) &&
             response.data.notifications.length > 0
    }
  },
  {
    name: 'POST /api/notifications/send - 发送班级通知',
    method: 'POST',
    url: `${API_BASE_URL}/send`,
    body: {
      recipients: [
        {
          type: 'class',
          id: testClassId
        }
      ],
      title: '班级公告',
      content: '明天有重要活动，请大家准时参加。',
      type: 'class_announcement',
      priority: 'high',
      class_id: testClassId,
      delivery_methods: ['in_app', 'push']
    },
    expectedStatus: 201,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.statistics &&
             response.data.statistics.notifications_created > 0
    }
  },
  {
    name: 'GET /api/notifications/summary - 获取通知统计',
    method: 'GET',
    url: `${API_BASE_URL}/summary`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.overview &&
             typeof response.data.overview.total_unread === 'number'
    }
  },
  {
    name: 'GET /api/notifications/summary - 带日期范围',
    method: 'GET',
    url: `${API_BASE_URL}/summary?date_from=2024-01-01&date_to=2024-01-31`,
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.distribution
    }
  },
  {
    name: 'POST /api/notifications/summary - 自定义统计报告',
    method: 'POST',
    url: `${API_BASE_URL}/summary`,
    body: {
      date_range: {
        from: '2024-01-01',
        to: '2024-01-31'
      },
      group_by: 'type',
      include_archived: false,
      filters: {
        type: 'assignment_due'
      }
    },
    expectedStatus: 200,
    validateResponse: (response) => {
      return response.success &&
             response.data &&
             response.data.grouped_statistics
    }
  }
]

// 错误测试用例
const errorTestCases = [
  {
    name: 'GET /api/notifications - 无认证',
    method: 'GET',
    url: `${API_BASE_URL}`,
    headers: {
      'Authorization': 'Bearer invalid-token'
    },
    expectedStatus: 401
  },
  {
    name: 'GET /api/notifications - 无效分页参数',
    method: 'GET',
    url: `${API_BASE_URL}?page=-1&limit=0`,
    expectedStatus: 400
  },
  {
    name: 'GET /api/notifications - 无效状态过滤',
    method: 'GET',
    url: `${API_BASE_URL}?status=invalid_status`,
    expectedStatus: 400
  },
  {
    name: 'PUT /api/notifications/[id]/read - 无效通知ID',
    method: 'PUT',
    url: `${API_BASE_URL}/invalid-uuid/read`,
    expectedStatus: 400
  },
  {
    name: 'DELETE /api/notifications/[id] - 无效通知ID',
    method: 'DELETE',
    url: `${API_BASE_URL}/invalid-uuid`,
    expectedStatus: 400
  },
  {
    name: 'PUT /api/notifications/preferences - 无效数据',
    method: 'PUT',
    url: `${API_BASE_URL}/preferences`,
    body: {
      notification_type: 'invalid_type',
      delivery_preferences: {
        in_app: 'invalid_boolean'
      }
    },
    expectedStatus: 400
  },
  {
    name: 'POST /api/notifications/send - 无效接收者',
    method: 'POST',
    url: `${API_BASE_URL}/send`,
    body: {
      recipients: [],
      title: '测试',
      content: '测试内容',
      type: 'system_alert'
    },
    expectedStatus: 400
  },
  {
    name: 'POST /api/notifications/send - 范围验证失败',
    method: 'POST',
    url: `${API_BASE_URL}/send`,
    body: {
      recipients: [
        {
          type: 'class',
          id: testClassId
        }
      ],
      title: '测试',
      content: '测试内容',
      type: 'system_alert'
      // 缺少 class_id
    },
    expectedStatus: 400
  }
]

// 运行测试
async function runTests() {
  console.log('开始测试 WeaveMind LMS 通知系统 API...')
  console.log(`API基础URL: ${API_BASE_URL}`)
  console.log('=' * 80)

  let passed = 0
  let failed = 0

  // 测试正常功能
  console.log('\n📋 正常功能测试:')
  for (const testCase of testCases) {
    try {
      const result = await runSingleTest(testCase)
      if (result.passed) {
        console.log(`✅ ${testCase.name}`)
        passed++
      } else {
        console.log(`❌ ${testCase.name}`)
        console.log(`   错误: ${result.error}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}`)
      console.log(`   异常: ${error.message}`)
      failed++
    }
  }

  // 测试错误处理
  console.log('\n🚨 错误处理测试:')
  for (const testCase of errorTestCases) {
    try {
      const result = await runSingleTest(testCase)
      if (result.passed) {
        console.log(`✅ ${testCase.name}`)
        passed++
      } else {
        console.log(`❌ ${testCase.name}`)
        console.log(`   错误: ${result.error}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}`)
      console.log(`   异常: ${error.message}`)
      failed++
    }
  }

  // 测试结果统计
  console.log('\n' + '=' * 80)
  console.log('📊 测试结果统计:')
  console.log(`✅ 通过: ${passed}`)
  console.log(`❌ 失败: ${failed}`)
  console.log(`📈 总计: ${passed + failed}`)
  console.log(`🎯 成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`)

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！通知系统API开发完成。')
  } else {
    console.log(`\n⚠️  有 ${failed} 个测试失败，请检查相关功能。`)
  }
}

// 运行单个测试
async function runSingleTest(testCase) {
  try {
    const response = await fetch(testCase.url, {
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json',
        ...testCase.headers
      },
      body: testCase.body ? JSON.stringify(testCase.body) : undefined
    })

    const status = response.status
    const data = await response.json()

    // 检查状态码
    if (status !== testCase.expectedStatus) {
      return {
        passed: false,
        error: `期望状态码 ${testCase.expectedStatus}，实际 ${status}`
      }
    }

    // 检查响应数据
    if (testCase.validateResponse && !testCase.validateResponse(data)) {
      return {
        passed: false,
        error: '响应数据验证失败'
      }
    }

    return { passed: true }
  } catch (error) {
    return {
      passed: false,
      error: error.message
    }
  }
}

// 执行测试
runTests().catch(console.error)
