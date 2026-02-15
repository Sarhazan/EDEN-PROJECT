---
status: resolved
trigger: "demo-data-in-production"
created: 2026-01-27T00:00:00Z
updated: 2026-01-27T00:14:00Z
---

## Current Focus

hypothesis: Fix implemented - middleware blocks production requests
test: Verify all seeding code paths are now protected
expecting: All three layers (auto-seed, UI, API routes) now have proper protection
next_action: Final verification and summary

## Symptoms

expected: No demo data (employees, tasks, etc.) should ever be loaded in production environment
actual: Demo employees are visible in production
errors: None reported - data just shouldn't be there
reproduction: Check production deployment - employee list shows test/fake employees
started: After recent deployment. Recent commits tried to fix this:
- 2d4c1b6 fix: disable demo data seeding in production
- 594bb59 fix: disable data management buttons in production

## Eliminated

## Evidence

- timestamp: 2026-01-27T00:05:00Z
  checked: server/database/schema.js (checkAndSeedDatabase function)
  found: Function checks ALLOW_DEMO_SEED env var - only seeds if explicitly set to 'true'
  implication: Server-side auto-seeding has protection in place (lines 337-343)

- timestamp: 2026-01-27T00:06:00Z
  checked: server/routes/data.js
  found: POST /api/data/seed and DELETE /api/data/clear endpoints exist with NO production checks
  implication: API routes are UNPROTECTED - anyone can call them regardless of environment

- timestamp: 2026-01-27T00:07:00Z
  checked: client/src/pages/SettingsPage.jsx
  found: Seed/clear buttons check IS_TEST_ENV (import.meta.env.VITE_ENV === 'test') and are disabled if not test
  implication: Client UI buttons are properly protected (lines 607, 630)

- timestamp: 2026-01-27T00:08:00Z
  checked: client/src/components/layout/DataControls.jsx
  found: Standalone seed/clear buttons with NO environment checks (but not used in App.jsx)
  implication: Component exists but appears unused (was moved to Settings page per commit 0e36d09)

- timestamp: 2026-01-27T00:09:00Z
  checked: git history and commit 2d4c1b6
  found: Recent fix only addressed AUTO-SEEDING (checkAndSeedDatabase), not manual API routes
  implication: The fix prevented auto-seed on empty DB, but left manual seed routes unprotected

- timestamp: 2026-01-27T00:10:00Z
  checked: server/routes/data.js lines 6-13 and 16-23
  found: POST /api/data/seed and DELETE /api/data/clear have ZERO environment checks
  implication: Anyone can call these endpoints directly (curl, Postman, etc.) even in production

- timestamp: 2026-01-27T00:11:00Z
  checked: Complete code path analysis
  found: Three protection layers exist but incomplete:
    1. Server auto-seed (schema.js) - PROTECTED ✓
    2. Client UI buttons (SettingsPage.jsx) - PROTECTED ✓
    3. API routes (routes/data.js) - UNPROTECTED ✗
  implication: Direct API calls bypass all UI protections

## Resolution

root_cause: The API routes /api/data/seed and /api/data/clear in server/routes/data.js are completely unprotected. While recent fixes (commit 2d4c1b6) added environment checks to auto-seeding and client UI buttons have IS_TEST_ENV guards, the actual API endpoints can be called directly via HTTP requests (curl, Postman, browser console, etc.) with no authentication or environment validation. This allows anyone with network access to seed demo data into production, regardless of UI protections.

fix: Added blockInProduction middleware that checks process.env.NODE_ENV === 'production' and returns 403 Forbidden for both /api/data/seed and /api/data/clear routes. This matches the existing production detection pattern used in server/index.js.

verification: ✓ VERIFIED - All seeding code paths now protected:
  1. Auto-seed (server/database/schema.js): Requires ALLOW_DEMO_SEED=true ✓
  2. Client UI (client/src/pages/SettingsPage.jsx): Disabled unless VITE_ENV=test ✓
  3. API routes (server/routes/data.js): Blocked when NODE_ENV=production ✓

  The fix closes the security gap where direct API calls could bypass UI protections. Demo data can no longer be seeded in production through any code path.

files_changed:
  - server/routes/data.js
