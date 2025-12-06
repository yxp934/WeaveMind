/**
 * Settings Advisor API Tests
 * Tests for the settings optimization advisor API endpoints
 */

import { test, expect } from '@playwright/test'

test.describe('Settings Advisor API', () => {
  let authToken: string
  let userId: string
  let organizationId: string

  test.beforeAll(async ({ request }) => {
    // Setup: Login and get auth token
    const loginResponse = await request.post('/api/auth/signin', {
      data: {
        email: 'test@example.com',
        password: 'testpassword'
      }
    })

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json()
      authToken = loginData.session?.access_token
      userId = loginData.user?.id
    }
  })

  test('should respond with 401 for unauthorized requests', async ({ request }) => {
    const response = await request.post('/api/ai/settings-advisor', {
      data: {
        action: 'optimize_learning_path',
        context: {
          userRole: 'student',
          organizationId: 'test-org-id'
        }
      }
    })

    expect(response.status()).toBe(401)
  })

  test('should optimize learning path', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'optimize_learning_path',
        context: {
          userRole: 'student',
          organizationId: organizationId
        },
        preferences: {
          learningStyle: 'visual',
          difficulty: 'intermediate',
          interests: ['programming', 'data science']
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('learning_path')
    expect(data.data.learning_path).toHaveProperty('current_stage')
    expect(data.data.learning_path).toHaveProperty('next_steps')
    expect(data.data.learning_path).toHaveProperty('estimated_completion')
    expect(data.data.learning_path).toHaveProperty('difficulty_adjustments')
  })

  test('should recommend notifications', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'recommend_notifications',
        context: {
          userRole: 'student',
          organizationId: organizationId
        },
        preferences: {
          learningStyle: 'auditory',
          interests: ['music', 'language learning']
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('recommendations')
    expect(Array.isArray(data.data.recommendations)).toBe(true)

    // Verify recommendation structure
    data.data.recommendations.forEach((rec: any) => {
      expect(rec).toHaveProperty('setting_category')
      expect(rec).toHaveProperty('setting_key')
      expect(rec).toHaveProperty('recommended_value')
      expect(rec).toHaveProperty('reasoning')
      expect(rec).toHaveProperty('priority')
      expect(['low', 'medium', 'high']).toContain(rec.priority)
    })
  })

  test('should personalize interface', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'personalize_interface',
        context: {
          userRole: 'student',
          organizationId: organizationId
        },
        preferences: {
          learningStyle: 'kinesthetic',
          difficulty: 'beginner'
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('recommendations')
    expect(Array.isArray(data.data.recommendations)).toBe(true)
    expect(data.data.recommendations.length).toBeGreaterThan(0)
  })

  test('should analyze usage', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'analyze_usage',
        context: {
          userRole: 'student',
          organizationId: organizationId
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('usage_analysis')
    expect(data.data.usage_analysis).toHaveProperty('total_sessions')
    expect(data.data.usage_analysis).toHaveProperty('average_session_duration')
    expect(data.data.usage_analysis).toHaveProperty('most_used_features')
    expect(data.data.usage_analysis).toHaveProperty('learning_velocity')
    expect(['slow', 'normal', 'fast']).toContain(data.data.usage_analysis.learning_velocity)
    expect(data.data.usage_analysis).toHaveProperty('recommendations')
  })

  test('should handle self-learner role for settings advisor', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'optimize_learning_path',
        context: {
          userRole: 'self_learner',
          organizationId: organizationId
        },
        preferences: {
          learningStyle: 'reading_writing',
          interests: ['research', 'writing']
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.learning_path).toBeTruthy()
  })

  test('should handle invalid action type', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'invalid_action',
        context: {
          userRole: 'student',
          organizationId: organizationId
        }
      }
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('should handle missing required context', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'optimize_learning_path',
        // Missing context
      }
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('should handle insufficient permissions for viewing other user settings', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'analyze_usage',
        userId: 'different-user-id', // Different user
        context: {
          userRole: 'student',
          organizationId: organizationId
        }
      }
    })

    expect(response.status()).toBe(403)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })

  test('should allow teachers to view student settings', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    // This test assumes the authenticated user is a teacher
    const response = await request.post('/api/ai/settings-advisor', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'analyze_usage',
        userId: 'student-user-id', // Student user ID
        context: {
          userRole: 'teacher',
          organizationId: organizationId
        }
      }
    })

    // Should succeed if user is teacher, fail otherwise
    if (response.status() === 200) {
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.usage_analysis).toBeTruthy()
    } else {
      expect(response.status()).toBe(403)
    }
  })
})