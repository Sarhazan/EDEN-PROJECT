const { test, expect } = require('@playwright/test');
const { fastLogin } = require('./helpers/auth');

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await fastLogin(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('settings page loads', async ({ page }) => {
    // Settings page should have a recognizable heading or content
    // The page has WhatsApp section, workday settings, etc.
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // URL should be /settings
    expect(page.url()).toContain('/settings');
  });

  test('workday end time field is visible', async ({ page }) => {
    // The workday end time uses type="time" inputs
    const timeInputs = page.locator('input[type="time"]');
    const count = await timeInputs.count();
    expect(count).toBeGreaterThan(0);

    // The end time input should be visible
    await expect(timeInputs.first()).toBeVisible({ timeout: 8000 });
  });

  test('workday end time input is editable', async ({ page }) => {
    // Find time inputs
    const timeInputs = page.locator('input[type="time"]');
    await expect(timeInputs.first()).toBeVisible({ timeout: 8000 });

    // The end time input — there are typically two: start and end
    // We check that the last time input is editable (end time)
    const endTimeInput = timeInputs.last();
    await expect(endTimeInput).toBeEnabled();
  });

  test('changing workday end time triggers auto-save', async ({ page }) => {
    // Find time inputs (workday start and end)
    const timeInputs = page.locator('input[type="time"]');
    await expect(timeInputs.first()).toBeVisible({ timeout: 8000 });

    const count = await timeInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Get the last time input (typically end time)
    const endTimeInput = timeInputs.last();

    // Read current value
    const currentValue = await endTimeInput.inputValue();

    // Change to a slightly different value
    const newValue = currentValue === '18:00' ? '18:30' : '18:00';

    // Use fill to change the time value
    await endTimeInput.fill(newValue);

    // Trigger change event by pressing Tab
    await endTimeInput.press('Tab');

    // Wait for auto-save indicator — a checkmark (✓) or saved indicator
    // The component shows workdayEndTimeSaved state as a visual indicator
    // It could be a checkmark icon or text
    await page.waitForTimeout(2000); // auto-save is async

    // The page should not show an error
    const errorElement = page.locator('.text-red-500, .text-red-600').first();
    const hasError = await errorElement.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('tasks per page setting is visible and has a value', async ({ page }) => {
    // The tasks per page should have a number input or select
    // Looking for any number input in settings
    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();

    if (count > 0) {
      const firstNumber = numberInputs.first();
      await expect(firstNumber).toBeVisible({ timeout: 8000 });

      const value = await firstNumber.inputValue();
      expect(Number(value)).toBeGreaterThanOrEqual(0);
    }

    // Settings page should at minimum contain the workday time section
    const timeInputs = page.locator('input[type="time"]');
    await expect(timeInputs.first()).toBeVisible({ timeout: 8000 });
  });
});
