/**
 * AI Chat API Tests
 * Tests for the unified AI chat API endpoints
 */

import { test, expect } from '@playwright/test'

test.describe('AI Chat API', () => {
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
    const response = await request.post('/api/ai/chat', {
      data: {
        message: 'Hello AI'
      }
    })

    expect(response.status()).toBe(401)
  })

  test('should handle invalid request data', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        // Missing required message field
        context: {
          userRole: 'student'
        }
      }
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  test('should process valid chat request', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: 'What can you help me with?',
        context: {
          userRole: 'student',
          organizationId: organizationId
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('message')
    expect(data.data.message).toBeTruthy()
    expect(data.metadata).toHaveProperty('timestamp')
    expect(data.metadata).toHaveProperty('requestId')
  })

  test('should handle chat with conversation history', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.post('/api/ai/chat', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        message: 'Continue our conversation',
        context: {
          userRole: 'student',
          organizationId: organizationId,
          conversationHistory: [
            {
              role: 'user',
              content: 'Hello',
              timestamp: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: 'Hi there! How can I help you?',
              timestamp: new Date().toISOString()
            }
          ]
        }
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.message).toBeTruthy()
  })

  test('should get chat history', async ({ request }) => {
    if (!authToken) {
      test.skip()
    }

    const response = await request.get('/api/ai/chat?limit=10&offset=0', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
})