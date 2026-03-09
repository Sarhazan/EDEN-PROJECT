# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Monorepo with a classic three-tier web application

**Key Characteristics:**
- Single Express.js backend serves both the REST API and the built React SPA in production
- React frontend is a fully client-side SPA with a single global state provider (`AppContext`)
- Real-time bidirectional communication via Socket.IO (server → client push for task and WhatsApp events)
- SQLite database (via `better-sqlite3`) accessed directly in route handlers and services — no ORM
- WhatsApp integration runs as an embedded singleton service (`WhatsAppService`) inside the server process, not as a separate gateway

## Layers

**Database Layer:**
- Purpose: Schema definition, migration execution, and the shared `db` connection object
- Location: `server/database/schema.js`, `server/database/seed.js`
- Contains: `CREATE TABLE` statements, inline column migrations (via `ALTER TABLE` try/catch), index helpers
- Depends on: `better-sqlite3`
- Used by: All route handlers and background services via `require('../database/schema')`

**Service Layer:**
- Purpose: Business logic, scheduled jobs, and external integrations — separated from HTTP concerns
- Location: `server/services/`
- Contains:
  - `whatsapp.js` — singleton `WhatsAppService` class managing WhatsApp Web client lifecycle
  - `taskService.js` — task timing calculations (`enrichTaskWithTiming`, `calculateEstimatedEnd`)
  - `taskAutoClose.js` — cron job: marks open tasks `not_completed` at end of workday
  - `taskRollover.js` — rolls over unfinished one-time tasks to the next day
  - `dailyScheduleSender.js` — cron job: sends morning WhatsApp schedule to employees
  - `htmlGenerator.js` — generates multilingual task-confirmation HTML from a template
  - `translation.js` — hybrid Gemini/Google Cloud Translation service with fallback chain
  - `i18n.js` — server-side i18next instance loaded from `src/locales/`
  - `dataRetention.js` — cron job: deletes completed tasks older than 2 years
  - `urlShortener.js` — shortens confirmation page URLs before WhatsApp dispatch
- Depends on: `database/schema`, external APIs (WhatsApp, Gemini, Google Translate)
- Used by: Route handlers, `server/index.js` startup

**Route Layer:**
- Purpose: HTTP request handling — validates input, calls services/db, emits Socket.IO events, returns JSON
- Location: `server/routes/`
- Contains one file per resource domain:
  - `tasks.js` — full CRUD + status transitions + recurring-task generation
  - `taskConfirmation.js` — token-based task acknowledgement flow with photo upload (multer + sharp)
  - `whatsapp.js` — WhatsApp connection management, bulk send, QR retrieval
  - `hq.js` — HQ portal: dispatch targets, distribution lists, reports
  - `forms.js` — building branding, contracts, form dispatches
  - `accounts.js` — external API key management (Google Translate)
  - `data.js` — seed/clear operations (blocked in production unless `ALLOW_DEMO_SEED=true`)
  - `employees.js`, `systems.js`, `suppliers.js`, `locations.js`, `buildings.js`, `tenants.js`, `billing.js`, `history.js`, `languages.js`
- Depends on: `database/schema`, service layer, `socket.io` instance (injected via `setIo()`)
- Used by: `server/index.js` via `app.use('/api/...')`

**Entry Point / Server Bootstrap:**
- Purpose: Wires all layers together, configures Express + Socket.IO, starts background jobs
- Location: `server/index.js`
- Responsibilities: Middleware setup, route mounting, Socket.IO event relay, WhatsApp init, static file serving in production

**Client Global State:**
- Purpose: Centralised fetch-and-cache layer and Socket.IO listener for all entity data
- Location: `client/src/context/AppContext.jsx`
- Contains: All entity arrays (tasks, systems, employees, suppliers, locations, buildings, tenants), auth state, WhatsApp connection flag, Socket.IO socket reference
- Used by: Every page and component via `useApp()` hook

**UI Pages:**
- Purpose: Feature-level views, each pulling from `AppContext` and calling the API directly when needed
- Location: `client/src/pages/`
- Two portal modes:
  - **Maintenance Portal** — `MyDayPage`, `AllTasksPage`, `HistoryPage`, `SystemsPage`, `SuppliersPage`, `EmployeesPage`, `LocationsPage`, `BuildingsPage`, `TenantsPage`, `BillingPage`, `SiteFormsPage`, `FormFillPage`, `SettingsPage`
  - **HQ Portal** — `HQDashboardPage`, `HQDispatchPage`, `HQListsPage`, `HQReportsPage`, `HQFormsPage`, `HQLoginPage`
  - **Public (no auth)** — `TaskConfirmationPage` (`/confirm/:token`), `FormFillPage` (`/forms/fill/:id`)

**UI Components:**
- Purpose: Reusable React components grouped by feature
- Location: `client/src/components/`
- Subdirectories: `layout/`, `shared/`, `forms/`, `myday/`, `employees/`, `history/`, `settings/`

## Data Flow

**Typical CRUD request (e.g., create task):**
1. User submits form in `QuickTaskModal` (`client/src/components/forms/QuickTaskModal.jsx`)
2. `AppContext.addTask()` POSTs to `POST /api/tasks`
3. `server/routes/tasks.js` inserts into SQLite via `db.prepare().run()`
4. Route emits `task:created` event on `io` with the new task object
5. All connected clients receive `task:created` via Socket.IO
6. `AppContext` socket listener appends the task to the `tasks` array
7. All subscribed components re-render with the new data

