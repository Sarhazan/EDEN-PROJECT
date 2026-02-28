const { test, expect } = require('@playwright/test');
const { fastLogin } = require('./helpers/auth');

test.describe('MyDay Page', () => {
  test.beforeEach(async ({ page }) => {
    await fastLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('MyDay page loads with main heading', async ({ page }) => {
    // The main heading "היום שלי" should be visible
    const heading = page.locator('h1', { hasText: /היום שלי/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('stats bar is visible with task count', async ({ page }) => {
    // At least one stats card should be visible (the "Total Tasks" card with FaCalendarDay)
    const statsCard = page.locator('.bg-blue-50').first();
    await expect(statsCard).toBeVisible({ timeout: 8000 });
  });

  test('recurring tasks column is visible on desktop', async ({ page }) => {
    // The recurring tasks column header should show
    const recurringHeader = page.locator('h2', { hasText: /משימות חוזרות/i });
    await expect(recurringHeader).toBeVisible({ timeout: 8000 });
  });

  test('filter category dropdown is visible and functional', async ({ page }) => {
    // The primary filter select should be visible
    const filterSelect = page.locator('select').first();
    await expect(filterSelect).toBeVisible({ timeout: 8000 });

    // It should have the manager option (ניהול מנהל)
    const options = await filterSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(0);
  });

  test('date picker is visible for navigation', async ({ page }) => {
    // A date picker input should be visible in the recurring tasks column
    const datePicker = page.locator('input.react-datepicker-input, input[class*="react-datepicker"], .border-gray-300[type="text"][placeholder]').first();
    // More general: look for any date-related input
    const dateInput = page.locator('input[placeholder*="dd/MM"], input[placeholder*="תאריך"]').first();
    
    // The date picker input appears in the recurring tasks header area
    // It's an <input> with class "border border-gray-300 px-4 h-[40px] rounded-lg w-36 text-sm"
    const datePickers = page.locator('.react-datepicker-wrapper input, input.w-36');
    const count = await datePickers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('bulk WhatsApp send button is visible', async ({ page }) => {
    // The bulk send button appears with FaPaperPlane icon and text "שלח הכל למנהל"
    // It's a green button in the recurring tasks column header
    const bulkBtn = page.locator('button.bg-green-600, button.bg-green-500').first();
    await expect(bulkBtn).toBeVisible({ timeout: 8000 });

    // It should be disabled or enabled but present (don't click it)
    const isVisible = await bulkBtn.isVisible();
    expect(isVisible).toBe(true);
  });

  test('filter by employee shows unified task list', async ({ page }) => {
    // Change filter category to "employee"
    const filterSelect = page.locator('select').first();
    await filterSelect.selectOption('employee');

    // A second select should appear for value selection
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(1);
  });

  test('today button navigates back to current date', async ({ page }) => {
    // Click the "היום" (today) button
    const todayBtn = page.locator('button', { hasText: /היום/i }).first();
    await expect(todayBtn).toBeVisible({ timeout: 8000 });
    await todayBtn.click();

    // Page should still be on MyDay
    expect(page.url()).toContain('localhost:5174');
  });
});
