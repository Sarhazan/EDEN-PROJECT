# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `TaskCard.jsx`, `TaskForm.jsx`, `AppContext.jsx`)
- Pages: PascalCase with "Page" suffix (e.g., `MyDayPage.jsx`, `AllTasksPage.jsx`)
- Server routes: lowercase (e.g., `tasks.js`, `employees.js`, `suppliers.js`)
- Server services: lowercase (e.g., `whatsapp.js`, `htmlGenerator.js`)
- Configuration files: lowercase with dots (e.g., `vite.config.js`, `tailwind.config.js`)
- Database files: lowercase (e.g., `schema.js`, `seed.js`)

**Functions:**
- camelCase for all function declarations and arrow functions
- Event handlers prefixed with "handle" (e.g., `handleSubmit`, `handleChange`, `handleDelete`)
- Fetch functions prefixed with "fetch" or "add/update/delete" (e.g., `fetchTasks`, `addTask`, `updateTask`)
- Boolean-returning functions: descriptive names (e.g., `getFloatingButtonConfig`)

**Variables:**
- camelCase for local variables (e.g., `formData`, `selectedDate`, `isEditing`)
- UPPERCASE for constants (e.g., `API_URL`, `PORT`)
- Descriptive object names with type suffix (e.g., `priorityColors`, `statusLabels`, `frequencyOptions`)

**Types:**
- No TypeScript - pure JavaScript codebase
- Props destructured in function parameters
- State variables named with "is/has" prefix for booleans (e.g., `isLoading`, `isReady`, `hasError`)

## Code Style

**Formatting:**
- No formatter config detected (.prettierrc, .editorconfig not present)
- Indentation: 2 spaces (observed in all files)
- Line length: No enforced limit
- Semicolons: Inconsistent - some files use them, some don't (server uses them, client doesn't consistently)
- Quotes: Single quotes preferred in most files
- Trailing commas: Present in multiline arrays/objects

**Linting:**
- ESLint configured for client only
- Config: `c:\dev\projects\claude projects\eden claude\client\eslint.config.js`
- Rules:
  - `no-unused-vars` with exception for uppercase variables
  - React Hooks rules enforced
  - React Refresh plugin enabled
- Run command: `npm run lint` (client directory)

## Import Organization

**Order:**
1. External libraries (React, React Router, third-party packages)
2. Internal components and utilities
3. Context hooks
4. Icons and assets
5. CSS imports (last)

**Pattern observed in client files:**
```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import ComponentName from './components/path/ComponentName';
import { FaIcon } from 'react-icons/fa';
import './styles.css';
```

**Pattern observed in server files:**
```javascript
const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');
const { helperFunction } = require('package');
```

**Path Aliases:**
- None configured
- Relative imports used throughout (e.g., `../../context/AppContext`, `../database/schema`)

## Error Handling

**Client-side:**
- Try-catch blocks in async functions
- Error messages in Hebrew displayed via `alert()`
- Error objects thrown with Hebrew messages (e.g., `throw new Error('שגיאה ביצירת משימה')`)
- Pattern in `c:\dev\projects\claude projects\eden claude\client\src\context\AppContext.jsx`:
```javascript
const addTask = async (task) => {
  const response = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  if (!response.ok) throw new Error('שגיאה ביצירת משימה');
  await fetchTasks();
};
```

