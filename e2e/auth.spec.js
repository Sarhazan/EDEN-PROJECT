const { test, expect } = require('@playwright/test');
const { loginAsSite, logout } = require('./helpers/auth');

test.describe('Auth — Login & Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Start each auth test without any authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authRole');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('unauthenticated user sees login form', async ({ page }) => {
    // Without credentials in localStorage, the app shows the login page
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible({ timeout: 8000 });

    const usernameField = page.locator('input[type="text"]').first();
    await expect(usernameField).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('valid credentials redirect to main app', async ({ page }) => {
    await loginAsSite(page);

    // After login, the password field should be gone
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).not.toBeVisible({ timeout: 8000 });

    // Main app content should be visible (sidebar navigation)
    // The sidebar has navigation links
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });

    // localStorage should have the auth flag
    const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    expect(isAuthenticated).toBe('true');
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const passwordField = page.locator('input[type="password"]');
    const isOnLogin = await passwordField.isVisible().catch(() => false);
    if (!isOnLogin) {
      // If already logged in from another test state, skip
      test.skip();
      return;
    }

    await page.locator('input[type="text"]').first().fill('eden');
    await passwordField.fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Should still be on login (error message or still has password field)
    await expect(passwordField).toBeVisible({ timeout: 5000 });

    // Should NOT be authenticated
    const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    expect(isAuthenticated).not.toBe('true');
  });

  test('logout returns to login form', async ({ page }) => {
    // First login
    await loginAsSite(page);

    // Verify we're in the app
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });

    // Logout
    await logout(page);

    // Login form should appear again
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible({ timeout: 8000 });
  });
});
