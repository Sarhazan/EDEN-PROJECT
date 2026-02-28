async function loginAsSite(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const passwordField = page.locator('input[type="password"]');
  const isOnLogin = await passwordField.isVisible().catch(() => false);
  if (!isOnLogin) return;

  await page.locator('input[type="text"]').first().fill('eden');
  await passwordField.fill('eden100');
  await page.locator('button[type="submit"]').click();

  await page.waitForFunction(() => localStorage.getItem('isAuthenticated') === 'true', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

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

async function logout(page) {
  const logoutBtn = page.locator('button[class*="hover:bg-red-600/20"]').first();
  await logoutBtn.click();
  await page.waitForFunction(() => localStorage.getItem('isAuthenticated') !== 'true', { timeout: 10000 });
}

module.exports = { loginAsSite, fastLogin, logout };
