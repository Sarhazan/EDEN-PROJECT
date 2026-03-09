# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Runner:**
- Playwright `^1.58.2` (End-to-End only)
- Root config: `playwright.config.js`
- Client-local config: `client/playwright.config.js` (mirrors root, targets same port)

**Assertion Library:**
- `@playwright/test` built-in `expect`

**Run Commands:**
```bash
npm run test:e2e          # Run all E2E tests (from root)
npm run test:e2e:ui       # Playwright UI mode for debugging
npx playwright test       # Direct playwright invocation
```

**No unit test framework detected.** There is no Jest, Vitest, or Mocha configuration anywhere in the project. The entire test suite is Playwright E2E only.

## Test File Organization

**Location:**
- Primary E2E suite: `e2e/` (root level) — 4 spec files + 1 helpers directory
- Secondary/legacy spec: `client/e2e/eden.spec.js` — older, flat test style without describe blocks

**Naming:**
- `{domain}.spec.js` — `auth.spec.js`, `tasks.spec.js`, `myday.spec.js`, `settings.spec.js`

**Structure:**
```
e2e/
├── helpers/
│   └── auth.js           # Shared login/logout helpers
├── auth.spec.js          # Auth flows
├── myday.spec.js         # MyDay page smoke tests
├── settings.spec.js      # Settings page interactions
└── tasks.spec.js         # Task CRUD flow

client/e2e/
└── eden.spec.js          # Legacy flat tests (no describe grouping)
```

## Test Structure

**Suite Organization (primary `e2e/` style):**
```js
const { test, expect } = require('@playwright/test');
const { fastLogin } = require('./helpers/auth');

test.describe('MyDay Page', () => {
  test.beforeEach(async ({ page }) => {
    await fastLogin(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('MyDay page loads with main heading', async ({ page }) => {
    const heading = page.locator('h1', { hasText: /היום שלי/i });
    await expect(heading).toBeVisible({ timeout: 8000 });
  });
});
```

**Patterns:**
- `test.describe` block groups related tests under a domain name
- `test.beforeEach` always handles authentication via `fastLogin()` (localStorage injection) or `loginAsSite()` (UI login)
- Tests are single-concern and short (5-20 lines each)
- `test.skip()` used inline when preconditions are unmet (e.g., already logged in)
- `page.once('dialog', d => d.accept())` for native `confirm()` dialogs

## Authentication Helpers

**File:** `e2e/helpers/auth.js`

Three exported functions:

```js
// Fast login: injects localStorage directly (skips UI)
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

// UI login: fills credentials form
async function loginAsSite(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const passwordField = page.locator('input[type="password"]');
  const isOnLogin = await passwordField.isVisible().catch(() => false);
  if (!isOnLogin) return; // Guard: already logged in
  await page.locator('input[type="text"]').first().fill('eden');
  await passwordField.fill('eden100');
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => localStorage.getItem('isAuthenticated') === 'true', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Logout via UI button
async function logout(page) {
  const logoutBtn = page.locator('button[class*="hover:bg-red-600/20"]').first();
  await logoutBtn.click();
  await page.waitForFunction(() => localStorage.getItem('isAuthenticated') !== 'true', { timeout: 10000 });
}

module.exports = { loginAsSite, fastLogin, logout };
```

**Rule:** Use `fastLogin` in all tests except those specifically testing auth flows. `loginAsSite` is reserved for `auth.spec.js`.

## Mocking

**Framework:** None. Playwright runs against the live application.

**What is mocked:**
- Authentication state is bypassed via localStorage injection (`fastLogin`)
- No HTTP request mocking (no `page.route()` or `page.fulfill()` patterns found)
- No API stubs or service mocks

**What is NOT mocked:**
- All API calls go to the real server at `http://localhost:5174` (Vite proxy) / `http://localhost:3002` (Express)
- Database is live SQLite (`maintenance.db`) during test runs
- WhatsApp integration is not tested (live service, not safe to trigger in tests)

## Playwright Configuration

**Root `playwright.config.js`:**
```js
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,           // Per-test timeout
  expect: { timeout: 8000 }, // Assertion timeout
  fullyParallel: false,     // Tests run serially
  retries: 1,               // One automatic retry on failure
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'he-IL',          // Israeli locale (RTL app)
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

**Key settings:**
- Serial execution (`fullyParallel: false`) — tests share live database, ordering matters
- Hebrew locale (`he-IL`) matches production app locale
- Screenshots on failure saved to `test-results/`
- Traces captured on first retry for debugging

## Locator Patterns

**Preferred:**
- Role-based: `page.getByRole('button', { name: /כניסה|התחבר|Login/i })`
- Text content: `page.locator('h1', { hasText: /היום שלי/i })`
- Input type: `page.locator('input[type="password"]')`, `page.locator('input[type="time"]')`
- CSS class selectors: `page.locator('button.bg-green-600')`, `page.locator('.task-title')`
- Name attribute: `page.locator('input[name="title"]')`

**Anti-patterns present (avoid in new tests):**
- Hard-coded Tailwind class selectors (`button.bg-primary.mt-2`) — brittle to style changes
- `.first()` chained to ambiguous locators without scoping — `page.locator('select').first()`
- `page.waitForTimeout()` delays — used in `client/e2e/eden.spec.js` legacy file; prefer `waitForLoadState` or `waitForFunction`

## Fixtures and Factories

**Test Data:**
- No fixture files or factory functions. Test data created inline:
```js
const title = `E2E Task ${Date.now()}`; // Unique title using timestamp
```
- Task CRUD test creates, edits, then deletes its own data — self-cleaning

**Shared State:**
- No global setup/teardown (`globalSetup` not configured)
- Each test file manages its own preconditions via `beforeEach`
- Database state is NOT reset between tests — test order can matter

## Coverage

**Requirements:** None enforced — no coverage tooling configured.

**View Coverage:**
- Not applicable. No coverage tool installed.

## Test Types

**Unit Tests:**
- None. No unit test framework exists in the project.

**Integration Tests:**
- None as a separate category. The E2E tests exercise the full stack implicitly.

**E2E Tests:**
- Framework: Playwright
- Scope: UI interactions against a running full-stack app (Vite dev server + Express API + SQLite)
- Coverage areas:
  - Auth: login form, credential validation, logout (`auth.spec.js`)
  - Tasks: CRUD flow (create/read/update/delete) (`tasks.spec.js`)
  - MyDay: page load, stats, filters, date picker, bulk WhatsApp button (`myday.spec.js`)
  - Settings: time inputs, auto-save behavior (`settings.spec.js`)

## Common Patterns

**Waiting for page ready:**
```js
await page.waitForLoadState('networkidle'); // After navigation
await page.waitForLoadState('domcontentloaded'); // After goto
```

**Conditional test skip (guard pattern):**
```js
const isOnLogin = await passwordField.isVisible().catch(() => false);
if (!isOnLogin) {
  test.skip();
  return;
}
```

**Dialog handling:**
```js
page.once('dialog', d => d.accept()); // Register BEFORE the action that triggers dialog
await page.locator('button.text-rose-600').first().click();
```

**Asserting element gone:**
```js
await expect(element).not.toBeVisible({ timeout: 8000 });
```

**Asserting localStorage:**
```js
const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
expect(isAuthenticated).toBe('true');
```

---

*Testing analysis: 2026-03-09*
