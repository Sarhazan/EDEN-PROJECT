# Coding Conventions

**Analysis Date:** 2026-03-09

## Naming Patterns

**Files:**
- React components: PascalCase `.jsx` — `TaskCard.jsx`, `QuickTaskModal.jsx`, `StatsBar.jsx`
- React hooks: camelCase prefixed with `use`, `.js` extension — `useTaskFilters.js`, `useBulkWhatsApp.js`, `useColumnResize.js`
- Server routes: camelCase `.js` — `tasks.js`, `employees.js`, `taskConfirmation.js`
- Server services: camelCase `.js` — `taskService.js`, `htmlGenerator.js`, `dataRetention.js`
- Server utilities: camelCase `.js` — `dateUtils.js`
- Pages: PascalCase with `Page` suffix `.jsx` — `MyDayPage.jsx`, `SettingsPage.jsx`, `HistoryPage.jsx`

**Functions:**
- React components: PascalCase default exports — `export default function TaskCard()`
- Hook exports: named camelCase — `export function useTaskFilters()`
- Server route handlers: anonymous inline arrow functions within `router.get/post/put/delete`
- Server service methods: camelCase — `calculateEstimatedEnd()`, `enrichTaskWithTiming()`, `getIsraelDateParts()`
- Private service methods (class-based): underscore prefix — `_translateTasks()`

**Variables:**
- camelCase throughout — `filterCategory`, `isSendingBulk`, `tasksWithAttachments`
- SCREAMING_SNAKE_CASE for module-level constants — `IS_TEST_ENV`, `API_URL`, `SOCKET_URL`, `LS_KEYS`
- Temporary/unused hook returns: underscore prefix — `const _taskFiltersHook = useTaskFilters(...)`

**Database fields:**
- snake_case — `task_id`, `start_date`, `employee_id`, `is_recurring`, `estimated_duration_minutes`

**Types/Lookups:**
- Module-level plain objects for label/color maps, SCREAMING_SNAKE_CASE or PascalCase name — `priorityColors`, `statusLabels`, `frequencyLabels`

## Code Style

**Formatting:**
- No Prettier config detected. Consistent 2-space indentation used throughout.
- Single quotes for strings in server (CommonJS). Single quotes in client (ES modules).
- Template literals for string interpolation.

**Linting:**
- Client only: ESLint via `client/eslint.config.js`
- Extends: `@eslint/js` recommended + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- Key rules: `no-unused-vars` errors except for SCREAMING_SNAKE_CASE variables (`varsIgnorePattern: '^[A-Z_]'`)
- No server-side ESLint config detected.

**Module System:**
- Server: CommonJS (`require` / `module.exports`) — `"type": "commonjs"` in root `package.json`
- Client: ES Modules (`import` / `export`) — `"type": "module"` in `client/package.json`

## Import Organization

**Client (React) — order:**
1. React core hooks — `import { useState, useEffect, useMemo } from 'react'`
2. Third-party libraries — `axios`, `date-fns`, `react-icons/fa`, `react-datepicker`
3. Internal context — `import { useApp } from '../context/AppContext'`
4. Internal hooks — `import { useTaskFilters } from '../hooks/useTaskFilters'`
5. Internal components — `import TaskCard from '../components/shared/TaskCard'`
6. Internal config/constants — `import { API_URL, LS_KEYS } from '../config'`
7. CSS files last — `import 'react-datepicker/dist/react-datepicker.css'`

**Server (Node.js) — order:**
1. Node built-ins — `require('path')`, `require('fs')`
2. Third-party packages — `require('express')`, `require('date-fns')`
3. Internal database — `require('../database/schema')`
4. Internal services/utils — `require('../services/taskService')`

**Path Aliases:**
- None configured. All imports use relative paths.

## Error Handling

**Server routes:**
- Uniform try/catch wrapping every route handler
- Catch always responds with `res.status(500).json({ error: error.message })`
- Example pattern from `server/routes/tasks.js`:
```js
router.get('/', (req, res) => {
  try {
    // ... synchronous better-sqlite3 calls
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```
- Global crash guards in `server/index.js` catch `uncaughtException` and `unhandledRejection` to keep the process alive (critical for WhatsApp/Puppeteer stability)

