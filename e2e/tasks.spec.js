const { test, expect } = require('@playwright/test');
const { fastLogin } = require('./helpers/auth');

test.describe('Tasks — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await fastLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('task CRUD flow', async ({ page }) => {
    const title = `E2E Task ${Date.now()}`;
    const updatedTitle = `${title} updated`;

    // Create
    await page.locator('button.bg-primary.mt-2').first().click();
    const quickTitle = page.locator('input[placeholder*="כותרת"]').first();
    await expect(quickTitle).toBeVisible();
    await quickTitle.fill(title);
    await page.locator('button', { hasText: /שמור/i }).last().click();
    await expect(quickTitle).not.toBeVisible({ timeout: 8000 });

    // Verify in tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const taskTitle = page.locator('.task-title', { hasText: title }).first();
    await expect(taskTitle).toBeVisible();

    // Edit
    await taskTitle.click();
    await page.locator('button.text-blue-600').first().click();
    const formTitle = page.locator('input[name="title"]').first();
    await expect(formTitle).toBeVisible();
    await formTitle.fill(updatedTitle);
    await page.locator('button[type="submit"]').last().click();
    await expect(formTitle).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator('.task-title', { hasText: updatedTitle }).first()).toBeVisible();

    // Delete
    const updated = page.locator('.task-title', { hasText: updatedTitle }).first();
    await updated.click();
    page.once('dialog', d => d.accept());
    await page.locator('button.text-rose-600').first().click();
    await expect(updated).not.toBeVisible({ timeout: 8000 });
  });
});
