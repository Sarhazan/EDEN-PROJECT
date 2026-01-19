# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Client-Server REST API with Monorepo Structure

**Key Characteristics:**
- Decoupled React SPA frontend and Express REST backend
- SQLite database with better-sqlite3 for synchronous operations
- WhatsApp integration via whatsapp-web.js for task notifications
- Static HTML generation with Git-based deployment for task confirmations
- Context-based state management on frontend

## Layers

**Presentation Layer (Client):**
- Purpose: User interface for task and entity management
- Location: `c:/dev/projects/claude projects/eden claude/client/src`
- Contains: React components, pages, forms, context providers
- Depends on: Backend REST API at `/api/*` endpoints
- Used by: End users via browser

**Routing Layer (Client):**
- Purpose: Client-side navigation and URL handling
- Location: `c:/dev/projects/claude projects/eden claude/client/src/App.jsx`
- Contains: React Router configuration with public and private routes
- Depends on: Pages and layout components
- Used by: Presentation layer

**State Management (Client):**
- Purpose: Global application state and API integration
- Location: `c:/dev/projects/claude projects/eden claude/client/src/context/AppContext.jsx`
- Contains: Context provider with fetch/CRUD methods for all entities
- Depends on: Backend API endpoints
- Used by: All pages and components via useApp() hook

**API Layer (Server):**
- Purpose: HTTP endpoint handling and request routing
- Location: `c:/dev/projects/claude projects/eden claude/server/routes/`
- Contains: Express routers for tasks, systems, employees, suppliers, locations, WhatsApp, confirmations
- Depends on: Database layer and service layer
- Used by: Client via HTTP requests

**Service Layer (Server):**
- Purpose: Business logic and external integrations
- Location: `c:/dev/projects/claude projects/eden claude/server/services/`
- Contains: WhatsApp messaging service, HTML generation service
- Depends on: External APIs (WhatsApp Web, Vercel, TinyURL)
- Used by: API routes

**Data Layer (Server):**
- Purpose: Database schema and direct data access
- Location: `c:/dev/projects/claude projects/eden claude/server/database/`
- Contains: Schema definition, database initialization, seed data
- Depends on: SQLite via better-sqlite3
- Used by: API routes directly via prepared statements

## Data Flow

**Task Creation Flow:**

1. User submits TaskForm in browser
2. AppContext.addTask() sends POST to `/api/tasks`
3. Route handler in `server/routes/tasks.js` validates data
4. For recurring tasks, logic creates multiple instances with date calculations
5. Database inserts via prepared statements in `server/database/schema.js`
6. Response returns to client, triggers fetchTasks() refresh
7. UI updates with new task data

**WhatsApp Notification Flow:**

1. User clicks "Send All Tasks" on MyDayPage
2. Tasks grouped by employee_id on client
3. POST to `/api/whatsapp/send-bulk` with tasksByEmployee payload
4. For each employee:
   - Generate crypto token and store in task_confirmations table
   - htmlGenerator.generateTaskHtml() creates static HTML from template
   - Git commit and push HTML to GitHub, deploy to Vercel
   - Wait for URL availability with polling
   - Shorten URL via TinyURL API
   - whatsappService.sendMessage() sends task list and link
5. Update all task statuses to 'sent'
6. Client refreshes task list

**Task Confirmation Flow:**

1. Employee clicks WhatsApp link to `/confirm/:token`
2. TaskConfirmationPage fetches token data from `/api/confirm/:token`
3. Displays task list with acknowledge button
4. On acknowledge, POST to `/api/confirm/:token/acknowledge`
5. Updates task_confirmations.is_acknowledged in database
6. Returns success to static page

**State Management:**
- Client uses React Context for centralized state
- All entity data (tasks, systems, employees, suppliers, locations) cached in context
- Mutations trigger refetch to ensure consistency
- No client-side state persistence (fresh load on page refresh)

## Key Abstractions

**Task Recurrence:**
- Purpose: Handle repeating task instances
- Examples: `server/routes/tasks.js` lines 96-189, 264-328
- Pattern: Single recurring definition generates multiple dated instances upfront (30 days for daily, configured counts for other frequencies). Completing a recurring task creates the next instance.

**WhatsApp Client Singleton:**
- Purpose: Maintain single authenticated WhatsApp Web session
- Examples: `server/services/whatsapp.js`
- Pattern: Singleton class with QR-based authentication, callback queue for async QR generation, persistent LocalAuth session storage

**Context-based CRUD:**
- Purpose: Unified API interaction pattern
- Examples: `client/src/context/AppContext.jsx` lines 43-234
- Pattern: Each entity has fetch/add/update/delete methods that handle HTTP requests and trigger state updates

**Route-specific Modals:**
- Purpose: Context-aware floating action buttons
- Examples: `client/src/App.jsx` lines 54-98
- Pattern: Single floating button changes function based on route pathname, triggers corresponding entity modal

## Entry Points

**Client Entry:**
- Location: `c:/dev/projects/claude projects/eden claude/client/src/main.jsx`
- Triggers: Browser navigates to application URL
- Responsibilities: Mounts React app to DOM with StrictMode

**Client Root Component:**
- Location: `c:/dev/projects/claude projects/eden claude/client/src/App.jsx`
- Triggers: Mounted by main.jsx
- Responsibilities: Provides AppContext, Router, and MainContent with route definitions

**Server Entry:**
- Location: `c:/dev/projects/claude projects/eden claude/server/index.js`
- Triggers: `node server/index.js` or `npm start`
- Responsibilities: Initialize Express, database, mount route handlers, serve static files in production

**Public Confirmation Pages:**
- Location: Static HTML files in `c:/dev/projects/claude projects/eden claude/docs/`
- Triggers: WhatsApp link click
- Responsibilities: Display tasks to employee, submit acknowledgment without authentication

## Error Handling

**Strategy:** HTTP status codes with Hebrew error messages

**Patterns:**
- Route handlers use try-catch blocks to catch synchronous errors
- Database errors return 500 with error.message
- Validation errors return 400 with Hebrew message
- Not found errors return 404 with Hebrew message
- Client displays errors via alert() (no toast system)
- WhatsApp errors provide user-friendly Hebrew messages (e.g., "מספר הטלפון אינו רשום בוואטסאפ")

## Cross-Cutting Concerns

**Logging:** console.log/console.error throughout, especially verbose in WhatsApp operations

**Validation:** Basic required field validation in routes (line-level checks), no schema validation library

**Authentication:** None - application is open access. Confirmation pages use crypto tokens for identification, not authentication.

---

*Architecture analysis: 2026-01-19*
