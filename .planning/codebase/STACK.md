# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- JavaScript (CommonJS) - Server (`server/`) and root build tooling
- JavaScript (ES Modules) - Client (`client/src/`) and Vite config

**Secondary:**
- JSX - React component files in `client/src/`
- JSON - Locale files in `src/locales/`

## Runtime

**Environment:**
- Node.js 20 (declared in `nixpacks.toml` via `nixPkgs = ['nodejs_20']`; local env is v24.x)

**Package Manager:**
- npm
- Lockfiles: present at root `package-lock.json` and `client/package-lock.json`

## Project Structure

Three separate npm packages:
1. **Root** (`package.json`) - Server + E2E test runner
2. **Client** (`client/package.json`) - React SPA (Vite, ES module)
3. **WhatsApp Gateway** (`whatsapp-gateway/package.json`) - Standalone local gateway (optional, not used in production)

## Frameworks

**Backend:**
- Express 5 (`^5.2.1`) - HTTP server and REST API; entry point `server/index.js`

**Frontend:**
- React 19 (`^19.2.0`) - SPA rendering; entry `client/src/main.jsx`
- React Router DOM 7 (`^7.12.0`) - Client-side routing

**Real-time:**
- Socket.IO 4 (`^4.8.3`) - Server and client; bidirectional events for WhatsApp status, task updates

**Build / Dev:**
- Vite 7 (`^7.2.4`) - Frontend bundler and dev server (port 5174)
- nodemon 3 (`^3.1.11`) - Server hot reload in development
- concurrently (`^9.2.1`) - Runs server + client dev servers in parallel

**Testing:**
- Playwright 1 (`^1.58.2`) - E2E tests; config at `playwright.config.js`; tests in `e2e/`

**Styling:**
- Tailwind CSS 3 (`^3.4.19`) - Utility-first CSS; config `client/tailwind.config.js`
- tailwindcss-rtl (`^0.9.0`) - RTL (Hebrew/Arabic) layout support
- PostCSS (`^8.5.6`) + Autoprefixer - CSS processing

## Key Dependencies

**Database:**
- `better-sqlite3` `^12.6.0` - Synchronous SQLite driver; primary data store; `server/database/schema.js`

**WhatsApp Integration:**
- `whatsapp-web.js` `^1.34.4` - WhatsApp Web automation via Puppeteer
- `puppeteer-core` `^24.36.0` - Headless Chromium driver
- `@sparticuz/chromium` `^143.0.4` - Chromium binary for Railway/cloud production
- `qrcode` `^1.5.4` - Generates QR data URLs for browser display
- `qrcode-terminal` `^0.12.0` - QR output for CLI debugging

**AI / Translation:**
- `@google/generative-ai` `^0.24.1` - Google Gemini API (primary translation, free tier)
- `@google-cloud/translate` `^9.3.0` - Google Cloud Translation API (paid fallback)

**File Handling:**
- `multer` `^2.0.2` - Multipart form uploads (task photo confirmations)
- `sharp` `^0.34.5` - Image conversion (HEIC/HEIF to JPEG)

**HTTP / Utilities:**
- `axios` `^1.13.2` - HTTP client (used server-side for TinyURL API; client-side for API calls)
- `cors` `^2.8.5` - CORS middleware
- `date-fns` `^4.1.0` - Date utilities (server and client)
- `node-cron` `^4.2.1` - Scheduled tasks (daily schedule sender, data retention)
- `jsdom` `^27.4.0` - Server-side DOM manipulation

**Internationalisation:**
- `i18next` `^25.8.0` - Server-side i18n framework; `server/services/i18n.js`
- `i18next-fs-backend` `^2.6.1` - Loads locale JSON files from `src/locales/`
- Supported locales: `he`, `en`, `ru`, `ar`, `hi`, `ml`

**Client UI Libraries:**
- `react-icons` `^5.5.0`
- `react-toastify` `^11.0.5`
- `react-datepicker` `^9.1.0`
- `react-tailwindcss-datepicker` `^2.0.0`
- `react-swipeable` `^7.0.2`
- `re-resizable` `^6.9.17`

**Linting:**
- ESLint 9 (`^9.39.1`) with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`; config `client/eslint.config.js`

## Configuration

**Environment:**
- Server reads `.env` manually at startup (custom parser in `server/index.js` lines 27-36)
- `whatsapp-gateway/` uses `dotenv` package
- Template: `.env.example` at root

**Key env vars (from `.env.example` and code):**
- `PORT` - Server listen port (default `3002`)
- `NODE_ENV` - `development` | `production`
- `PUBLIC_API_URL` - Public-facing URL for WhatsApp confirmation links
- `DB_PATH` - SQLite database file path (defaults to `maintenance.db` at root)
- `GEMINI_API_KEY` - Google Gemini API key (primary translation)
- `GOOGLE_TRANSLATE_API_KEY` - Google Cloud Translation API key (fallback)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to GCP service account JSON
- `URL_SHORTENER_ENABLED` - Toggle TinyURL shortening (`true`/`false`)
- `DISABLE_WHATSAPP` - Set `true` to skip WhatsApp init in dev
- `DEV_ONLY_PHONE` - Dev safeguard: restrict WhatsApp sends to one number

**Frontend env vars (Vite):**
- `VITE_API_URL` - Backend API base URL (falls back to `http://localhost:3002/api`)
- `VITE_SOCKET_URL` - Socket.IO server URL

**Build:**
- Vite config: `client/vite.config.js` - custom `versionPlugin` writes `version.json` on build
- Tailwind config: `client/tailwind.config.js`
- PostCSS config: `client/postcss.config.js`

## Platform Requirements

**Development:**
- Node.js 20+, npm
- `npm run dev` starts server (nodemon, port 3002) + client (Vite, port 5174) concurrently
- Chromium must be available for WhatsApp (can set `DISABLE_WHATSAPP=true` to skip)

**Production:**
- Railway (primary): `nixpacks.toml` provisions Node 20 + Chromium apt packages; starts with `node server/index.js`
- Render (alternative): `render.yaml` defines web service, Frankfurt region
- Client built to `client/dist/` and served as static files by Express in production
- Persistent SQLite via `DB_PATH` env pointing to a Railway Volume

---

*Stack analysis: 2026-03-09*
