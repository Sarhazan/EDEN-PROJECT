# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Environment Variable Management:**
- Issue: Custom `.env` file parser instead of using standard dotenv library
- Files: `c:\dev\projects\claude projects\eden claude\server\index.js` (lines 7-17)
- Impact: Non-standard parsing may miss edge cases (quoted values, comments, multi-line values), harder to maintain
- Fix approach: Replace with `dotenv` package - `npm install dotenv` and use `require('dotenv').config()`

**Hardcoded Network IP Addresses:**
- Issue: Multiple environment files and code contain hardcoded local IP addresses (192.168.1.35)
- Files:
  - `c:\dev\projects\claude projects\eden claude\server\.env` (PORT, CLIENT_URL, API_URL)
  - `c:\dev\projects\claude projects\eden claude\server\index.js` (line 64)
  - `c:\dev\projects\claude projects\eden claude\server\services\htmlGenerator.js` (line 27)
- Impact: Breaks when network changes, not portable across environments/developers
- Fix approach: Use environment-based configuration with fallbacks, remove hardcoded IPs from code

**No Error Boundary in React:**
- Issue: React app lacks error boundaries to catch component errors
- Files: `c:\dev\projects\claude projects\eden claude\client\src\App.jsx`
- Impact: Component errors crash entire app instead of graceful degradation
- Fix approach: Add ErrorBoundary component wrapping main app

**Console.log Debugging Left in Production:**
- Issue: 90+ console.log/error/warn statements throughout codebase
- Files: Extensive logging in `server\services\whatsapp.js`, `server\routes\whatsapp.js`, `server\services\htmlGenerator.js`, and 8 other files
- Impact: Performance overhead, exposes implementation details, clutters production logs
- Fix approach: Replace with proper logging library (winston/pino) with log levels, remove debug statements

**Global Singleton Pattern for Services:**
- Issue: WhatsApp service and HTML generator use module-level singletons without dependency injection
- Files:
  - `c:\dev\projects\claude projects\eden claude\server\services\whatsapp.js` (line 183)
  - `c:\dev\projects\claude projects\eden claude\server\services\htmlGenerator.js` (line 123)
- Impact: Difficult to test, impossible to have multiple instances, tight coupling
- Fix approach: Export class constructors and instantiate in routes with proper DI

**No API Rate Limiting:**
- Issue: No rate limiting on any endpoints including bulk WhatsApp send
- Files: `c:\dev\projects\claude projects\eden claude\server\index.js`
- Impact: Vulnerable to abuse, could spam WhatsApp messages, no protection against DoS
- Fix approach: Add `express-rate-limit` middleware, especially on `/api/whatsapp/send-bulk`

**Git Operations in Application Code:**
- Issue: HTML generator executes git commands synchronously in request handlers
- Files: `c:\dev\projects\claude projects\eden claude\server\services\htmlGenerator.js` (lines 63-93)
- Impact: Blocks event loop during git operations (add, commit, push, vercel deploy), single point of failure if git unavailable
- Fix approach: Move to background job queue (Bull/BullMQ), decouple file generation from git operations

## Known Bugs

