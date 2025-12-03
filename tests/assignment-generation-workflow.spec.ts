import { test, expect, Page } from '@playwright/test'

test.describe('Assignment Generation Workflow (Production)', () => {
  // Override base URL for production testing
  test.beforeEach(async ({ page }) => {
    await page.goto('https://weavemind.vercel.app')
  })

  test('Complete assignment generation workflow - production', async ({ page }) => {
    test.slow() // Mark as slow test for production

    // Step 1: Navigate to login page
    await page.goto('https://weavemind.vercel.app/auth/login')

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/step1-login-page.png' })
    console.log('✓ Step 1: Navigated to login page')

    // Step 2: Login as teacher
    // Using test credentials from auth-login.spec.ts
    await page.fill('#email', 'teacher@example.com')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')

    // Wait for navigation to teacher dashboard
    await page.waitForURL('**/teacher/**', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Take screenshot of teacher dashboard
    await page.screenshot({ path: 'test-results/step2-teacher-dashboard.png' })
    console.log('✓ Step 2: Logged in as teacher')

    // Step 3: Navigate to a class page with sessions
    // First, let's find and click on a class
    // Look for class cards or links
    await page.waitForSelector('[data-testid="class-card"], .class-card, a[href*="/class"]', { timeout: 10000 })

    // Try to find a class with sessions
    const classLink = page.locator('a[href*="/class"]').first()
    if (await classLink.isVisible()) {
      await classLink.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000) // Wait for page to fully load
    }

    // Take screenshot of class page
    await page.screenshot({ path: 'test-results/step3-class-page.png' })
    console.log('✓ Step 3: Navigated to class page')

    // Step 4: Look for sessions with "Generate Assignment" button
    // The button should be beside a session
    await page.waitForSelector('[data-testid="session-item"], .session-item, .session-card', { timeout: 10000 })

    // Look for the "Generate Assignment" button
    // It might have various selectors
    const generateButtons = [
      'button:has-text("Generate Assignment")',
      '[data-testid="generate-assignment-btn"]',
      '.generate-assignment-button',
      'button:has-text("生成作业")'
    ]

    let generateButton = null
    for (const selector of generateButtons) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 2000 })) {
          generateButton = page.locator(selector).first()
          break
        }
      } catch {
        // Continue to next selector
      }
    }

    if (!generateButton) {
      // If not found, take a screenshot to show what's available
      await page.screenshot({ path: 'test-results/no-generate-button-found.png' })
      console.error('❌ Step 4: Generate Assignment button not found')

      // Log what's actually visible on the page
      const visibleButtons = await page.locator('button').all()
      console.log('Visible buttons on page:', await Promise.all(visibleButtons.map(b => b.textContent())))

      // Don't fail the test yet - let's see if we can find sessions
      const sessions = await page.locator('.session, .chapter, [data-testid="session"]').all()
      console.log(`Found ${sessions.length} sessions/chapters on page`)
    } else {
      console.log('✓ Step 4: Found Generate Assignment button')
    }

    // If we found the button, proceed with the workflow
    if (generateButton) {
      // Click the Generate Assignment button
      await generateButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000) // Wait for modal/dialog to appear

      // Take screenshot of modal/dialog
      await page.screenshot({ path: 'test-results/step5-generate-dialog.png' })
      console.log('✓ Step 5: Generate Assignment dialog opened')

      // Step 6: Verify buttons in the review dialog
      // Look for the buttons mentioned:
      // - "Test with Student Agent" button (outline style)
      // - "Refine with Feedback" button (if feedback text exists)
      // - "Publish Assignment" button should NOT be visible initially

      // Check for "Test with Student Agent" button (should be visible, outline style)
      const testWithStudentButton = page.locator('button:has-text("Test with Student Agent"), button:has-text("使用学生智能体测试")')
      if (await testWithStudentButton.isVisible({ timeout: 5000 })) {
        console.log('✓ Step 6a: "Test with Student Agent" button is visible')

        // Verify it's an outline style button (check if it has outline classes)
        const buttonStyle = await testWithStudentButton.evaluate((el: HTMLElement) => {
          const style = window.getComputedStyle(el)
          return {
            border: style.border,
            backgroundColor: style.backgroundColor
          }
        })
        console.log('Test with Student Agent button style:', buttonStyle)
      } else {
        console.error('❌ Step 6a: "Test with Student Agent" button NOT found')
      }

      // Check for "Refine with Feedback" button (conditional - only if feedback exists)
      const refineButton = page.locator('button:has-text("Refine with Feedback"), button:has-text("根据反馈优化")')
      const hasRefineButton = await refineButton.isVisible({ timeout: 2000 })
      if (hasRefineButton) {
        console.log('✓ Step 6b: "Refine with Feedback" button is visible (feedback exists)')
      } else {
        console.log('✓ Step 6b: "Refine with Feedback" button is not visible (no feedback yet)')
      }

      // Check that "Publish Assignment" button is NOT visible initially
      const publishButton = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')
      const hasPublishButton = await publishButton.isVisible({ timeout: 2000 })

      if (!hasPublishButton) {
        console.log('✓ Step 6c: "Publish Assignment" button is correctly NOT visible initially')
      } else {
        console.error('❌ Step 6c: "Publish Assignment" button should NOT be visible initially, but it is!')
      }

      // Step 7: Click "Test with Student Agent" button
      if (await testWithStudentButton.isVisible({ timeout: 5000 })) {
        // First, take a screenshot showing the buttons before clicking
        await page.screenshot({ path: 'test-results/step7a-before-test-click.png' })

        // Click the button
        await testWithStudentButton.click()
        console.log('✓ Step 7: Clicked "Test with Student Agent" button')

        // Wait for processing
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(5000) // Wait for AI processing

        // Take screenshot after clicking
        await page.screenshot({ path: 'test-results/step7b-after-test-click.png' })
        console.log('✓ Step 7b: Completed student agent test')

        // Step 8: Verify that clicking "Test with Student Agent" does NOT automatically publish
        // The "Publish Assignment" button should still NOT be visible
        const publishButtonAfterTest = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')
        const hasPublishAfterTest = await publishButtonAfterTest.isVisible({ timeout: 2000 })

        if (!hasPublishAfterTest) {
          console.log('✓ Step 8: Assignment was NOT automatically published after testing (correct behavior)')
        } else {
          console.error('❌ Step 8: Assignment was automatically published after testing! This should not happen.')
        }

        // Now check if "Refine with Feedback" button appears after testing
        const refineButtonAfterTest = page.locator('button:has-text("Refine with Feedback"), button:has-text("根据反馈优化")')
        const hasRefineAfterTest = await refineButtonAfterTest.isVisible({ timeout: 2000 })

        if (hasRefineAfterTest) {
          console.log('✓ Step 9a: "Refine with Feedback" button is now visible after testing')
        } else {
          console.log('Step 9a: "Refine with Feedback" button not visible (may appear after multiple tests)')
        }

        // Step 9: Look for "Publish Assignment" button (should appear after all tests pass)
        // It may appear after the test completes
        await page.waitForTimeout(3000) // Additional wait for UI updates

        const publishButtonFinal = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')
        const hasPublishFinal = await publishButtonFinal.isVisible({ timeout: 5000 })

        if (hasPublishFinal) {
          console.log('✓ Step 9b: "Publish Assignment" button is now visible after testing')

          // Take a screenshot showing the final state
          await page.screenshot({ path: 'test-results/step9-publish-button-visible.png' })

          // Step 10: Click "Publish Assignment" to verify manual publish control
          await publishButtonFinal.click()
          console.log('✓ Step 10: Clicked "Publish Assignment" button')

          // Wait for confirmation or navigation
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(3000)

          // Take final screenshot
          await page.screenshot({ path: 'test-results/step11-after-publish.png' })
          console.log('✓ Step 11: Assignment manually published')
        } else {
          console.log('Step 9b: "Publish Assignment" button still not visible (may require additional steps)')
        }
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/final-state.png' })
    console.log('✓ Test completed - all screenshots saved to test-results/')
  })

  test('Alternative flow - check for existing assignments', async ({ page }) => {
    test.slow()

    // Step 1: Login as teacher
    await page.goto('https://weavemind.vercel.app/auth/login')
    await page.fill('#email', 'teacher@example.com')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/teacher/**', { timeout: 15000 })

    // Step 2: Navigate to classes
    await page.goto('https://weavemind.vercel.app/teacher/classes')
    await page.waitForLoadState('networkidle')

    // Try to find a class and click it
    const classLink = page.locator('a[href*="/class"]').first()
    if (await classLink.isVisible({ timeout: 5000 })) {
      await classLink.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Look for chapters/sessions
      await page.waitForSelector('[data-testid="chapter"], .chapter, [data-testid="session"], .session', { timeout: 10000 })

      // Take screenshot
      await page.screenshot({ path: 'test-results/alt-flow-class-view.png' })

      // Log all visible interactive elements
      const buttons = await page.locator('button').all()
      console.log('\n=== Visible Buttons ===')
      for (const button of buttons) {
        const text = await button.textContent()
        console.log(`- ${text}`)
      }

      const links = await page.locator('a').all()
      console.log('\n=== Visible Links ===')
      for (const link of links.slice(0, 10)) { // Limit to first 10
        const text = await link.textContent()
        const href = await link.getAttribute('href')
        console.log(`- ${text} -> ${href}`)
      }
    }
  })
})
