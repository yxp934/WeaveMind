/**
 * Discussion Assistant API Tests
 * Tests for the discussion management assistant API endpoints
 */

import { test, expect } from '@playwright/test'

test.describe('Discussion Assistant API', () => {
  let authToken: string
  let userId: string
  let organizationId: string
  let classId: string
  let courseId: string
  let threadId: string

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
    const response = await request.post('/api/ai/discussion-assistant', {
      data: {
        action: 'suggest_topics',
        context: {
          userRole: 'teacher',
          organizationId: 'test-org-id'
        }
      }
    })

    expect(response.status()).toBe(401)
  })

  test('should suggest discussion topics', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'suggest_topics',
        classId: classId,
        courseId: courseId,
        context: {
          userRole: 'teacher',
          organizationId: organizationId
        },
        parameters: {
          topicCount: 5
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('suggestions')
    expect(Array.isArray(data.data.suggestions)).toBe(true)
    expect(data.data.suggestions.length).toBeGreaterThan(0)
  })

  test('should analyze discussion engagement', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'analyze_engagement',
        threadId: threadId,
        context: {
          userRole: 'teacher',
          organizationId: organizationId
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('analysis')
    expect(data.data.analysis).toHaveProperty('engagement_score')
    expect(data.data.analysis).toHaveProperty('recommendations')
    expect(data.data.analysis).toHaveProperty('participants')
  })

  test('should suggest replies', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'suggest_replies',
        threadId: threadId,
        context: {
          userRole: 'student',
          organizationId: organizationId
        },
        parameters: {
          originalPost: 'What are the key concepts we learned this week?',
          replyTone: 'friendly'
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('replies')
    expect(Array.isArray(data.data.replies)).toBe(true)
    expect(data.data.replies.length).toBeGreaterThan(0)

    // Verify reply structure
    data.data.replies.forEach((reply: any) => {
      expect(reply).toHaveProperty('content')
      expect(reply).toHaveProperty('reasoning')
      expect(reply).toHaveProperty('tone')
    })
  })

  test('should moderate discussion content', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'moderate_discussion',
        context: {
          userRole: 'teacher',
          organizationId: organizationId
        },
        parameters: {
          contentToReview: 'This is a sample discussion post for content moderation testing.'
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('moderation')
    expect(data.data.moderation).toHaveProperty('flagged_content')
    expect(data.data.moderation).toHaveProperty('recommended_actions')
  })

  test('should handle invalid action type', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'invalid_action',
        context: {
          userRole: 'teacher',
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

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'suggest_topics',
        // Missing context
      }
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('should handle insufficient permissions', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/discussion-assistant', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        action: 'suggest_topics',
        context: {
          userRole: 'student',
          organizationId: 'different-org-id' // Different organization
        }
      }
    })

    expect(response.status()).toBe(403)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('FORBIDDEN')
  })
})