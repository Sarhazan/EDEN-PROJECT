# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**WhatsApp Web:**
- WhatsApp Web API via whatsapp-web.js library
  - SDK/Client: `whatsapp-web.js` v1.34.4 with Puppeteer
  - Auth: QR code authentication, session stored in `.wwebjs_auth/`
  - Implementation: `server/services/whatsapp.js` (singleton service)
  - Features: Send messages, authentication status, QR code generation
  - Phone format: Israeli numbers (972 country code)

**TinyURL:**
- URL shortening service
  - Endpoint: `https://tinyurl.com/api-create.php`
  - Usage: `server/routes/whatsapp.js` line 32-39
  - Auth: None (public API)
  - Purpose: Shorten task confirmation URLs for WhatsApp messages

**GitHub:**
- Used for deployment automation
  - Purpose: Push generated HTML task pages to repository
  - Implementation: `server/services/htmlGenerator.js` lines 63-94
  - Operations: `git add`, `git commit`, `git push` via `execSync`
  - Files committed: `docs/task-*.html` files

**Vercel:**
- Static site deployment platform
  - SDK/Client: Vercel CLI (invoked via `execSync`)
  - Deployment: Automated via `server/services/htmlGenerator.js` line 87
  - Config: `vercel.json` (static HTML builds)
  - Environment: `VERCEL_PROJECT_URL` for base URL
  - Purpose: Host task confirmation pages publicly

## Data Storage

**Databases:**
- SQLite (local file-based)
  - Connection: File path at `maintenance.db` (root directory)
  - Client: better-sqlite3 v12.6.0
  - Schema: `server/database/schema.js`
  - Tables: tasks, systems, employees, suppliers, locations, task_confirmations
  - Foreign keys: Enabled via pragma

**File Storage:**
- Local filesystem
  - Uploads: `server/uploads/` directory (for location images)
  - Static serving: Express static middleware line 25 in `server/index.js`
  - Generated HTML: `docs/` directory (task confirmation pages)
  - WhatsApp session: `.wwebjs_auth/` directory

**Caching:**
- None (no Redis, Memcached, or similar)

## Authentication & Identity

**Auth Provider:**
- Custom (no external provider)
  - Implementation: No user authentication detected in codebase
  - WhatsApp auth: Separate QR-based authentication for WhatsApp client

**Task Confirmation:**
- Token-based confirmation system
  - Tokens: 32-byte hex strings (crypto.randomBytes)
  - Storage: `task_confirmations` table in SQLite
  - Expiry: 30 days from creation
  - URL format: `{baseUrl}/task-{token}.html`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Rollbar, etc.)

**Logs:**
- Console logging only
  - Server: `console.log`, `console.error` throughout
  - Client: Browser console
  - No centralized logging service

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured
  - Production mode: Server serves static client from `client/dist/` (line 43-50 in `server/index.js`)
  - Vercel: Used for static HTML pages only (not full app)

**CI Pipeline:**
- None (no GitHub Actions, Travis, CircleCI detected)
- Manual deployment via git commands in `server/services/htmlGenerator.js`

## Environment Configuration

**Required env vars:**
- `PORT` - Server listening port (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `VITE_API_URL` - API URL for Vite build (e.g., http://localhost:3001)
- `API_URL` - API URL for task HTML templates (e.g., http://192.168.1.35:3001)
- `VERCEL_PROJECT_URL` - Vercel project URL (fallback: GitHub Pages)

**Secrets location:**
- `.env` file in server directory (not committed, see `.gitignore`)
- Example provided in `.env.example`
- No secrets manager (Vault, AWS Secrets Manager, etc.)

## Webhooks & Callbacks

**Incoming:**
- Task confirmation endpoint
  - Route: `/api/confirm/:token` in `server/routes/taskConfirmation.js`
  - Purpose: Employees acknowledge receipt of tasks via confirmation page
  - Method: POST with token in URL path
  - Updates: `task_confirmations` table, sets `is_acknowledged` and `acknowledged_at`

**Outgoing:**
- None (no webhooks sent to external services)

## Network Configuration

**Development:**
- Server: Listens on `0.0.0.0:3001` (all network interfaces)
- Client: Vite dev server on `0.0.0.0:5173`
- CORS: Enabled for all origins (`cors()` middleware without restrictions)

**API Communication:**
- Client to server: REST API via fetch/axios
- Base URL: Configured via `VITE_API_URL` or defaults to localhost:3001
- Context: `client/src/context/AppContext.jsx` lines 5-7

---

*Integration audit: 2026-01-19*
