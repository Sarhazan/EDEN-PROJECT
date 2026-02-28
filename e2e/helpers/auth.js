/**
 * Shared login helpers for Eden E2E tests.
 * Credentials: username=eden, password=eden100
 */

/**
 * Login via the UI form.
 * Navigates to '/', waits for login page, fills credentials, submits.
 */
async function loginAsSite(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Wait briefly for React to render
  await page.waitForTimeout(500);

  // Check if we're already authenticated (no password field visible)
  const passwordField = page.locator('input[type="password"]');
  const isOnLogin = await passwordField.isVisible().catch(() => false);
  if (!isOnLogin) return;

  // Fill username
  const usernameField = page.locator('input[type="text"]').first();
  await usernameField.fill('eden');

  // Fill password
  await passwordField.fill('eden100');

  // Submit the form
  await page.locator('button[type="submit"]').click();

  // Wait until login completes (localStorage updated)
  await page.waitForFunction(
    () => localStorage.getItem('isAuthenticated') === 'true',
    { timeout: 10000 }
  );

  await page.waitForLoadState('networkidle');
}

/**
 * Fast login by directly setting localStorage (skips UI login form).
 * Use for tests that don't test the login flow itself.
 */
async function fastLogin(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authRole', 'site');
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Logout via the sidebar logout button.
 */
async function logout(page) {
  // Click the logout button (contains יציאה text or FaSignOutAlt icon)
  const logoutBtn = page.locator('button', { hasText: /יציאה/i });
  await logoutBtn.click();

  // Wait for login page to appear
  await page.waitForFunction(
    () => localStorage.getItem('isAuthenticated') !== 'true',
    { timeout: 5000 }
  );
}

module.exports = { loginAsSite, fastLogin, logout };
