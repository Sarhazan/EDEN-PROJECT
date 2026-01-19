# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- JavaScript (ES6+) - Used throughout client and server
  - Client uses ES modules (`type: "module"` in `client/package.json`)
  - Server uses CommonJS (`type: "commonjs"` in `package.json`)

**Secondary:**
- HTML - Task confirmation pages in `docs/` directory
- CSS - Via Tailwind CSS utility classes

## Runtime

**Environment:**
- Node.js v24.11.1

**Package Manager:**
- npm v11.6.2
- Lockfile: Not present (package-lock.json not committed)

## Frameworks

**Core:**
- Express.js v5.2.1 - Backend REST API server
- React v19.2.0 - Frontend UI framework
- React Router DOM v7.12.0 - Client-side routing

**Testing:**
- Not detected

**Build/Dev:**
- Vite v7.2.4 - Frontend build tool and dev server
- Nodemon v3.1.11 - Server hot-reload during development
- Concurrently v9.2.1 - Run client and server simultaneously
- ESLint v9.39.1 - JavaScript linting
- @vitejs/plugin-react v5.1.1 - React support for Vite

## Key Dependencies

**Critical:**
- whatsapp-web.js v1.34.4 - WhatsApp Web integration via Puppeteer
- better-sqlite3 v12.6.0 - SQLite database driver (synchronous)
- axios v1.13.2 - HTTP client (used in both client and server)

**Infrastructure:**
- cors v2.8.5 - Cross-origin resource sharing middleware
- multer v2.0.2 - Multipart form data handling (file uploads)
- qrcode-terminal v0.12.0 - QR code generation for WhatsApp authentication

**UI/Styling:**
- Tailwind CSS v3.4.19 - Utility-first CSS framework
- PostCSS v8.5.6 + Autoprefixer v10.4.23 - CSS processing
- tailwindcss-rtl v0.9.0 - Right-to-left text support (Hebrew)
- react-icons v5.5.0 - Icon library
- react-datepicker v9.1.0 - Date picker component

**Utilities:**
- date-fns v4.1.0 - Date formatting and manipulation (used in both client and server)

## Configuration

**Environment:**
- Configuration via `.env` file in server directory
- Manual parsing in `server/index.js` (lines 8-17)
- Key environment variables:
  - `PORT` - Server port (default: 3001)
  - `NODE_ENV` - Environment mode (development/production)
  - `VITE_API_URL` - API URL for client (build-time)
  - `API_URL` - API URL for HTML templates (runtime)
  - `VERCEL_PROJECT_URL` - Vercel deployment URL

**Build:**
- `client/vite.config.js` - Vite configuration (dev server, plugins)
- `client/tailwind.config.js` - Tailwind theme, colors, fonts
- `client/postcss.config.js` - PostCSS plugins
- `client/eslint.config.js` - ESLint flat config format
- `vercel.json` - Vercel deployment configuration

## Platform Requirements

**Development:**
- Node.js v24+ (or compatible version)
- npm v11+
- Git (for HTML page deployment via `server/services/htmlGenerator.js`)
- Vercel CLI (for deployment automation)

**Production:**
- Server: Node.js runtime (port 3001, binds to 0.0.0.0)
- Client: Static files served from `client/dist/`
- Database: SQLite file at root (`maintenance.db`)
- WhatsApp: Puppeteer with headless Chrome
- Static HTML hosting: Vercel (for task confirmation pages in `docs/`)

---

*Stack analysis: 2026-01-19*