**WhatsApp task dispatch flow:**
1. Manager clicks "Send to WhatsApp" on `MyDayPage`
2. `useBulkWhatsApp` hook (`client/src/hooks/useBulkWhatsApp.js`) POSTs to `POST /api/whatsapp/send-bulk`
3. `server/routes/whatsapp.js` iterates over employees, calls `htmlGenerator.generateTaskHtmlContent()` per employee
4. HTML confirmation page is served dynamically at `/docs/task-:token.html`
5. `urlShortener` shortens the confirmation URL
6. `WhatsAppService.sendMessage()` sends the WhatsApp message with the link
7. Task status is updated to `sent`; `task:updated` Socket.IO event fires

**Employee task acknowledgement flow:**
1. Employee opens WhatsApp link → browser loads `TaskConfirmationPage` at `/confirm/:token`
2. Page fetches tasks from `GET /api/confirm/:token`
3. Employee taps "Received" → POST to `/api/confirm/:token/acknowledge`
4. Task status changes to `received`; Socket.IO `task:updated` fires back to manager's browser
5. Employee completes task, uploads photo if needed → POST to `/api/confirm/:token/complete`
6. Task status changes to `pending_approval`

**End-of-day automation:**
1. `taskAutoClose` cron fires at workday end time (read from `settings` table)
2. Open tasks for the day → `not_completed`
3. `taskRollover` advances unfinished one-time tasks to tomorrow's date
4. `tasks:bulk_updated` Socket.IO event triggers full refresh on all clients

**State Management:**
- All shared app state lives in `AppContext` (React Context + useState)
- Socket.IO events provide real-time patches (create/update/delete) without polling
- Authentication state persisted in `localStorage` using keys from `client/src/config.js` (`LS_KEYS`)
- No Redux, Zustand, or other state library

## Key Abstractions

**WhatsAppService (singleton):**
- Purpose: Encapsulates the `whatsapp-web.js` client lifecycle, QR state, and message sending
- File: `server/services/whatsapp.js`
- Pattern: Class singleton exported as a module-level instance; `setIo(io)` injected at startup

**Task enrichment:**
- Purpose: Attaches computed timing fields (`estimated_end`, `time_delta_minutes`) to raw DB rows before sending to client
- Function: `enrichTaskWithTiming()` in `server/services/taskService.js`
- Pattern: Pure transformation applied in every route that returns tasks

**io injection pattern:**
- Purpose: Routes need the Socket.IO instance to emit events, but `io` is created in `server/index.js`
- Pattern: Each route file exports a `setIo(ioInstance)` function; `server/index.js` calls it after mounting all routes
- Files: `server/routes/tasks.js`, `server/routes/taskConfirmation.js`, `server/routes/data.js`, `server/services/taskAutoClose.js`

**Dynamic HTML confirmation pages:**
- Purpose: Serve employee-facing confirmation pages in multiple languages without writing static files
- Pattern: `GET /docs/task-:token.html` dynamically queries DB, calls `htmlGenerator`, sets `Content-Type: text/html`
- Files: `server/index.js` (route), `server/services/htmlGenerator.js`, `server/templates/task-confirmation.html`

**Dual-portal auth:**
- Purpose: Two separate user roles (maintenance site staff vs. HQ managers) with separate login flows
- Pattern: `authRole` (`site` | `hq`) stored in `localStorage`; `App.jsx` redirects based on route prefix (`/hq/*` vs. everything else)
- Files: `client/src/context/AppContext.jsx`, `client/src/App.jsx`

**Translation fallback chain:**
- Purpose: Minimize cost while supporting multilingual task content
- Pattern: Try Gemini (free) → fallback Google Cloud Translation (paid) → fallback return original
- File: `server/services/translation.js`

## Entry Points

**Server:**
- Location: `server/index.js`
- Triggers: `node server/index.js` (dev via `nodemon`)
- Responsibilities: Express app + Socket.IO server setup, all middleware, route mounting, service init, WhatsApp init, production static serving

**Client:**
- Location: `client/src/main.jsx`
- Triggers: Vite dev server or built `dist/index.html`
- Responsibilities: React root mount, wraps `App` in `StrictMode`

**App router:**
- Location: `client/src/App.jsx`
- Responsibilities: `AppProvider` wrapping, `BrowserRouter`, route definitions for both portals, global modal management, layout switching (desktop sidebar vs. mobile drawer)

## Error Handling

**Strategy:** Ad-hoc — no unified error abstraction

**Patterns:**
- Server routes wrap handlers in `try/catch`; return `res.status(500).json({ error: error.message })`
- Express error middleware in `server/index.js` (line 248) catches unhandled errors
- Global `process.on('uncaughtException')` and `process.on('unhandledRejection')` guards prevent Puppeteer/WhatsApp crashes from killing the process
- Client fetches in `AppContext` are try/catch wrapped; failures log to console without surfacing to UI
- Toast notifications (`react-toastify`) used in pages for user-facing errors

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout — no structured logging library

**Validation:** Minimal — SQLite CHECK constraints on enums; no request schema validation library (no Zod/Joi)

**Authentication:** Password-only, stored in `settings` table; role checked client-side from `localStorage`; no JWT or session tokens

**Timezone:** Israel timezone (`Asia/Jerusalem`) used explicitly in all date/time calculations via `Intl.DateTimeFormat`; `server/utils/dateUtils.js` provides `getCurrentTimestampIsrael()`

**Internationalisation:** Server-side via i18next (`server/services/i18n.js`) loading JSON files from `src/locales/{lng}/{ns}.json`; supported languages: `he`, `en`, `ru`, `ar`, `hi`, `ml`

---

*Architecture analysis: 2026-03-09*
