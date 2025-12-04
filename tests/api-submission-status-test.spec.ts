/**
 * API Submission Status Test
 * Tests the newly implemented submission status functionality
 */

import { test, expect } from '@playwright/test';

// Note: This test requires a running development server
// Run with: npm run dev (in one terminal) and then npm test

test.describe('Assignment Submission Status API', () => {
  test.beforeAll(async () => {
    // Setup test data or authenticate test user
  });

  test.describe('Writing Assignment API', () => {
    test('should save submission as draft by default', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {
            content: 'This is a test essay content for writing assignment.',
          },
        }
      );

      expect(response.status()).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.submission.status).toBe('draft');
      expect(json.submission.final_submitted_at).toBeNull();
      expect(json.submission.word_count).toBeGreaterThan(0);
    });

    test('should save submission as submitted when submit=true', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {
            content: 'This is a test essay content for writing assignment.',
            submit: true,
          },
        }
      );

      expect(response.status()).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.submission.status).toBe('submitted');
      expect(json.submission.final_submitted_at).not.toBeNull();
      expect(json.submission.word_count).toBeGreaterThan(0);
    });

    test('should prevent modifying submitted submission without submit flag', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {
            content: 'Trying to modify a submitted submission.',
          },
        }
      );

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('already been submitted');
    });

    test('should allow resubmitting with updated content', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {
            content: 'Updated content for resubmission.',
            submit: true,
          },
        }
      );

      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json.submission.status).toBe('submitted');
      expect(json.submission.final_submitted_at).not.toBeNull();
    });

    test('should return submission with status field in GET', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.get(
        `/api/assignments/${assignmentId}/submissions/writing`
      );

      expect(response.status()).toBe(200);
      const json = await response.json();

      if (json.submission) {
        expect(json.submission).toHaveProperty('status');
        expect(json.submission).toHaveProperty('final_submitted_at');
        expect(['draft', 'submitted', 'graded']).toContain(json.submission.status);
      }
    });
  });

  test.describe('Research Assignment API', () => {
    test('should save submission as draft by default', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/research`,
        {
          data: {
            content: 'This is a test research content.',
            researchNotes: 'AI conversation summary for research.',
          },
        }
      );

      expect(response.status()).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.submission.status).toBe('draft');
      expect(json.submission.final_submitted_at).toBeNull();
    });

    test('should save research submission as submitted when submit=true', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/research`,
        {
          data: {
            content: 'This is a test research content.',
            researchNotes: 'AI conversation summary for research.',
            submit: true,
          },
        }
      );

      expect(response.status()).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.submission.status).toBe('submitted');
      expect(json.submission.final_submitted_at).not.toBeNull();
    });

    test('should return submission with status field in GET', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.get(
        `/api/assignments/${assignmentId}/submissions/research`
      );

      expect(response.status()).toBe(200);
      const json = await response.json();

      if (json.submission) {
        expect(json.submission).toHaveProperty('status');
        expect(json.submission).toHaveProperty('final_submitted_at');
        expect(['draft', 'submitted', 'graded']).toContain(json.submission.status);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should return 401 for unauthenticated requests', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {
            content: 'Test content',
          },
        }
      );

      // Depending on authentication setup, may return 401 or 403
      expect([401, 403]).toContain(response.status());
    });

    test('should return 400 for missing content', async ({ request }) => {
      const assignmentId = 'test-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {},
        }
      );

      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Content is required');
    });

    test('should return 404 for invalid assignment type', async ({ request }) => {
      const assignmentId = 'invalid-assignment-id';
      const response = await request.post(
        `/api/assignments/${assignmentId}/submissions/writing`,
        {
          data: {
            content: 'Test content',
          },
        }
      );

      expect(response.status()).toBe(404);
    });
  });
});
