# Codebase Concerns

**Analysis Date:** 2026-03-09

---

## Security Considerations

**No API Authentication on Any Route:**
- Risk: Every API endpoint (`/api/tasks`, `/api/employees`, `/api/whatsapp/send`, etc.) is completely unauthenticated. Any actor who can reach the server can read all data, send WhatsApp messages, delete tasks, and wipe the database.
- Files: `server/index.js`, `server/routes/tasks.js`, `server/routes/whatsapp.js`, `server/routes/employees.js` — all routes
- Current mitigation: None server-side. Client login is localStorage-only (see below).
- Recommendations: Add a middleware auth check (even a simple shared secret header) to all API routes before any production-scale deployment.

**Client-Side-Only Authentication:**
- Risk: "Authentication" is just a boolean in `localStorage`. Clearing localStorage or hitting the API directly bypasses all access control.
- Files: `client/src/context/AppContext.jsx` lines 20–27, `client/src/config.js`
- Current mitigation: None. The server accepts all requests regardless of auth state.
- Recommendations: Issue a server-side session token on login; validate it in API middleware.

**Wildcard CORS on Both HTTP and Socket.IO:**
- Risk: `origin: "*"` allows any website to make cross-origin requests to the API and establish Socket.IO connections.
- Files: `server/index.js` lines 44–48 (Socket.IO), line 51 (`app.use(cors())`)
- Recommendations: Restrict to known frontend origins in production.

**Custom .env Parser Breaks on Values Containing `=`:**
- Risk: The custom `.env` loader splits on the first `=` using `line.split('=')`, which gives an array — if a value contains `=` (common in base64 API keys), `value` becomes the second element only, silently truncating the key. This could cause silent auth failures for `GEMINI_API_KEY` or `GOOGLE_TRANSLATE_API_KEY`.
- Files: `server/index.js` lines 28–36
- Recommendations: Replace with `dotenv` package (`require('dotenv').config()`).

**WhatsApp Bulk Send: Task IDs from Untrusted Client Payload:**
- Risk: The `/api/whatsapp/send-bulk` endpoint accepts `tasksByEmployee` from the client body (including `task.id` arrays). These IDs are used in a DB `UPDATE ... WHERE id IN (...)` with parameterized values — safe from injection — but a malicious caller could mark arbitrary task IDs as `'sent'` that belong to other employees.
- Files: `server/routes/whatsapp.js` lines 288–291
- Current mitigation: IDs are passed as bound parameters (no SQL injection risk), but no ownership check.

---

## Tech Debt

**Duplicate `/api/billing` Route Registration:**
- Issue: `require('./routes/billing')` is registered twice on `app.use('/api/billing', ...)`.
- Files: `server/index.js` lines 108 and 119
- Impact: The second registration silently shadows the first. Express will match the first route handler found — currently harmless only because they are the same module, but confusing and fragile.
- Fix approach: Remove the duplicate `app.use('/api/billing', ...)` at line 119.

**Migration Logic Inline in `initializeDatabase()`:**
- Issue: All schema migrations (12+ `ALTER TABLE` try/catch blocks, full table recreations for tasks and employees) live inside the single `initializeDatabase()` function in `server/database/schema.js`. This function is 796 lines. There is no migration versioning or tracking — every migration re-executes on every server start and relies on catching "duplicate column" errors.
- Files: `server/database/schema.js` lines 73–714
- Impact: Adding new migrations risks interfering with existing ones; difficult to audit what schema version is running; the `employees` table recreation (lines 128–156) runs inside a multi-statement `db.exec` block that bypasses the per-statement error handling.
- Fix approach: Adopt a migration library (e.g., `better-sqlite3-migrations` or `knex`) with versioned migration files.

**`dailyScheduleSender.js` Has a Hardcoded Test Phone and `TEST_MODE = true`:**
- Issue: `TEST_MODE` is hardcoded to `true` and `TEST_PHONE` is hardcoded to a specific number (`+972587400300`). The daily schedule sender will never reach real employees until this is manually changed in source code.
- Files: `server/services/dailyScheduleSender.js` lines 8–9
- Impact: The automated daily schedule feature is effectively disabled in the current codebase; deploying as-is would send all schedule messages only to the test number.
- Fix approach: Move `TEST_MODE` and `TEST_PHONE` to environment variables; default `TEST_MODE` to `false`.