**Environment Variable Mismatch:**
- Symptoms: Client and server have different API_URL defaults
- Files:
  - `c:\dev\projects\claude projects\eden claude\client\.env` (VITE_API_URL=http://localhost:3001)
  - `c:\dev\projects\claude projects\eden claude\server\.env` (API_URL=http://192.168.1.35:3001)
- Trigger: Running client and server separately with default configs
- Workaround: Manually ensure both .env files match

**Incomplete Error Handling in Context:**
- Symptoms: API fetch errors only log to console, no user feedback
- Files: `c:\dev\projects\claude projects\eden claude\client\src\context\AppContext.jsx` (lines 36-40, 256-262)
- Trigger: Network failure or API error during data fetch
- Workaround: None - errors silently fail

**WhatsApp QR Code 30-Second Timeout:**
- Symptoms: QR code request times out after 30 seconds if client not initialized
- Files: `c:\dev\projects\claude projects\eden claude\server\services\whatsapp.js` (lines 124-130)
- Trigger: Slow Puppeteer initialization or browser startup
- Workaround: User must retry connection

## Security Considerations

**.env Files Committed in Server Directory:**
- Risk: Environment files with sensitive configuration are present in repository
- Files:
  - `c:\dev\projects\claude projects\eden claude\server\.env`
  - `c:\dev\projects\claude projects\eden claude\client\.env`
- Current mitigation: Files in .gitignore but already exist in working directory
- Recommendations: Audit git history to ensure no secrets committed, use .env.example templates only

**No Authentication/Authorization:**
- Risk: All API endpoints are completely open, anyone can CRUD all data
- Files: All routes in `c:\dev\projects\claude projects\eden claude\server\routes\`
- Current mitigation: None
- Recommendations: Implement authentication middleware, add user roles, protect sensitive endpoints

**SQL Injection via Template Strings:**
- Risk: Database queries use template strings which could allow SQL injection
- Files: All routes using `db.prepare()` with string interpolation
- Current mitigation: Using prepared statements (`db.prepare().all(param)`) which are safe
- Recommendations: Current approach is secure - continue using parameterized queries

**Task Confirmation Token Predictability:**
- Risk: Tokens generated with crypto.randomBytes(32) but no HMAC validation
- Files:
  - `c:\dev\projects\claude projects\eden claude\server\routes\whatsapp.js` (line 191)
  - `c:\dev\projects\claude projects\eden claude\server\routes\taskConfirmation.js`
- Current mitigation: 32-byte random tokens provide 2^256 possible values
- Recommendations: Add token expiration enforcement (currently stored but not validated), add HMAC signing

**No HTTPS in Production:**
- Risk: No SSL/TLS configuration visible
- Files: `c:\dev\projects\claude projects\eden claude\server\index.js`
- Current mitigation: Likely handled by reverse proxy/Vercel
- Recommendations: Document SSL termination strategy, enforce HTTPS redirects

**WhatsApp Session Data Exposed:**
- Risk: 88MB .wwebjs_auth directory stores WhatsApp authentication locally
- Files: `c:\dev\projects\claude projects\eden claude\server\.wwebjs_auth\` (entire directory)
- Current mitigation: Directory in .gitignore
- Recommendations: Encrypt session data at rest, implement session rotation, add backup/recovery mechanism

## Performance Bottlenecks

**Synchronous Git Operations Block Event Loop:**
- Problem: execSync blocks Node.js for git add/commit/push/vercel deploy
- Files: `c:\dev\projects\claude projects\eden claude\server\services\htmlGenerator.js` (lines 68-88)
- Cause: Using child_process.execSync in async request handler
- Improvement path: Use async exec or spawn, move to job queue, return immediately and process async

**60-Second Polling Wait for Vercel Deployment:**
- Problem: Each WhatsApp message send waits up to 60 seconds for Vercel URL to become available
- Files: `c:\dev\projects\claude projects\eden claude\server\routes\whatsapp.js` (lines 222-228, polling at 3s intervals)
- Cause: Synchronous wait in request handler (20 attempts × 3000ms = 60s max)
- Improvement path: Pre-generate static pages and deploy separately, use webhooks for deployment confirmation, use CDN with immediate availability

**Fetch All Data on Every Mount:**
- Problem: AppContext fetches all tasks/systems/employees/suppliers/locations on every app mount
- Files: `c:\dev\projects\claude projects\eden claude\client\src\context\AppContext.jsx` (lines 20-41)
- Cause: No caching, pagination, or incremental loading
- Improvement path: Implement pagination, add query params for filtering server-side, use React Query for caching

**N+1 Queries in Bulk Send:**
- Problem: Sequential task status updates in loop during bulk send
- Files: `c:\dev\projects\claude projects\eden claude\client\src\pages\MyDayPage.jsx` (lines 111-113)
- Cause: For loop with await on each individual updateTaskStatus call
- Improvement path: Batch update API endpoint, use Promise.all for parallel updates

**Large Component Re-renders:**
- Problem: MyDayPage.jsx is 761 lines with multiple useMemo dependencies causing frequent recalculations
- Files: `c:\dev\projects\claude projects\eden claude\client\src\pages\MyDayPage.jsx`
- Cause: Complex statistics calculations re-run on every task/date change
- Improvement path: Split into smaller components, memoize expensive calculations separately, consider server-side aggregation

## Fragile Areas

**WhatsApp Client Lifecycle Management:**
- Files: `c:\dev\projects\claude projects\eden claude\server\services\whatsapp.js`
- Why fragile: Complex state machine (initialized/authenticated/ready), singleton instance, puppeteer dependencies, disconnection handling
- Safe modification: Always check isReady before operations, add integration tests for connection lifecycle, implement reconnection strategy
- Test coverage: No tests detected

**Recurring Task Generation Logic:**
- Files: `c:\dev\projects\claude projects\eden claude\server\routes\tasks.js` (lines 95+)
- Why fragile: Complex date calculations for daily/weekly/monthly/annual recurrence, timezone handling, edge cases around month boundaries
- Safe modification: Add comprehensive date tests, validate against date-fns edge cases, add dry-run validation
- Test coverage: No tests detected

**Task Confirmation Token System:**
- Files:
  - `c:\dev\projects\claude projects\eden claude\server\routes\taskConfirmation.js`
  - `c:\dev\projects\claude projects\eden claude\server\database\schema.js` (lines 102-115)
- Why fragile: Token storage, expiration checking, task_ids as JSON string, foreign key cascade deletes
- Safe modification: Test token expiration thoroughly, validate JSON parsing, ensure cascade deletes don't orphan tasks
- Test coverage: No tests detected

**HTML Template Replacement:**
- Files: `c:\dev\projects\claude projects\eden claude\server\services\htmlGenerator.js` (lines 30-36)
- Why fragile: Simple string replace for template variables - breaks if placeholder format changes or appears in content
- Safe modification: Use proper templating engine (Handlebars/EJS), validate template before replacement
- Test coverage: No tests detected

## Scaling Limits

**SQLite Concurrent Write Limitations:**
- Current capacity: Single writer, ~1000 writes/sec theoretical
- Limit: Concurrent bulk sends or task updates will serialize/lock
- Scaling path: Migrate to PostgreSQL/MySQL for write concurrency, add write queue, implement optimistic locking

**88MB WhatsApp Session Storage:**
- Current capacity: Local filesystem storage
- Limit: Single server instance, no replication, lost on server restart/crash
- Scaling path: Store session in encrypted blob storage (S3), implement session persistence service, add multi-instance support

**Git Repository as Static File Host:**
- Current capacity: Docs folder accumulating HTML files indefinitely
- Limit: Repository bloat (git clone times increase), GitHub file size limits (1GB repo warning)
- Scaling path: Use proper static hosting (S3/Cloudflare R2), implement cleanup of old files (<30 days), separate content repo from code repo

**No Database Connection Pooling:**
- Current capacity: Single better-sqlite3 connection
- Limit: Only one connection for all requests, blocking operations serialize
- Scaling path: SQLite doesn't pool - must migrate to client-server DB (Postgres) with connection pooling

**In-Memory QR Code Callback Queue:**
- Current capacity: Array of callbacks in memory
- Limit: Lost on server restart, no persistence, grows unbounded if QR codes generated but not consumed
- Scaling path: Use Redis for callback storage, add TTL cleanup, implement max queue size

## Dependencies at Risk

**whatsapp-web.js Unofficial Library:**
- Risk: Unofficial WhatsApp Web API wrapper, breaks when WhatsApp changes web client
- Impact: Core feature (WhatsApp integration) completely breaks
- Migration plan: Monitor project actively, have fallback to official WhatsApp Business API, implement circuit breaker for WhatsApp failures

**better-sqlite3 Native Dependency:**
- Risk: Requires compilation for specific Node.js version and OS
- Impact: Deployment failures on version mismatches, platform-specific builds
- Migration plan: Pre-build for target platforms, consider pure JavaScript alternative (sql.js) or PostgreSQL

**React 19.2.0 (Very New):**
- Risk: Using latest major version may have undiscovered bugs or ecosystem incompatibility
- Impact: Package updates might break, fewer Stack Overflow answers
- Migration plan: Pin versions strictly, test updates in staging, consider dropping to React 18 LTS

**Puppeteer Transitive Dependency:**
- Risk: Large Chromium download (~300MB), headless browser for WhatsApp Web automation
- Impact: Slow deployments, large container images, high memory usage
- Migration plan: Optimize Docker layers to cache Chromium, consider lighter alternatives

## Missing Critical Features

**No Backup System:**
- Problem: SQLite database has no automated backups
- Blocks: Data loss recovery, rollback capability
- Priority: High

**No Test Suite:**
- Problem: Zero unit/integration/e2e tests detected
- Blocks: Safe refactoring, regression prevention, confidence in changes
- Priority: High

**No Logging Infrastructure:**
- Problem: Console.log only, no log aggregation or monitoring
- Blocks: Production debugging, error tracking, audit trails
- Priority: Medium

**No Job Queue:**
- Problem: Long-running tasks (git push, Vercel deploy) block request threads
- Blocks: Scalability, reliability, proper async processing
- Priority: High

**No Database Migrations System:**
- Problem: Schema changes use try/catch ALTER TABLE (lines 62-73 in schema.js)
- Blocks: Safe schema evolution, version tracking, rollback capability
- Priority: Medium

## Test Coverage Gaps

**WhatsApp Integration:**
- What's not tested: QR code generation, message sending, authentication flow, disconnection handling
- Files: `c:\dev\projects\claude projects\eden claude\server\services\whatsapp.js`, `c:\dev\projects\claude projects\eden claude\server\routes\whatsapp.js`
- Risk: Breaking changes undetected, race conditions in state machine
- Priority: High

**Recurring Task Generation:**
- What's not tested: Date calculations for all frequency types, weekly_days parsing, timezone edge cases
- Files: `c:\dev\projects\claude projects\eden claude\server\routes\tasks.js`
- Risk: Incorrect task scheduling, duplicate tasks, missing tasks
- Priority: High

**Bulk WhatsApp Send Workflow:**
- What's not tested: End-to-end flow including HTML generation, git operations, URL polling, message delivery
- Files: `c:\dev\projects\claude projects\eden claude\server\routes\whatsapp.js` (lines 143-294)
- Risk: Partial sends, data inconsistency, timeout failures
- Priority: High

**React Context State Management:**
- What's not tested: CRUD operations, optimistic updates, error handling
- Files: `c:\dev\projects\claude projects\eden claude\client\src\context\AppContext.jsx`
- Risk: State corruption, memory leaks, race conditions
- Priority: Medium

**Database Schema Migrations:**
- What's not tested: Schema evolution, foreign key constraints, cascade deletes
- Files: `c:\dev\projects\claude projects\eden claude\server\database\schema.js`
- Risk: Data loss on schema changes, orphaned records
- Priority: Medium

**Task Confirmation Token Flow:**
- What's not tested: Token generation, expiration validation, acknowledgment persistence
- Files: `c:\dev\projects\claude projects\eden claude\server\routes\taskConfirmation.js`
- Risk: Unauthorized access, expired tokens working, token reuse
- Priority: High

---

*Concerns audit: 2026-01-19*
