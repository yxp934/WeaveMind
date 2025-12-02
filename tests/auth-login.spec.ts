import { test, expect } from '@playwright/test'

test.describe('Authentication Login Flow', () => {
  test('should redirect user with role to dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login')

    // Fill in login form with test credentials
    await page.fill('#email', 'teacher@example.com')
    await page.fill('#password', 'password123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for navigation and check console logs
    page.on('console', msg => console.log('Browser console:', msg.text()))

    // Wait for URL to change
    await page.waitForURL('**/teacher', { timeout: 10000 })

    // Should be on teacher dashboard
    expect(page.url()).toContain('/teacher')
  })

  test('should redirect new user without role to role-select', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login')

    // Fill in login form with new user credentials
    await page.fill('#email', 'newuser@example.com')
    await page.fill('#password', 'password123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForURL('**/role-select', { timeout: 10000 })

    // Should be on role-select page
    expect(page.url()).toContain('/role-select')
  })
})