**`dailyScheduleSender.js` Queries Non-Existent `is_active` Column:**
- Issue: The query at line 64–70 filters `WHERE is_active = 1`, but the `employees` table schema (checked in `server/database/schema.js`) has no `is_active` column. SQLite will return zero rows silently for every daily schedule run.
- Files: `server/services/dailyScheduleSender.js` line 64, `server/database/schema.js` (employees CREATE TABLE)
- Impact: The daily schedule sender sends to no employees (zero rows returned), which masks the underlying bug.
- Fix approach: Either add `is_active` column to employees schema + migration, or remove the filter until the feature is implemented.

**Recurring Task Spawn Logic Duplicated Across Three Places:**
- Issue: The logic that creates the next recurring task instance after completion is copy-pasted verbatim in three separate handlers: `PUT /:id/status` (lines 637–700), `POST /:id/approve` (lines 137–193), and inside task creation (lines 312–414).
- Files: `server/routes/tasks.js`
- Impact: A fix to recurring logic must be applied in all three locations or behavior diverges. This has already led to the `approve` path not inheriting `estimated_duration_minutes`, `location_id`, or `building_id` when spawning next instances (those INSERT statements at lines 157–159 and 661–663 omit those fields).
- Fix approach: Extract recurring-instance creation into a shared helper in `server/services/taskService.js`.

**Recurring Task DELETE /series Uses Title+Employee+Frequency as Key:**
- Issue: `DELETE /:id/series` identifies the series by matching `title`, `employee_id`, and `frequency` — not by a series ID or `parent_task_id`. Renaming a task title or assigning it to a different employee will orphan the other instances.
- Files: `server/routes/tasks.js` lines 728–749
- Fix approach: Add a `series_id` column (UUID generated at task creation) and match on that.

**AppContext Fetches All Attachments Per Task in N+1 Pattern:**
- Issue: `fetchTasks()` in `AppContext.jsx` fetches the full task list then makes one additional HTTP request per task to fetch its attachments: `tasksData.map(async (task) => fetch(.../{task.id}/attachments))`. For 100 tasks this is 101 HTTP requests on every page load and every socket event that triggers a refresh.
- Files: `client/src/context/AppContext.jsx` lines 147–160, and again on `task:updated` at lines 67–76
- Impact: Slow load times, high server load. The server already returns attachments inline in `GET /api/tasks` and `GET /api/tasks/today`, making the client fetches redundant.
- Fix approach: Remove the per-task attachment fetch in the client; rely on the attachments already embedded in the task response from the server.

**AppContext is a 560-line God Context:**
- Issue: All application state — tasks, employees, systems, suppliers, locations, buildings, tenants, WhatsApp state, auth, and Socket.IO — is managed in a single React context with 40+ exported values.
- Files: `client/src/context/AppContext.jsx`
- Impact: Any component consuming the context re-renders when any piece of state changes. Adding features requires editing this single file. Testing individual features requires mocking the entire context.
- Fix approach: Split into domain-specific contexts or adopt Zustand/React Query for server state.

**`updateTask` and `addTask` in AppContext Re-fetch All Tasks After Mutation:**
- Issue: After every mutation (add, update, delete, status change, star toggle), the client calls `fetchTasks()` which re-fetches the entire task list plus attachments. Real-time updates via Socket.IO also trigger `fetchTasks()`. This creates redundant double-fetches after mutations.
- Files: `client/src/context/AppContext.jsx` lines 164–203
- Fix approach: Optimistically update local state on mutation; let Socket.IO events serve as the source of truth for remote changes.

---

## Known Bugs