**Server-side:**
- Try-catch in route handlers
- HTTP status codes: 400 (validation), 404 (not found), 500 (server error), 201 (created)
- Error responses as JSON with Hebrew messages: `res.status(500).json({ error: error.message })`
- Global error handler in `c:\dev\projects\claude projects\eden claude\server\index.js`:
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'משהו השתבש',
    message: err.message
  });
});
```

## Logging

**Framework:**
- Console-based (native `console.log`, `console.error`)

**Patterns:**
- Server: Verbose logging with markers (e.g., `console.log('=== WhatsAppService.initialize() called ==='`)
- Server: Success markers with checkmarks (e.g., `console.log('✓ WhatsApp client is ready')`)
- Server: Error markers with X (e.g., `console.error('✗ WhatsApp authentication failed:', msg)`)
- Client: Minimal logging, mostly error logging (e.g., `console.error('Error fetching data:', error)`)
- Client: No production logging strategy detected

## Comments

**When to Comment:**
- Section dividers in routes (e.g., `// Get all tasks`, `// Create task`, `// Update task`)
- Complex business logic explanation
- Migration/compatibility notes (e.g., `// Add column if it doesn't exist (migration)`)
- Configuration explanations (e.g., `// Listen on all network interfaces`)
- Temporary debugging (observed in WhatsApp service)

**JSDoc/TSDoc:**
- Not used
- No function documentation comments
- No type annotations

## Function Design

**Size:**
- Route handlers: 15-50 lines typically
- React components: 100-400 lines
- Utility functions: 10-30 lines
- No strict enforcement, some large functions exist (e.g., task creation with recurring logic ~100 lines)

**Parameters:**
- React components: Props destructured in function signature
- Event handlers: Event object passed as `e`
- API functions: Data objects passed directly
- Express routes: `(req, res)` or `(req, res, next)` signature

**Return Values:**
- React components: JSX
- API calls: Promises (async/await pattern)
- Express routes: JSON responses via `res.json()` or `res.status().json()`
- Hooks: Objects with state and functions

## Module Design

**Exports:**
- Client: ES6 modules - `export default ComponentName` for components
- Client: Named exports for utilities - `export function utilName()`
- Server: CommonJS - `module.exports = router` or `module.exports = { db, initializeDatabase }`
- Context: Named export for hook - `export function useApp()`

**Barrel Files:**
- Not used
- Direct imports from component files

## Component Patterns

**React:**
- Functional components only (no class components)
- Hooks: `useState`, `useEffect`, `useContext`, `useApp` (custom)
- Prop validation: None (no PropTypes or TypeScript)
- State management: Context API (`AppContext`) for global state
- Form handling: Controlled components with `formData` state object
- Conditional rendering: Ternary operators and `&&` operator

**File Structure Pattern:**
```javascript
// Imports
import dependencies...

// Constants (if any)
const OPTIONS = [...];

// Main component
export default function ComponentName({ props }) {
  // State
  const [state, setState] = useState(initial);

  // Effects
  useEffect(() => {}, []);

  // Handlers
  const handleEvent = () => {};

  // Render
  return <jsx>...</jsx>;
}
```

## Database Patterns

**Query Style:**
- Better-sqlite3 prepared statements
- SQL string templates with parameters
- Pattern:
```javascript
const result = db.prepare(`
  SELECT * FROM table WHERE id = ?
`).get(id);
```

**Transactions:**
- Not explicitly used
- Individual statements executed directly

**Validation:**
- Schema-level: CHECK constraints in SQL
- Application-level: Required field checks before INSERT

## Styling

**Approach:**
- Tailwind CSS utility classes
- Custom CSS in `c:\dev\projects\claude projects\eden claude\client\src\index.css` for animations and global styles
- RTL (right-to-left) support: `direction: rtl` in body
- No CSS modules or styled-components

**Class Naming:**
- Utility-first (Tailwind)
- Template literals for dynamic classes
- Pattern in `c:\dev\projects\claude projects\eden claude\client\src\components\shared\TaskCard.jsx`:
```javascript
className={`
  bg-white rounded-xl shadow-md p-5
  ${task.status === 'completed' ? 'opacity-70' : ''}
  ${task.priority === 'urgent' ? 'border-r-4 border-rose-500' : ''}
`}
```

## Localization

**Language:**
- UI text: Hebrew (RTL)
- Variable names: English
- Comments: English
- Error messages: Hebrew
- Database content: Hebrew

**Pattern:**
- Hardcoded Hebrew strings in JSX
- No i18n library
- Hebrew labels in objects (e.g., `priorityLabels`, `statusLabels`)

---

*Convention analysis: 2026-01-19*
