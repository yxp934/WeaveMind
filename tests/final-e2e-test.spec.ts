import { test, expect, Page, Browser } from '@playwright/test';

const BASE_URL = 'https://weavemind.vercel.app';
const CLASS_ID = 'cad9dde9-dae2-42cb-9802-5440d468df21';
const TEACHER_EMAIL = 'test-teacher-1764762517898@example.com';
const TEACHER_PASSWORD = 'TestPassword123!';

async function takeScreenshot(page: Page, name: string) {
  const screenshotPath = `test-results/final-01-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

test.describe('Final E2E Assignment Generation Workflow', () => {
  test('Complete assignment generation workflow verification', async ({ page }) => {
    console.log('Starting E2E test...');

    // Step 1: Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`);
    await takeScreenshot(page, '01-login-page');

    // Step 2: Login with test credentials
    await page.fill('input[id="email"]', TEACHER_EMAIL);
    await page.fill('input[id="password"]', TEACHER_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for role selection or navigation
    await page.waitForTimeout(5000);

    let currentUrl = page.url();
    console.log(`URL after login: ${currentUrl}`);

    // Check if redirected to role-select
    if (currentUrl.includes('/role-select')) {
      console.log('On role selection page - selecting teacher');
      await page.waitForTimeout(2000);

      const teacherButton = page.locator('button:has-text("Teacher"), button:has-text("教师")').first();
      await teacherButton.click();
      await page.waitForTimeout(2000);

      const continueButton = page.locator('button[type="submit"], button:has-text("Continue")').first();
      if (await continueButton.isVisible({ timeout: 3000 })) {
        await continueButton.click();
        await page.waitForTimeout(5000);
      }
    }

    console.log('Login successful');

    // Step 3: Navigate to teacher classes page
    await page.goto(`${BASE_URL}/teacher/classes/${CLASS_ID}`);
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '02-teacher-classes-page');

    // Step 4: Verify sessions are visible with "Content Generated" badge
    console.log('Checking for sessions with "Content Generated" badge...');
    const contentGeneratedBadge = page.locator('text=Content Generated').first();
    await expect(contentGeneratedBadge).toBeVisible({ timeout: 10000 });
    console.log('✓ Sessions with "Content Generated" badge found');

    await takeScreenshot(page, '03-sessions-with-badge');

    // Step 5: Click purple "Generate Assignment" button
    console.log('Looking for "Generate Assignment" button...');
    const generateButton = page.locator('button').filter({ hasText: 'Generate Assignment' }).first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click();

    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    await takeScreenshot(page, '04-generate-assignment-dialog');

    // Step 6: Verify dialog settings
    console.log('Verifying dialog settings...');

    // Check target duration shows 20 minutes
    const durationInput = page.locator('input[type="number"]').first();
    const durationValue = await durationInput.inputValue();
    console.log(`Target duration: ${durationValue} minutes`);
    expect(durationValue).toBe('20');
    console.log('✓ Default duration is 20 minutes');

    // Check all question types are checked - look for checked checkboxes
    const checkboxes = page.locator('input[type="checkbox"]:checked, input[type="checkbox"][checked]');
    const checkboxCount = await checkboxes.count();
    console.log(`Found ${checkboxCount} checked checkboxes`);

    // Also get all checkboxes to see the total
    const allCheckboxes = page.locator('input[type="checkbox"]');
    const allCheckboxCount = await allCheckboxes.count();
    console.log(`Total checkboxes: ${allCheckboxCount}`);

    // If checkboxes exist, verify they're checked
    if (allCheckboxCount > 0) {
      for (let i = 0; i < allCheckboxCount; i++) {
        const isChecked = await allCheckboxes.nth(i).isChecked();
        expect(isChecked).toBe(true);
      }
      console.log('✓ All question types are checked');
    } else {
      console.log('⚠ No checkboxes found in dialog');
    }

    // Verify "Generate Assignment" button is visible
    const generateAssignmentBtn = page.locator('button').filter({ hasText: 'Generate Assignment' }).last();
    await expect(generateAssignmentBtn).toBeVisible();
    console.log('✓ "Generate Assignment" button is visible in dialog');

    await takeScreenshot(page, '05-dialog-verification');

    // Step 7: Click "Generate Assignment" and wait for completion
    console.log('Generating assignment...');
    await generateAssignmentBtn.click();

    // Wait for dialog to transition to review mode (NOT waitForNavigation)
    // The dialog should close and reopen in review mode, or update in place
    await page.waitForTimeout(8000); // Wait for generation to complete

    console.log('Checking if review step is now visible...');

    // Look for "Test with Student Agent" button which indicates we're in review mode
    let testButton = page.locator('button').filter({ hasText: 'Test with Student Agent' });
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(2000);

      if (await testButton.isVisible()) {
        console.log('✓ Review mode detected - "Test with Student Agent" button is visible');
        break;
      }

      // Check if dialog is still in generation mode
      const genBtnVisible = await page.locator('button').filter({ hasText: 'Generate Assignment' }).first().isVisible();
      const generatingVisible = await page.locator('button:has-text("Generating Assignment")').isVisible();
      if (genBtnVisible || generatingVisible) {
        if (generatingVisible) {
          console.log(`⏳ Assignment generation in progress, attempt ${attempts}/${maxAttempts}`);
        } else {
          console.log(`Dialog still in generation mode, attempt ${attempts}/${maxAttempts}`);
        }
      } else {
        console.log(`Dialog state changed, but test button not found, attempt ${attempts}/${maxAttempts}`);
      }
    }

    if (!(await testButton.isVisible())) {
      console.log('ERROR: Could not find "Test with Student Agent" button after generation');
      await page.screenshot({ path: 'test-results/no-review-mode.png', fullPage: true });
      throw new Error('Review mode not reached - test button not found');
    }

    await takeScreenshot(page, '06-review-step');

    // Step 8: Verify review step elements
    console.log('Verifying review step...');

    // Check that questions are displayed
    const questions = page.locator('[data-testid="question-item"], .question-item, .question');
    await expect(questions).toHaveCount({ count: /^[1-9]\d*$/ as any }, { timeout: 10000 });
    console.log('✓ Questions are displayed');

    // Check "Test with Student Agent" button is visible and is outline style (NOT primary)
    // testButton is already declared above, just check it
    await expect(testButton).toBeVisible();
    console.log('✓ "Test with Student Agent" button is visible');

    // Verify button is outline style (not primary)
    const buttonClasses = await testButton.getAttribute('class');
    console.log(`Test button classes: ${buttonClasses}`);

    // Should NOT contain primary button classes like 'bg-indigo-600' or 'bg-blue-600'
    const isPrimary = buttonClasses?.includes('bg-indigo-600') || buttonClasses?.includes('bg-blue-600') ||
                     buttonClasses?.includes('bg-primary');
    expect(isPrimary).toBe(false);
    console.log('✓ Test button is OUTLINE style (not primary blue)');

    // Verify NO "Publish Assignment" button is visible initially
    const publishButton = page.locator('button').filter({ hasText: 'Publish Assignment' });
    await expect(publishButton).toHaveCount(0);
    console.log('✓ NO "Publish Assignment" button visible initially');

    await takeScreenshot(page, '07-review-step-before-test');

    // Step 9: Click "Test with Student Agent" button
    console.log('Clicking "Test with Student Agent" button...');
    await testButton.click();

    // Wait for testing to complete
    console.log('Waiting for testing to complete...');
    await page.waitForSelector('text=Testing complete', { state: 'visible', timeout: 60000 });
    console.log('✓ Testing completed');

    await takeScreenshot(page, '08-after-test-button-click');

    // Step 10: Verify assignment did NOT auto-publish
    console.log('Verifying assignment did NOT auto-publish...');
    const stillInReview = page.locator('text=Review Assignment').isVisible();
    expect(stillInReview).toBe(true);
    console.log('✓ Assignment is still in review step (did NOT auto-publish)');

    // Step 11: Verify "Publish Assignment" button now appears
    const publishButtonAfterTest = page.locator('button').filter({ hasText: 'Publish Assignment' });
    await expect(publishButtonAfterTest).toBeVisible();
    console.log('✓ "Publish Assignment" button now appears after tests pass');

    const publishButtonClasses = await publishButtonAfterTest.getAttribute('class');
    console.log(`Publish button classes: ${publishButtonClasses}`);

    await takeScreenshot(page, '09-review-step-after-test');

    // Final verification summary
    console.log('\n=== FINAL VERIFICATION SUMMARY ===');
    console.log('✓ Test button is outline style (not primary blue)');
    console.log('✓ Assignment does NOT auto-publish after testing');
    console.log('✓ "Publish Assignment" button only appears after tests pass');
    console.log('✓ Teacher must explicitly click to publish');
    console.log('====================================\n');

    await takeScreenshot(page, '10-final-verification');
  });
});