**`send-bulk` Translates Using Client-Sent `language` Instead of DB `language`:**
- Symptoms: Task titles/descriptions are translated using the `language` field from the client payload, but the DB language is fetched separately for the i18n strings. If the client sends a stale or default language, translations will be in the wrong language even though the greeting is correct.
- Files: `server/routes/whatsapp.js` lines 233, 258 (uses `language` from destructured data, not `employeeLanguage` from DB)
- Trigger: Sending to an employee whose client-provided language doesn't match their DB record.
- Fix: Replace `language` with `employeeLanguage` in the translation calls at lines 233 and 258.

**Recurring Task Next-Instance Spawn Loses `estimated_duration_minutes`, `location_id`, `building_id`:**
- Symptoms: When a recurring task is completed or approved, the next instance is created without `estimated_duration_minutes`, `location_id`, or `building_id`, so those fields revert to defaults (30 minutes, null, null).
- Files: `server/routes/tasks.js` lines 157–159 (approve path), 661–663 (status path)
- Trigger: Complete or approve any recurring task that has a non-default duration or location assigned.

**`deliveryStatus` Not Tracked After Bulk Send:**
- Symptoms: The `form_dispatches` table has `delivery_status` and `delivery_error` columns, but the bulk WhatsApp send in `whatsapp.js` updates task status to `sent` but never updates `delivery_status` in `form_dispatches`. The dispatch record stays at `queued` indefinitely.
- Files: `server/routes/whatsapp.js` lines 287–292

---

## Performance Bottlenecks

**Employee Stats: N+1 Queries in `GET /api/employees`:**
- Problem: For each employee in the result set, a second heavy aggregation SQL query runs synchronously to calculate stats. With 50 employees this is 51 synchronous DB queries per request.
- Files: `server/routes/employees.js` lines 16–83
- Cause: Stats are computed per-employee inside a `.map()` loop using `db.prepare(...).get(employee.id)`.
- Improvement path: Use a single SQL query with `GROUP BY employee_id` to aggregate all stats in one pass.

**`GET /api/tasks` Fetches All Tasks + All Attachments:**
- Problem: The endpoint fetches every task from the database (no pagination), then fetches all attachments and joins them in-memory. As the dataset grows this will become slow.
- Files: `server/routes/tasks.js` lines 24–58
- Improvement path: Add pagination (`LIMIT`/`OFFSET`) or cursor-based pagination; use a JOIN instead of fetching all attachments and grouping in JS.

**WhatsApp Bulk Send is Sequential with 1-Second Delays:**
- Problem: Messages are sent one at a time with a hardcoded `setTimeout(1000)` between each. For 20 employees this adds 20+ seconds of minimum send time, all blocking a single HTTP request that the client waits on.
- Files: `server/services/whatsapp.js` lines 553–554
- Improvement path: Return immediately, process sends in background, report progress via Socket.IO.

---

## Fragile Areas

**WhatsApp Client Uses Puppeteer/Chromium in the Main Server Process:**
- Files: `server/services/whatsapp.js`, `server/index.js`
- Why fragile: `whatsapp-web.js` runs a headless Chrome browser in the same process as the Express server. A Puppeteer crash (frame detachment, OOM, protocol error) can destabilize the entire server. Global `uncaughtException` and `unhandledRejection` handlers plus a `setInterval` keepalive were added specifically to work around this.
- Safe modification: Never modify `initialize()` without testing reconnect, auth failure, and disconnect paths. The polling workaround (`startReadyPolling`) runs every 5 seconds and interacts with client state — changes to the client lifecycle can break it silently.
- Test coverage: No automated tests exist for the WhatsApp service.

**Schema Migrations Run on Every Server Start Without Versioning:**
- Files: `server/database/schema.js`
- Why fragile: All migrations are guarded only by catching "duplicate column" SQLite errors. If a future migration modifies an existing column type or drops a column, it will silently do nothing (because the `CREATE TABLE IF NOT EXISTS` guard will prevent re-creation), or it will apply every restart if the guard condition matches again. The employees-table recreation (lines 128–156) uses a multi-statement `db.exec` inside a `BEGIN TRANSACTION` — if the server crashes mid-migration, the DB may be left in a partial state with `employees` dropped and `employees_new` not yet renamed.
- Safe modification: Never add a migration that can partially fail without a corresponding rollback.

