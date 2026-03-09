# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**WhatsApp Messaging:**
- WhatsApp Web (via `whatsapp-web.js`) - Sends task assignment and daily schedule messages to employees' phones
  - SDK/Client: `whatsapp-web.js` `^1.34.4` + `puppeteer-core` `^24.36.0`
  - Auth: Session-based via `LocalAuth` (stores session in `.wwebjs_auth_<env>/`)
  - Production Chromium: `@sparticuz/chromium` `^143.0.4`
  - Implementation: `server/services/whatsapp.js` (singleton `WhatsAppService`)
  - Real-time status events emitted over Socket.IO: `whatsapp:qr`, `whatsapp:ready`, `whatsapp:authenticated`, `whatsapp:disconnected`, `whatsapp:loading`, `whatsapp:auth_failure`
  - Dev safeguard: `DEV_ONLY_PHONE` env var restricts sends to a single number in non-production

**Google Gemini AI (Translation - Primary):**
- Used to translate task content from Hebrew to employee language (en, ru, ar, hi, ml, etc.)
  - SDK/Client: `@google/generative-ai` `^0.24.1`
  - Model: `gemini-1.5-flash`
  - Auth: `GEMINI_API_KEY` env var
  - Free tier: 15 req/min, 1,500 req/day
  - Implementation: `server/services/translation.js` (`TranslationService._translateWithGemini`)

**Google Cloud Translation API (Translation - Paid Fallback):**
- Fallback when Gemini quota is exceeded
  - SDK/Client: `@google-cloud/translate` `^9.3.0`
  - Auth: `GOOGLE_TRANSLATE_API_KEY` (API key) OR `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON path)
  - API key can also be stored in the SQLite `settings` table (key: `google_translate_api_key`) and loaded at runtime
  - Implementation: `server/services/translation.js` (`TranslationService._translateWithGoogleTranslate`)
  - Runtime update: `POST /api/accounts/google-translate/connect`

**TinyURL (URL Shortening):**
- Shortens WhatsApp confirmation page links before sending
  - API: `https://tinyurl.com/api-create.php` (free, no auth required)
  - HTTP Client: `axios`
  - Toggle: `URL_SHORTENER_ENABLED` env var (default enabled)
  - Implementation: `server/services/urlShortener.js`

## Data Storage

**Database:**
- SQLite (via `better-sqlite3`)
  - File: `maintenance.db` at project root (dev), or path set by `DB_PATH` env var (production Railway Volume)
  - Schema initialised/migrated at startup: `server/database/schema.js`
  - Tables: `systems`, `employees`, `tasks`, `task_confirmations`, `settings`, `locations`, `buildings`, `tenants`, `charges`, `suppliers`, `distribution_lists`, `distribution_list_members`, and more
  - Foreign keys enabled via `PRAGMA foreign_keys = ON`
  - No ORM — raw SQL with `better-sqlite3` prepared statements throughout `server/routes/` and `server/services/`

**File Storage:**
- Local filesystem only
  - Uploaded photos: `uploads/` directory at project root
  - Generated HTML confirmation pages: `docs/` directory (also served statically)
  - On Railway: files are ephemeral unless a persistent Volume is mounted
  - Served via Express static middleware: `/uploads` and `/docs` routes

**Caching:**
- No external cache (Redis, Memcached, etc.)
- In-memory only: WhatsApp service caches known contact chat IDs in a `Map` (`whatsappService.knownContactChatIds`)

## Authentication & Identity

**Auth Provider:**
- Custom (no third-party auth service)
  - Role-based: `authRole` stored in `localStorage` on client
  - Roles observed: regular user (`isAuthenticated`) and HQ (`authRole` = hq)
  - Login pages: `client/src/pages/LoginPage.jsx`, `client/src/pages/HQLoginPage.jsx`
  - Auth state key constants: `client/src/config.js` (`LS_KEYS.IS_AUTHENTICATED`, `LS_KEYS.AUTH_ROLE`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)
- Global uncaught exception and unhandled rejection handlers log to console and keep the server alive (`server/index.js` lines 10-20)

**Logs:**
- `console.log` / `console.error` throughout — no structured logging library
- Railway/Render collect stdout logs in their dashboards

## CI/CD & Deployment

**Hosting:**
- Primary: Railway — `railway.json` uses Nixpacks builder; `nixpacks.toml` provisions Node 20 + Chromium
- Alternative: Render — `render.yaml` defines web service (Frankfurt, free plan)
- Vercel config also present (`vercel.json`) but likely not the active target

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

**Build Process:**
1. `npm ci` (root)
2. `cd client && npm ci --include=dev --legacy-peer-deps && npm run build` (Vite bundles to `client/dist/`)
3. `npx puppeteer browsers install chrome`
4. Start: `node server/index.js`

## Scheduled Jobs

**node-cron** (`^4.2.1`) powers two internal scheduled services:

- **Daily Schedule Sender** (`server/services/dailyScheduleSender.js`):
  - Fires at workday start time (configurable, default `08:00`) on Sunday–Thursday (Israeli work week, `Asia/Jerusalem` timezone)
  - Sends each employee their daily task list via WhatsApp

- **Data Retention** (`server/services/dataRetention.js`):
  - Periodically deletes completed tasks older than 2 years

- **Task Auto-Close** (`server/services/taskAutoClose.js`):
  - Automatically closes unfinished one-time tasks at end of workday; emits Socket.IO events

## Webhooks & Callbacks

**Incoming (task confirmation pages):**
- `GET /docs/task-:token.html` - Dynamically generated HTML confirmation page sent as WhatsApp link; employees tap to confirm task receipt
- `POST /api/confirm/:token` - Employee submits confirmation/photo from the confirmation page
- Implementation: `server/routes/taskConfirmation.js`; HTML generation: `server/services/htmlGenerator.js`

**Outgoing:**
- None (no outgoing webhook endpoints to external services)

## Internationalisation

- Server-side: `i18next` + `i18next-fs-backend`; locale files at `src/locales/{he,en,ru,ar,hi,ml}/`
  - Namespaces: `common`, `tasks`, `whatsapp`
  - Default/fallback language: Hebrew (`he`)
  - Config: `server/services/i18n.js`
- Translation of task content (Hebrew → employee language) via Google Gemini / Google Cloud Translation (see above)

## Environment Configuration

**Required env vars (production):**
- `NODE_ENV=production`
- `PORT` - HTTP listen port
- `PUBLIC_API_URL` - Public hostname for WhatsApp confirmation links (e.g. `https://eden-maintenance.onrender.com`)
- `GEMINI_API_KEY` - Google Gemini translation

**Optional env vars:**
- `DB_PATH` - Absolute path to SQLite file (Railway persistent volume)
- `GOOGLE_TRANSLATE_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` - Paid translation fallback
- `URL_SHORTENER_ENABLED` - Disable TinyURL (`false`)
- `DISABLE_WHATSAPP` - Skip WhatsApp init (`true` for CI/testing)
- `DEV_ONLY_PHONE` - Dev message safeguard

**Secrets location:**
- `.env` file in `server/` for local development (gitignored)
- Railway and Render dashboards for production secrets

---

*Integration audit: 2026-03-09*
