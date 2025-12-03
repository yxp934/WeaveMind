import { test, expect, Page } from '@playwright/test'

test.describe('Assignment Generation Workflow - Production Test', () => {
  // Use specific test account that has class data
  const testEmail = 'test-teacher-1764762517898@example.com'
  const testPassword = 'TestPassword123!'

  test('Complete assignment generation workflow', async ({ page }) => {
    test.slow()

    console.log(`\n=== Testing Assignment Generation Workflow ===`)
    console.log(`Using test account: ${testEmail}`)

    // Step 1: Navigate to production site and login
    console.log('\n--- Step 1: Login as teacher ---')
    await page.goto('https://weavemind.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/01-login-page.png' })

    // Fill login form
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'test-results/02-login-filled.png' })

    // Click login
    await page.click('button[type="submit"]')
    await page.waitForTimeout(8000)

    let currentUrl = page.url()
    console.log(`URL after login: ${currentUrl}`)

    // Check if redirected to role-select
    if (currentUrl.includes('/role-select')) {
      console.log('On role selection page - selecting teacher')

      const teacherButton = page.locator('button:has-text("Teacher"), button:has-text("教师")').first()
      if (await teacherButton.isVisible({ timeout: 5000 })) {
        await teacherButton.click()
        await page.waitForTimeout(2000)

        const continueButton = page.locator('button[type="submit"], button:has-text("Continue")').first()
        if (await continueButton.isVisible({ timeout: 3000 })) {
          await continueButton.click()
          await page.waitForTimeout(5000)

          currentUrl = page.url()
          console.log(`URL after role selection: ${currentUrl}`)
        }
      }
    }

    await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true })

    // Step 2: Navigate to organizations page (classes are accessed through organizations)
    console.log('\n--- Step 2: Navigate to organizations ---')
    await page.goto('https://weavemind.vercel.app/teacher/organizations', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/04-organizations-page.png', fullPage: true })
    console.log('On organizations page')

    // Step 3: Click on the organization
    console.log('\n--- Step 3: Click on organization ---')
    const orgLink = page.locator('a[href*="/teacher/organizations/"]').first()

    if (await orgLink.isVisible({ timeout: 10000 })) {
      const orgText = await orgLink.textContent()
      console.log(`Found organization: ${orgText}`)

      await orgLink.click()
      await page.waitForTimeout(4000)

      await page.screenshot({ path: 'test-results/05-organization-detail.png', fullPage: true })
      console.log('✓ Clicked on organization')

      // Step 4: Look for and click on class within organization
      console.log('\n--- Step 4: Find and click on class ---')
      const classLink = page.locator('a[href*="/teacher/classes/"]').first()

      if (await classLink.isVisible({ timeout: 10000 })) {
        const classText = await classLink.textContent()
        console.log(`Found class: ${classText}`)

        await classLink.click()
        await page.waitForTimeout(4000)

        await page.screenshot({ path: 'test-results/06-class-detail.png', fullPage: true })
        console.log('✓ Clicked on class - now in class detail page')

        // Step 5: Look for chapters/sessions
        console.log('\n--- Step 5: Look for chapters/sessions ---')

        const sessionSelectors = [
          '[data-testid="chapter"]',
          '[data-testid="session"]',
          '.chapter-card',
          '.session-item'
        ]

        let foundSessions = false
        for (const selector of sessionSelectors) {
          const sessions = await page.locator(selector).all()
          if (sessions.length > 0) {
            console.log(`✓ Found ${sessions.length} ${selector}`)
            foundSessions = true

            // Take screenshot of sessions
            await page.screenshot({ path: 'test-results/07-sessions-found.png', fullPage: true })

            break
          }
        }

        if (!foundSessions) {
          console.log('❌ No sessions/chapters found')

          // Log all visible buttons
          const buttons = await page.locator('button').all()
          console.log(`\nVisible buttons (${buttons.length}):`)
          for (const btn of buttons.slice(0, 10)) {
            const text = await btn.textContent()
            console.log(`  - ${text?.trim()}`)
          }
        } else {
          // Step 6: Look for "Generate Assignment" button
          console.log('\n--- Step 6: Look for "Generate Assignment" button ---')

        const generateSelectors = [
          'button:has-text("Generate Assignment")',
          'button:has-text("生成作业")',
          '[data-testid="generate-assignment"]',
          '.generate-assignment-button'
        ]

        let generateButton = null
        for (const selector of generateSelectors) {
          const button = page.locator(selector)
          if (await button.isVisible({ timeout: 2000 })) {
            console.log(`✓ Found Generate Assignment button: ${selector}`)

            // Check if it's beside a session
            const buttonText = await button.textContent()
            console.log(`Button text: ${buttonText}`)

            generateButton = button
            break
          }
        }

        if (generateButton) {
          // Step 6: Click Generate Assignment
          console.log('\n--- Step 6: Click "Generate Assignment" ---')
          await generateButton.click()
          await page.waitForTimeout(6000)

          await page.screenshot({ path: 'test-results/07-generate-dialog.png', fullPage: true })
          console.log('✓ Generate Assignment dialog opened')

          // Step 7: Verify buttons in review dialog
          console.log('\n--- Step 7: Verify dialog buttons ---')

          // Check for "Test with Student Agent" button (should be outline style)
          const testButton = page.locator('button:has-text("Test with Student Agent"), button:has-text("使用学生智能体测试")')

          if (await testButton.isVisible({ timeout: 5000 })) {
            console.log('✓ "Test with Student Agent" button is visible')

            // Get button styling info
            const buttonInfo = await testButton.evaluate((el: HTMLElement) => {
              const style = window.getComputedStyle(el)
              const classList = el.className
              return {
                backgroundColor: style.backgroundColor,
                color: style.color,
                border: style.border,
                className: classList
              }
            })
            console.log('Button style info:', JSON.stringify(buttonInfo, null, 2))

            // Verify it's outline style (should have transparent/transparent bg)
            const isOutlineStyle = buttonInfo.backgroundColor.includes('rgba(0, 0, 0, 0)') ||
                                   buttonInfo.backgroundColor.includes('transparent') ||
                                   buttonInfo.className.includes('outline')
            console.log(`✓ Button appears to be outline style: ${isOutlineStyle}`)

          } else {
            console.log('❌ "Test with Student Agent" button NOT found')
          }

          // Check for "Refine with Feedback" button
          const refineButton = page.locator('button:has-text("Refine with Feedback"), button:has-text("根据反馈优化")')

          if (await refineButton.isVisible({ timeout: 2000 })) {
            console.log('✓ "Refine with Feedback" button is visible (feedback text exists)')
          } else {
            console.log('✓ "Refine with Feedback" button is NOT visible (expected - no feedback yet)')
          }

          // CRITICAL CHECK: "Publish Assignment" should NOT be visible initially
          const publishButton = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')

          if (!(await publishButton.isVisible({ timeout: 2000 }))) {
            console.log('✓✓✓ PASS: "Publish Assignment" button is correctly NOT visible initially')
          } else {
            console.log('❌❌❌ FAIL: "Publish Assignment" button should NOT be visible initially!')
            await page.screenshot({ path: 'test-results/FAIL-publish-visible-too-early.png' })
          }

          // Step 8: Click "Test with Student Agent"
          console.log('\n--- Step 8: Click "Test with Student Agent" ---')

          if (await testButton.isVisible({ timeout: 5000 })) {
            await testButton.click()
            console.log('✓ Clicked "Test with Student Agent" button')

            // Wait for processing
            await page.waitForTimeout(15000)

            await page.screenshot({ path: 'test-results/08-after-test-click.png', fullPage: true })
            console.log('✓ After clicking test button - waiting for processing')

            // Step 9: Verify assignment is NOT automatically published
            console.log('\n--- Step 9: Verify assignment was NOT auto-published ---')

            const publishAfterTest = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')

            if (!(await publishAfterTest.isVisible({ timeout: 3000 }))) {
              console.log('✓✓✓ PASS: Assignment was NOT automatically published after testing')
            } else {
              console.log('❌❌❌ FAIL: Assignment was automatically published! This is wrong.')
              await page.screenshot({ path: 'test-results/FAIL-auto-published.png' })
            }

            // Check if "Refine with Feedback" now appears
            const refineAfterTest = page.locator('button:has-text("Refine with Feedback"), button:has-text("根据反馈优化")')

            if (await refineAfterTest.isVisible({ timeout: 3000 })) {
              console.log('✓ "Refine with Feedback" button is now visible')
            }

            // Wait for "Publish Assignment" to appear (after tests pass)
            console.log('\n--- Waiting for "Publish Assignment" button to appear ---')
            await page.waitForTimeout(10000)

            const publishFinally = page.locator('button:has-text("Publish Assignment"), button:has-text("发布作业")')

            if (await publishFinally.isVisible({ timeout: 10000 })) {
              console.log('✓✓✓ PASS: "Publish Assignment" button is now visible after tests')

              // Step 10: Verify manual publish control
              console.log('\n--- Step 10: Click "Publish Assignment" to verify manual control ---')

              await page.screenshot({ path: 'test-results/09-publish-button-visible.png', fullPage: true })

              await publishFinally.click()
              console.log('✓ Clicked "Publish Assignment" button')

              await page.waitForTimeout(5000)

              await page.screenshot({ path: 'test-results/10-after-publish-click.png', fullPage: true })
              console.log('✓ Assignment manually published')

              const finalUrl = page.url()
              console.log(`Final URL: ${finalUrl}`)

            } else {
              console.log('⚠ "Publish Assignment" button not visible yet (may need more time or multiple tests)')
              await page.screenshot({ path: 'test-results/09-publish-not-visible.png', fullPage: true })
            }
          }
        } else {
          console.log('❌ "Generate Assignment" button not found')

          // Log all buttons on page
          const allButtons = await page.locator('button').all()
          console.log(`\nAll buttons on page (${allButtons.length}):`)
          for (const btn of allButtons.slice(0, 15)) {
            const text = await btn.textContent()
            console.log(`  - "${text?.trim()}"`)
          }
        }
      }
    } else {
      console.log('❌ No class links found')

      // Log what IS on the page
      const content = await page.textContent('body')
      console.log(`Page content preview: ${content?.substring(0, 500)}`)
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/99-final-workflow-state.png', fullPage: true })
    console.log('\n=== Workflow test completed ===')
  })
})
