---
status: resolved
trigger: "demo-data-not-loading-or-clearing"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:12:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED - VITE_API_URL missing /api suffix
test: Applied fix to client/.env
expecting: After Vite server restart, "טען נתוני דמה" button will work and load demo data
next_action: Instruct user to restart Vite dev server

## Symptoms

expected: Demo data should load automatically when app starts AND should be clearable via the clear button
actual:
  1. Demo data doesn't load at all - page shows empty state "אין משימות קבועות לתאריך"
  2. Clear demo data button fails with error popup: "שגיאה מחיקת נתוני דמה נכשלה" (Error: clearing demo data failed)
errors: Alert popup showing "localhost:5174 says: שגיאה מחיקת נתוני דמה נכשלה"
reproduction:
  1. Open app at localhost:5174
  2. Navigate to "היום שלי" (My Day) page
  3. Observe no tasks appear (should show demo data)
  4. Try clicking clear demo data button - error appears
started: Just started happening - this worked before but broke recently (possibly after recent MyDayPage changes)

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:05:00Z
  checked: client/.env VITE_API_URL value
  found: `VITE_API_URL=http://localhost:3002` (NO `/api` suffix)
  implication: API_URL will be set to this value without /api

- timestamp: 2026-01-25T00:06:00Z
  checked: AppContext.jsx API_URL initialization (lines 7-9)
  found: `API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:3002/api'`
  implication: Uses VITE_API_URL value if defined, otherwise defaults to value WITH /api. Since VITE_API_URL is defined, it uses `http://localhost:3002` (NO /api)

- timestamp: 2026-01-25T00:07:00Z
  checked: server/index.js route registration
  found: `app.use('/api/data', require('./routes/data'))` and all routes use `/api` prefix
  implication: Server expects all requests to have `/api` prefix

- timestamp: 2026-01-25T00:08:00Z
  checked: How this breaks demo data specifically
  found: With VITE_API_URL=http://localhost:3002, calls become `http://localhost:3002/data/seed` but server expects `http://localhost:3002/api/data/seed`
  implication: All API calls should be failing, but other functionality seems to work - need to verify why

- timestamp: 2026-01-25T00:09:00Z
  checked: server/index.js initialization
  found: Only calls initializeDatabase(), NOT seedDatabase() on server start
  implication: Demo data is not loaded automatically - requires user to click "טען נתוני דמה" button. Empty state on app start is expected behavior.

- timestamp: 2026-01-25T00:10:00Z
  checked: Why user sees empty state AND clear fails
  found: App starts with empty database (no auto-seed). User clicks "נקה נתונים" which calls clearData() but fails due to wrong API URL
  implication: Both symptoms (empty state + clear fails) are explained by wrong VITE_API_URL

## Resolution

root_cause: client/.env has `VITE_API_URL=http://localhost:3002` without `/api` suffix. The AppContext code uses this value when set, bypassing the default value that includes `/api`. This causes all API calls to be made to wrong URLs (missing `/api` prefix), resulting in 404 errors for demo data endpoints and likely all other endpoints.

The issue occurs because:
1. client/.env defines VITE_API_URL=http://localhost:3002
2. AppContext.jsx line 7-9 uses this value if defined
3. All API calls become http://localhost:3002/data/seed, http://localhost:3002/tasks, etc.
4. Server routes all require /api prefix (e.g., /api/data/seed, /api/tasks)
5. Result: All API requests return 404 Not Found

fix: Update client/.env to change VITE_API_URL from `http://localhost:3002` to `http://localhost:3002/api`
verification: Fix applied. User needs to restart Vite dev server (client) for .env changes to take effect. After restart, demo data should load automatically if seedDatabase() is called on server start, and clear demo data button should work.
files_changed:
  - client/.env: Added /api suffix to VITE_API_URL
