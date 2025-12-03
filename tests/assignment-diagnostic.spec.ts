import { test, expect, Page } from '@playwright/test'

test.describe('Assignment Generation - Diagnostic Test', () => {
  test('diagnostic - navigate and analyze production site', async ({ page }) => {
    test.slow()

    console.log('\n=== Starting Diagnostic Test ===')

    // Step 1: Navigate to production site
    await page.goto('https://weavemind.vercel.app', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Take screenshot of landing page
    await page.screenshot({ path: 'test-results/diagnostic-01-landing-page.png', fullPage: true })
    console.log('✓ Step 1: Navigated to production site')

    // Step 2: Analyze page content
    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)

    // Check if already logged in
    const bodyText = await page.textContent('body')
    console.log(`\nPage title: ${await page.title()}`)
    console.log(`Page contains "teacher": ${bodyText?.toLowerCase().includes('teacher')}`)
    console.log(`Page contains "student": ${bodyText?.toLowerCase().includes('student')}`)
    console.log(`Page contains "login": ${bodyText?.toLowerCase().includes('login')}`)

    // Step 3: Look for navigation elements
    const navSelectors = [
      '[data-testid="nav"]',
      'nav',
      'header',
      '.navigation',
      '[role="navigation"]'
    ]

    let foundNav = false
    for (const selector of navSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 })) {
        console.log(`\n✓ Found navigation with selector: ${selector}`)
        foundNav = true
        break
      }
    }

    if (!foundNav) {
      console.log('\n❌ No navigation found')
    }

    // Step 4: Navigate to login page explicitly
    console.log('\n=== Navigating to login page ===')
    await page.goto('https://weavemind.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/diagnostic-02-login-page.png', fullPage: true })
    console.log('✓ Step 2: On login page')

    // Analyze login form
    const emailField = page.locator('#email, input[type="email"], input[name="email"]')
    const passwordField = page.locator('#password, input[type="password"], input[name="password"]')
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("登录")')

    console.log(`\nEmail field visible: ${await emailField.isVisible()}`)
    console.log(`Password field visible: ${await passwordField.isVisible()}`)
    console.log(`Submit button visible: ${await submitButton.isVisible()}`)

    // Check for any error messages
    const errorMessages = await page.locator('.error, .alert-error, [role="alert"], .text-red-500').allTextContents()
    if (errorMessages.length > 0) {
      console.log(`\nError messages found: ${errorMessages.join(', ')}`)
    }

    // Step 5: Attempt login with error handling
    console.log('\n=== Attempting login ===')

    try {
      // Fill in credentials
      await emailField.fill('teacher@example.com')
      await passwordField.fill('password123')
      await page.waitForTimeout(1000)

      // Take screenshot before submit
      await page.screenshot({ path: 'test-results/diagnostic-03-before-submit.png' })

      // Click submit
      await submitButton.click()
      console.log('✓ Clicked submit button')

      // Wait for response (shorter timeout, more verbose logging)
      await page.waitForTimeout(5000)

      // Check current URL
      const afterUrl = page.url()
      console.log(`\nURL after submit: ${afterUrl}`)

      // Take screenshot after submit
      await page.screenshot({ path: 'test-results/diagnostic-04-after-submit.png', fullPage: true })

      // Check for console errors
      const consoleLogs: string[] = []
      page.on('console', msg => {
        const text = msg.text()
        consoleLogs.push(text)
        if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
          console.log(`\nConsole ${msg.type()}: ${text}`)
        }
      })

      // Wait a bit more and check URL again
      await page.waitForTimeout(5000)

      const finalUrl = page.url()
      console.log(`\nFinal URL: ${finalUrl}`)

      // Check if we're on a teacher page
      if (finalUrl.includes('/teacher')) {
        console.log('✓ Successfully on teacher page!')

        // Take final screenshot
        await page.screenshot({ path: 'test-results/diagnostic-05-teacher-page.png', fullPage: true })

        // Now look for classes
        console.log('\n=== Looking for classes ===')

        // Try different selectors for class links
        const classSelectors = [
          'a[href*="/class"]',
          '.class-card',
          '[data-testid="class"]',
          '.class-link',
          'button:has-text("Class")',
          'button:has-text("班级")',
          '.class-item'
        ]

        let foundClass = false
        for (const selector of classSelectors) {
          const elements = await page.locator(selector).all()
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`)
            for (const el of elements.slice(0, 3)) {
              const text = await el.textContent()
              console.log(`  - ${text?.trim()}`)
            }
            foundClass = true
          }
        }

        if (!foundClass) {
          console.log('❌ No classes found on teacher page')

          // Log all visible links
          const allLinks = await page.locator('a').all()
          console.log(`\nAll ${allLinks.length} links on page:`)
          for (const link of allLinks.slice(0, 10)) {
            const text = await link.textContent()
            const href = await link.getAttribute('href')
            console.log(`  - ${text?.trim()} -> ${href}`)
          }
        }

      } else {
        console.log('❌ Not on teacher page')
        console.log('Current page content:')
        console.log(await page.textContent('body'))
      }

      // Check for error messages after login
      const errorAfterLogin = await page.locator('.error, .alert-error, [role="alert"], .text-red-500').allTextContents()
      if (errorAfterLogin.length > 0) {
        console.log(`\n❌ Error messages after login: ${errorAfterLogin.join(', ')}`)
      }

    } catch (error) {
      console.error(`\n❌ Login failed with error: ${error}`)
      await page.screenshot({ path: 'test-results/diagnostic-05-login-error.png', fullPage: true })
    }

    // Final diagnostic
    console.log('\n=== Final Diagnostic Summary ===')
    console.log(`Final URL: ${page.url()}`)
    console.log(`Page title: ${await page.title()}`)

    // Save console logs to file
    await page.screenshot({ path: 'test-results/diagnostic-final.png', fullPage: true })
  })
})