**Client (async/await):**
- `try/catch` with `alert()` or `setError()` state for user-visible errors
- axios calls use `.catch(error => ...)` or `try/catch` blocks
- Socket event errors logged via `console.error`
- `react-toastify` (`toast`) used in form components like `QuickTaskModal.jsx` for non-blocking feedback
- `alert()` and `confirm()` used frequently in hooks/pages for destructive or confirmation actions (not toast-based)

**Validation:**
- No dedicated validation library. Inline conditional checks before API calls.

## Logging

**Framework:** `console.log` / `console.error` / `console.warn` (no structured logger)

**Server patterns:**
- Prefixed with module context in brackets: `console.error('[Server] Uncaught exception...')`, `console.log('WhatsApp service connected to Socket.IO')`
- 171 `console.*` calls across 16 server files — used extensively for debugging and status reporting
- Services log task/event lifecycle: translation steps, WhatsApp init stages, cron job triggers

**Client patterns:**
- 26 `console.*` calls across 8 client files — used sparingly for error reporting
- Primarily `console.error` for fetch failures and JSON parse errors

## Comments

**When to Comment:**
- Block comments `// ─── Section Name ───` used to visually separate code sections in large files (e.g., `server/index.js`)
- Inline `//` comments explain non-obvious logic (timezone handling, SQL edge cases, WhatsApp reconnect logic)
- JSDoc blocks used selectively in services (`server/services/htmlGenerator.js`, `server/services/whatsapp.js`, `server/utils/dateUtils.js`)
- Hebrew UI labels embedded as string literals — never abstracted into constants in client code

**JSDoc/TSDoc:**
- Used in server services for public methods and complex utilities
- Pattern: `@param`, `@returns`, `@private` tags on class methods
- Client code: no JSDoc — inline comments instead

## Function Design

**Size:**
- Route handlers are often long (50-200+ lines for complex endpoints in `tasks.js`, `employees.js`)
- Services and hooks decompose logic into focused functions
- `server/routes/tasks.js` is 831 lines — largest server file; not split into sub-modules

**Parameters:**
- Hooks accept positional primitive/array args — `useTaskFilters(tasks, employees, systems, locations, selectedDate)`
- Hooks that need many options use a single destructured object — `useBulkWhatsApp({ tasks, selectedDate, filterCategory, ... })`
- Server service functions use positional args — `calculateEstimatedEnd(task)`, `enrichTaskWithTiming(task)`

**Return Values:**
- Hooks return a flat object of state + handlers — `return { filteredTasks, filterCategory, setFilterCategory, ... }`
- Services export named functions via `module.exports = { functionName }`
- Router files export router + optional `setIo` for Socket.IO injection: `module.exports = router; module.exports.setIo = setIo;`

## Module Design

**Client exports:**
- Pages and components: single `export default function ComponentName()`
- Hooks: named exports — `export function useHookName()`
- Context: named `AppProvider` export + `useApp` custom hook

**Server exports:**
- Routes: `module.exports = router` (always)
- Routes needing Socket.IO: additionally `module.exports.setIo = setIo`
- Services: object of named functions or singleton class instance
- Utilities: `module.exports = { functionName }`

**Barrel Files:**
- None used. All imports point directly to specific files.

## React Patterns

**State:**
- `useState` with lazy initializer for localStorage-backed state:
```jsx
const [starFilter, setStarFilter] = useState(() => {
  return localStorage.getItem(LS_KEYS.STAR_FILTER) === 'true';
});
```
- Multiple boolean state pairs for async operations: `[saving, setSaving]` + `[saved, setSaved]` pattern in `SettingsPage.jsx`

**Derived data:**
- `useMemo` for filtered/computed lists — always with explicit dependency arrays
- Filter logic centralized in custom hooks (`useTaskFilters`, `useManagerFilter`, `useHistoryFilters`)

**Effects:**
- `useEffect` with cleanup for event listeners (storage events, custom DOM events, Escape key)
- Socket.IO connection managed in `AppContext.jsx` via `useRef` for socket instance

**UI feedback:**
- `alert()` / `confirm()` for quick confirmations and errors (dominant pattern)
- `react-toastify` `toast()` in form submission flows
- Inline `setError` / `setSuccessMessage` state for settings-style forms

---

*Convention analysis: 2026-03-09*
