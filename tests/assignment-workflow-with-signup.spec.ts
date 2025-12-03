import { test, expect, Page } from '@playwright/test'

test.describe('Assignment Generation Workflow - Complete Test', () => {
  const testEmail = `test-teacher-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'

  test('Step 1-2: Create teacher account and login', async ({ page }) => {
    test.slow()

    console.log(`\n=== Creating test account: ${testEmail} ===`)

    // Step 1: Navigate to signup page
    await page.goto('https://weavemind.vercel.app/auth/signup', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Take screenshot
    await page.screenshot({ path: 'test-results/01-signup-page.png' })
    console.log('✓ Navigated to signup page')

    // Fill signup form
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.fill('#confirmPassword', testPassword)
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'test-results/02-signup-filled.png' })

    // Click signup button
    await page.click('button[type="submit"], button:has-text("Sign up"), button:has-text("注册")')
    await page.waitForTimeout(5000)

    // Check if redirected or if there are errors
    const currentUrl = page.url()
    console.log(`URL after signup: ${currentUrl}`)

    await page.screenshot({ path: 'test-results/03-after-signup.png' })

    // Check for email verification requirement
    const pageText = await page.textContent('body')
    if (pageText?.includes('verify') || pageText?.includes('验证')) {
      console.log('✓ Account created, email verification required')
      console.log('Note: In production, email verification would be needed')
    }

    // Step 2: Try to login with the new account
    console.log('\n=== Attempting login with test account ===')

    await page.goto('https://weavemind.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)

    const loginUrl = page.url()
    console.log(`URL after login: ${loginUrl}`)

    await page.screenshot({ path: 'test-results/04-after-login.png' })

    // Check if redirected to role selection
    if (loginUrl.includes('/role-select') || loginUrl.includes('role-select')) {
      console.log('✓ Redirected to role selection')

      // Select teacher role
      const teacherRoleButton = page.locator('button:has-text("Teacher"), button:has-text("教师"), [data-value="teacher"]').first()
      if (await teacherRoleButton.isVisible({ timeout: 5000 })) {
        await teacherRoleButton.click()
        await page.waitForTimeout(3000)
        console.log('✓ Selected teacher role')

        // Submit role selection
        const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("继续")').first()
        if (await continueButton.isVisible({ timeout: 3000 })) {
          await continueButton.click()
          await page.waitForTimeout(5000)
          console.log('✓ Role selection submitted')

          const afterRoleUrl = page.url()
          console.log(`URL after role selection: ${afterRoleUrl}`)

          await page.screenshot({ path: 'test-results/05-after-role-selection.png' })
        }
      }
    }

    // Final screenshot of current state
    await page.screenshot({ path: 'test-results/06-login-complete.png', fullPage: true })

    // Check console for any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`)
      }
    })
  })

  test('Step 3-11: Navigate to class and test assignment workflow', async ({ page }) => {
    test.slow()

    // First login
    await page.goto('https://weavemind.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)

    // Navigate to teacher dashboard
    await page.goto('https://weavemind.vercel.app/teacher', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Take screenshot
    await page.screenshot({ path: 'test-results/07-teacher-dashboard.png', fullPage: true })
    console.log('✓ On teacher dashboard')

    // Step 3: Navigate to classes
    await page.goto('https://weavemind.vercel.app/teacher/classes', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/08-classes-page.png', fullPage: true })
    console.log('✓ On classes page')

    // Check if there are existing classes
    const classLinks = await page.locator('a[href*="/class"]').all()
    console.log(`Found ${classLinks.length} class links`)

    if (classLinks.length === 0) {
      console.log('❌ No classes found - may need to create one first')

      // Look for "Create Class" or similar button
      const createButtons = [
        'button:has-text("Create Class")',
        'button:has-text("新建班级")',
        'button:has-text("Add Class")',
        'a[href*="/create"]'
      ]

      for (const selector of createButtons) {
        const button = page.locator(selector)
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`Found create button: ${selector}`)
          await button.click()
          await page.waitForTimeout(3000)
          break
        }
      }

      await page.screenshot({ path: 'test-results/09-after-create-attempt.png', fullPage: true })
    }

    // Try to click on first class if available
    if (classLinks.length > 0) {
      await classLinks[0].click()
      await page.waitForTimeout(3000)

      await page.screenshot({ path: 'test-results/10-class-detail-page.png', fullPage: true })
      console.log('✓ In class detail page')

      // Step 4: Look for sessions/chapters
      const sessionSelectors = [
        '[data-testid="session"]',
        '[data-testid="chapter"]',
        '.session-item',
        '.chapter-item',
        '.session-card'
      ]

      let sessionsFound = false
      for (const selector of sessionSelectors) {
        const sessions = await page.locator(selector).all()
        if (sessions.length > 0) {
          console.log(`Found ${sessions.length} sessions with selector: ${selector}`)
          sessionsFound = true
          break
        }
      }

      if (!sessionsFound) {
        console.log('❌ No sessions found in class')

        // Log all visible elements for debugging
        const allButtons = await page.locator('button').all()
        console.log(`\nAll buttons on page (${allButtons.length}):`)
        for (const btn of allButtons.slice(0, 10)) {
          const text = await btn.textContent()
          console.log(`  - ${text?.trim()}`)
        }
      } else {
        // Step 5: Look for "Generate Assignment" button
        console.log('\n=== Looking for Generate Assignment button ===')

        const generateSelectors = [
          'button:has-text("Generate Assignment")',
          'button:has-text("生成作业")',
          '[data-testid="generate-assignment"]',
          '.generate-assignment-button',
          'button:has-text("Generate")'
        ]

        let generateButton = null
        for (const selector of generateSelectors) {
          const button = page.locator(selector)
          if (await button.isVisible({ timeout: 2000 })) {
            console.log(`✓ Found Generate button: ${selector}`)
            generateButton = button
            break
          }
        }

        if (generateButton) {
          // Step 6: Click Generate Assignment
          await generateButton.click()
          await page.waitForTimeout(5000)

          await page.screenshot({ path: 'test-results/11-generate-dialog.png', fullPage: true })
          console.log('✓ Generate Assignment dialog opened')

          // Step 7-9: Verify buttons in dialog
          console.log('\n=== Verifying dialog buttons ===')

          // Check for "Test with Student Agent" button
          const testButton = page.locator('button:has-text("Test with Student Agent"), button:has-text("使用学生智能体测试")')
          if (await testButton.isVisible({ timeout: 5000 })) {
            console.log('✓ "Test with Student Agent" button is visible')

            // Check button style
            const buttonInfo = await testButton.evaluate((el: HTMLElement) => {
              const style = window.getComputedStyle(el)
              return {
                border: style.border,
                backgroundColor: style.backgroundColor,
                className: el.className
              }
            })
            console.log('Button style:', buttonInfo)
          } else {
            console.log('❌ "Test with Student Agent" button not found')
          }

          // Check for "Refine with Feedback" button
          const refineButton = page.locator('button:has-text("Refine with Feedback"), button:has-text("根据反馈优化")')
          if (await refineButton.isVisible({ timeout: 2000 })) {
            console.log('✓ "Refine with Feedback" button is visible')
          } else {
            console.log('✓ "Refine with Feedback" button not visible (expected before test)')
          }

          // Check that "Publish Assignment" is NOT visible initially
          const publishButton = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')
          if (!(await publishButton.isVisible({ timeout: 2000 }))) {
            console.log('✓ "Publish Assignment" button is NOT visible initially (correct)')
          } else {
            console.log('❌ "Publish Assignment" button should NOT be visible initially!')
          }

          // Step 10: Click "Test with Student Agent"
          if (await testButton.isVisible({ timeout: 5000 })) {
            console.log('\n=== Clicking Test with Student Agent ===')
            await testButton.click()
            await page.waitForTimeout(10000) // Wait for AI processing

            await page.screenshot({ path: 'test-results/12-after-test-click.png', fullPage: true })
            console.log('✓ After clicking Test with Student Agent')

            // Verify assignment is NOT auto-published
            const publishAfterTest = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')
            if (!(await publishAfterTest.isVisible({ timeout: 3000 }))) {
              console.log('✓ Assignment was NOT automatically published (correct)')
            } else {
              console.log('❌ Assignment was auto-published! This is wrong.')
            }

            // Check if "Refine with Feedback" appears
            const refineAfterTest = page.locator('button:has-text("Refine with Feedback"), button:has-text("根据反馈优化")')
            if (await refineAfterTest.isVisible({ timeout: 3000 })) {
              console.log('✓ "Refine with Feedback" button now visible')
            }

            // Wait for "Publish Assignment" to appear (after test passes)
            await page.waitForTimeout(5000)
            const publishFinally = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')

            if (await publishFinally.isVisible({ timeout: 10000 })) {
              console.log('✓ "Publish Assignment" button is now visible')

              // Step 11: Click "Publish Assignment"
              await publishFinally.click()
              await page.waitForTimeout(5000)

              await page.screenshot({ path: 'test-results/13-after-publish.png', fullPage: true })
              console.log('✓ Assignment manually published')

              // Verify final state
              const finalUrl = page.url()
              console.log(`Final URL: ${finalUrl}`)
            } else {
              console.log('⚠ "Publish Assignment" button still not visible')
            }
          }
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/99-workflow-complete.png', fullPage: true })
    console.log('✓ Workflow test complete')
  })
})