**Task Confirmation Token Stored as JSON String Array in `task_ids` Column:**
- Files: `server/database/schema.js` (task_confirmations table), `server/index.js` lines 163–178, `server/routes/taskConfirmation.js`
- Why fragile: Task IDs are stored as a JSON-stringified array in a `TEXT` column. They are parsed with `JSON.parse(confirmation.task_ids)` and then interpolated into `WHERE t.id IN (...)` with `?` placeholders. If `task_ids` is ever corrupted or manually edited in the DB, the `JSON.parse` throws an unhandled exception that returns a 500 HTML page to the employee.
- Safe modification: Always `JSON.parse` inside a try/catch; consider a junction table instead.

---

## Missing Critical Features

**No Rate Limiting on Any Endpoint:**
- Problem: There is no rate limiting on any API route, including sensitive operations like `/api/whatsapp/send`, `/api/data/clear`, and the task confirmation acknowledgement endpoint.
- Blocks: Without rate limiting, a misconfigured client loop or bot can flood WhatsApp sends, drain translation quotas, or DOS the SQLite database.

**No Input Validation / Sanitization Library:**
- Problem: Route handlers check only for presence of required fields (e.g., `if (!title || !start_date)`). There is no validation of field types, lengths, or content. Long strings can be inserted into TEXT columns without limit; `system_id`, `employee_id` integers are passed directly to SQL without type coercion checks.
- Files: All route files under `server/routes/`

---

## Test Coverage Gaps

**Server Routes: Zero Automated Tests:**
- What's not tested: All business logic in `server/routes/tasks.js`, `server/routes/whatsapp.js`, `server/routes/employees.js`, recurring task scheduling, rollover, auto-close, and daily schedule sender.
- Files: `server/routes/`, `server/services/`
- Risk: Regressions in core task lifecycle (complete → spawn next instance, auto-close, rollover) go undetected until manual observation.
- Priority: High

**WhatsApp Service: Zero Automated Tests:**
- What's not tested: `sendMessage`, `sendBulkMessages`, reconnection logic, polling workaround, phone number normalization.
- Files: `server/services/whatsapp.js`
- Risk: Changes to normalization or LID fallback logic break silently; detected only when real messages fail to deliver.
- Priority: High

**Client Context / Data Flow: Zero Unit Tests:**
- What's not tested: `AppContext.jsx` mutations, Socket.IO event handlers, auth state transitions.
- Files: `client/src/context/AppContext.jsx`
- Risk: State management bugs (double-fetch, stale state after bulk update) are only caught during manual QA.
- Priority: Medium

**E2E Tests Are Fragile and Scope-Limited:**
- What's not tested: HQ flows, billing, forms dispatch, WhatsApp connection UI, multi-employee bulk send, history filtering.
- Files: `client/e2e/eden.spec.js`, `e2e/auth.spec.js`, `e2e/tasks.spec.js`
- Risk: No automated coverage for recently added features (forms, HQ dispatch, rollover).
- Priority: Medium

---

## Scaling Limits

**SQLite Single-File Database:**
- Current capacity: Adequate for single-tenant use with hundreds of tasks. All writes are serialized.
- Limit: SQLite's WAL mode allows concurrent reads but only one writer at a time. Under high write load (bulk send updating many task statuses simultaneously, auto-close running, rollover running) lock contention will emerge.
- Scaling path: Migrate to PostgreSQL if multi-tenant or high-frequency write use cases emerge.

**WhatsApp Session Tied to One Server Instance:**
- Current capacity: One active WhatsApp session per deployment.
- Limit: Cannot horizontally scale (multiple server instances) because the WhatsApp session + Puppeteer Chrome are in-process and use local file auth (`LocalAuth` with `dataPath`).
- Scaling path: Extract WhatsApp into a dedicated microservice with a shared persistent volume.

---

*Concerns audit: 2026-03-09*
