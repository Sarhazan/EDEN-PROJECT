# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- Not configured
- No test framework detected (no Jest, Vitest, Mocha config files)

**Assertion Library:**
- None configured

**Run Commands:**
```bash
# No test commands available
# package.json does not include test scripts
```

## Test File Organization

**Location:**
- No test files found in codebase (outside node_modules)

**Naming:**
- Not applicable (no tests present)

**Structure:**
```
# No test directory structure exists
```

## Test Structure

**Suite Organization:**
- No tests present

**Patterns:**
- Not applicable

## Mocking

**Framework:**
- Not configured

**Patterns:**
- Not applicable

**What to Mock:**
- API calls would need mocking (fetch/axios)
- Database calls would need mocking (better-sqlite3)
- WhatsApp client would need mocking (whatsapp-web.js)
- File system operations would need mocking (fs)

**What NOT to Mock:**
- Pure utility functions
- Component rendering (use integration tests)

## Fixtures and Factories

**Test Data:**
- Seed data exists in `c:\dev\projects\claude projects\eden claude\server\database\seed.js` but used for development, not testing

**Location:**
- No test fixtures directory

## Coverage

**Requirements:**
- None enforced
- No coverage tools configured

**View Coverage:**
```bash
# No coverage command available
```

## Test Types

**Unit Tests:**
- Not present
- Would test individual functions, components, route handlers in isolation

**Integration Tests:**
- Not present
- Would test API endpoints, database operations, React component interactions

**E2E Tests:**
- Not used
- No Playwright, Cypress, or Puppeteer configuration detected

## Common Patterns

**Async Testing:**
- Not applicable (no tests present)
- Pattern to implement:
```javascript
// For async API calls
test('should fetch tasks', async () => {
  const tasks = await fetchTasks();
  expect(tasks).toBeDefined();
});
```

**Error Testing:**
- Not applicable (no tests present)
- Pattern to implement:
```javascript
// For error handling
test('should throw error on invalid data', async () => {
  await expect(addTask({})).rejects.toThrow('שדות חובה חסרים');
});
```

## Testing Gaps

**Current State:**
- **No automated testing** - This is a significant quality concern
- Manual testing only
- No CI/CD pipeline with automated tests
- No regression testing capability

**Critical Areas Needing Tests:**

1. **Task Recurring Logic** (`c:\dev\projects\claude projects\eden claude\server\routes\tasks.js`)
   - Complex date calculation logic (lines 96-189)
   - Multiple frequency types (daily, weekly, biweekly, monthly, semi-annual, annual)
   - Weekly days selection for daily tasks
   - High risk of regression bugs

2. **WhatsApp Integration** (`c:\dev\projects\claude projects\eden claude\server\services\whatsapp.js`)
   - Phone number formatting
   - Message sending
   - QR code authentication flow
   - Connection state management

3. **Database Schema Migrations** (`c:\dev\projects\claude projects\eden claude\server\database\schema.js`)
   - Column additions (lines 62-73)
   - Data integrity
   - Foreign key constraints

4. **Form Validation** (`c:\dev\projects\claude projects\eden claude\client\src\components\forms\TaskForm.jsx`)
   - Date/time validation (lines 156-181)
   - Required field validation
   - Hebrew time format (HH:MM)

5. **Context API State Management** (`c:\dev\projects\claude projects\eden claude\client\src\context\AppContext.jsx`)
   - All CRUD operations
   - Error handling
   - Data refresh logic

## Recommended Testing Setup

**Framework to Add:**
- **Backend:** Jest or Vitest for server-side tests
- **Frontend:** Vitest + React Testing Library for component tests
- **E2E:** Playwright for critical user flows

**Installation Pattern:**
```bash
# Client (Vitest already compatible with Vite)
cd client
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Server (Jest for Node.js)
npm install -D jest supertest
```

**Test Structure to Implement:**
```
server/
  __tests__/
    routes/
      tasks.test.js
      employees.test.js
    services/
      whatsapp.test.js
    database/
      schema.test.js

client/
  src/
    components/
      __tests__/
        TaskCard.test.jsx
        TaskForm.test.jsx
    context/
      __tests__/
        AppContext.test.jsx
```

**Priority Order:**
1. Unit tests for task recurring logic (highest risk)
2. Integration tests for API endpoints
3. Component tests for forms
4. E2E tests for critical flows (create task, send WhatsApp)

---

*Testing analysis: 2026-01-19*
