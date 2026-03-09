# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
EDEN-PROJECT_LOCAL/            # Monorepo root
├── server/                    # Express backend (Node.js / CommonJS)
│   ├── index.js               # Server entry point
│   ├── database/
│   │   ├── schema.js          # DB init, migrations, shared `db` connection
│   │   └── seed.js            # Demo data seeder
│   ├── routes/                # Express routers — one file per domain
│   │   ├── tasks.js
│   │   ├── taskConfirmation.js
│   │   ├── whatsapp.js
│   │   ├── hq.js
│   │   ├── forms.js
│   │   ├── accounts.js
│   │   ├── data.js            # Seed/clear (blocked in production)
│   │   ├── history.js
│   │   ├── employees.js
│   │   ├── systems.js
│   │   ├── suppliers.js
│   │   ├── locations.js
│   │   ├── buildings.js
│   │   ├── tenants.js
│   │   ├── billing.js
│   │   └── languages.js
│   ├── services/              # Business logic + background jobs
│   │   ├── whatsapp.js        # WhatsApp Web singleton service
│   │   ├── taskService.js     # Task timing enrichment utilities
│   │   ├── taskAutoClose.js   # End-of-day cron: mark tasks not_completed
│   │   ├── taskRollover.js    # End-of-day cron: advance one-time tasks
│   │   ├── dailyScheduleSender.js  # Morning WhatsApp schedule dispatch
│   │   ├── htmlGenerator.js   # Dynamic task-confirmation HTML generation
│   │   ├── translation.js     # Gemini / Google Translate hybrid service
│   │   ├── i18n.js            # Server-side i18next instance
│   │   ├── dataRetention.js   # Cron: delete old completed tasks
│   │   └── urlShortener.js    # URL shortening for WhatsApp links
│   ├── templates/
│   │   └── task-confirmation.html  # HTML template for employee confirmation pages
│   ├── utils/
│   │   └── dateUtils.js       # getCurrentTimestampIsrael()
│   └── uploads/               # Runtime file store (task photos, form files)
│
├── client/                    # React frontend (Vite / ES Modules)
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # Router + global modal host + layout switcher
│   │   ├── config.js          # API_URL, SOCKET_URL, LS_KEYS constants
│   │   ├── index.css          # Global Tailwind imports
│   │   ├── App.css
│   │   ├── context/
│   │   │   └── AppContext.jsx # Global state: entities, auth, Socket.IO
│   │   ├── pages/             # Route-level page components
│   │   │   ├── MyDayPage.jsx
│   │   │   ├── AllTasksPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── SystemsPage.jsx
│   │   │   ├── SuppliersPage.jsx
│   │   │   ├── EmployeesPage.jsx
│   │   │   ├── LocationsPage.jsx
│   │   │   ├── BuildingsPage.jsx
│   │   │   ├── TenantsPage.jsx
│   │   │   ├── BillingPage.jsx
│   │   │   ├── SiteFormsPage.jsx
│   │   │   ├── FormFillPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── TaskConfirmationPage.jsx  # Public — no auth
│   │   │   ├── HQDashboardPage.jsx
│   │   │   ├── HQDispatchPage.jsx
│   │   │   ├── HQListsPage.jsx
│   │   │   ├── HQReportsPage.jsx
│   │   │   ├── HQFormsPage.jsx
│   │   │   ├── HQLoginPage.jsx
│   │   │   └── HQPlaceholderPage.jsx
│   │   ├── components/        # Reusable UI components
│   │   │   ├── layout/        # Sidebar, HQSidebar, MobileDrawer, HamburgerButton
│   │   │   ├── shared/        # Modal, TaskCard, DataControls
│   │   │   ├── forms/         # TaskForm, QuickTaskModal, SystemForm, EmployeeForm, etc.
│   │   │   ├── myday/         # TaskListPanel, CalendarPanel, ForecastChart, StatsBar, PendingApprovalSection
│   │   │   ├── employees/     # EmployeeCalendarModal
│   │   │   ├── history/       # HistoryTable, HistoryFilters, HistoryStats, ManagerSection
│   │   │   └── settings/      # WhatsAppSection, WorkdaySection, VersionSection
│   │   └── hooks/             # Custom React hooks (co-located with pages)
│   │       ├── useBulkWhatsApp.js
│   │       ├── useColumnResize.js
│   │       ├── useHistoryFilters.js
│   │       ├── useManagerFilter.js
│   │       ├── useMediaQuery.js
│   │       ├── useNavigateToTask.js
│   │       ├── useTaskFilters.js
│   │       └── useVersionCheck.js
│   ├── e2e/                   # Playwright end-to-end tests
│   │   ├── auth.spec.js
│   │   ├── tasks.spec.js
│   │   ├── myday.spec.js
│   │   ├── settings.spec.js
│   │   ├── eden.spec.js
│   │   └── helpers/
│   └── dist/                  # Vite production build output (gitignored)
│
├── src/
│   └── locales/               # i18n JSON translation files
│       ├── he/                # Hebrew (default)
│       ├── en/
│       ├── ru/
│       ├── ar/
│       ├── hi/
│       └── ml/
│
├── docs/                      # Served at /docs — generated task confirmation HTML (dev only)
├── uploads/                   # Runtime upload storage (task photos, form logos/contracts)
├── maintenance.db             # SQLite database file (production uses DB_PATH env var)
├── package.json               # Root — server deps + monorepo scripts
├── playwright.config.js       # E2E test config
├── nodemon.json               # Dev reload config
└── .planning/                 # GSD planning documents (not application code)
```

## Directory Purposes

**`server/database/`:**
- Purpose: Single source of truth for the DB schema, migration logic, and the shared `db` connection
- Contains: `schema.js` (exported `db`, `initializeDatabase`, `checkAndSeedDatabase`), `seed.js`
- Key files: `server/database/schema.js` — import `{ db }` from here in all server code that touches the DB

**`server/routes/`:**
- Purpose: HTTP routing — one Express router per domain entity
- Contains: Plain Express router files that `require('../database/schema')` and call services
- Key files: `server/routes/tasks.js` (most complex; handles recurring task generation), `server/routes/taskConfirmation.js` (multipart upload + token auth)

**`server/services/`:**
- Purpose: Domain logic that does not belong in a route handler: scheduled jobs, integrations, generators
- Contains: Singleton classes and module-level state; cron jobs use `node-cron`
- Key files: `server/services/whatsapp.js` (WhatsApp lifecycle), `server/services/taskService.js` (timing), `server/services/translation.js` (i18n AI)

**`server/templates/`:**
- Purpose: Static HTML template used by `htmlGenerator.js` to build per-employee confirmation pages
- Contains: `task-confirmation.html` (single file)

**`client/src/context/`:**
- Purpose: Global React state shared across all pages
- Contains: `AppContext.jsx` — the only context provider; exported as `AppProvider` and `useApp`
- Key pattern: All pages call `const { tasks, employees, ... } = useApp()` — do not fetch independently unless necessary

**`client/src/pages/`:**
- Purpose: One component per route; imports from context and components
- Contains: All route-level views for both portals plus public pages
- Naming: `PascalCase` + `Page` suffix (e.g., `MyDayPage.jsx`, `HQDashboardPage.jsx`)

**`client/src/components/`:**
- Purpose: Reusable UI grouped by feature domain
- Contains: Seven subdirectories (see layout above)
- Key files: `components/shared/TaskCard.jsx` (used across multiple pages), `components/shared/Modal.jsx` (wrapper for all modals)

**`client/src/hooks/`:**
- Purpose: Extract stateful logic from pages into reusable hooks
- Contains: Eight custom hooks; all files follow `use` prefix convention
- Key files: `useBulkWhatsApp.js` (WhatsApp dispatch logic), `useTaskFilters.js` (filter state for task lists)

**`src/locales/`:**
- Purpose: Translation JSON files consumed by `server/services/i18n.js` (server-side i18next)
- Structure: `src/locales/{languageCode}/{namespace}.json` — namespaces are `common`, `tasks`, `whatsapp`
- Supported codes: `he`, `en`, `ru`, `ar`, `hi`, `ml`

## Key File Locations

**Entry Points:**
- `server/index.js`: Backend entry point — start here to trace any server-side request
- `client/src/main.jsx`: Frontend entry point
- `client/src/App.jsx`: Route definitions and global modal host

**Configuration:**
- `client/src/config.js`: All client constants (`API_URL`, `SOCKET_URL`, `LS_KEYS`)
- `server/database/schema.js`: DB connection and all table definitions

**Core Logic:**
- `server/services/whatsapp.js`: WhatsApp integration
- `server/services/taskService.js`: Task timing enrichment (called in every task route)
- `server/services/taskAutoClose.js`: End-of-day automation (chains to `taskRollover.js`)
- `client/src/context/AppContext.jsx`: All client-side state and Socket.IO event handling

**Testing:**
- `client/e2e/*.spec.js`: Playwright E2E tests
- `playwright.config.js`: Test configuration at repo root

## Naming Conventions

**Server files:**
- Route files: `camelCase` matching the resource name (e.g., `tasks.js`, `taskConfirmation.js`)
- Service files: `camelCase` describing the concern (e.g., `dailyScheduleSender.js`, `htmlGenerator.js`)
- Utility files: `camelCase` (e.g., `dateUtils.js`)

**Client files:**
- Page components: `PascalCase` + `Page` suffix (e.g., `MyDayPage.jsx`, `HQLoginPage.jsx`)
- Form components: `PascalCase` + `Form` or `Modal` suffix (e.g., `TaskForm.jsx`, `QuickTaskModal.jsx`)
- Layout components: `PascalCase` descriptive name (e.g., `Sidebar.jsx`, `MobileDrawer.jsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useTaskFilters.js`, `useBulkWhatsApp.js`)
- Shared components: `PascalCase` (e.g., `TaskCard.jsx`, `Modal.jsx`)

**Directories:**
- Server: `lowercase` (e.g., `routes/`, `services/`, `database/`)
- Client: `lowercase` for feature folders (e.g., `myday/`, `layout/`, `forms/`)
- Pages are flat in `client/src/pages/` — no subdirectories

## Where to Add New Code

**New backend resource (e.g., a new entity):**
- Route: Create `server/routes/{resourceName}.js` following the pattern of `server/routes/employees.js`
- Mount in: `server/index.js` with `app.use('/api/{resourceName}', require('./routes/{resourceName}'))`
- DB table: Add `CREATE TABLE IF NOT EXISTS` block to `server/database/schema.js` inside `initializeDatabase()`
- If the route emits Socket.IO events: add `setIo()` export and wire it in `server/index.js`

**New business logic / scheduled job:**
- Create `server/services/{serviceName}.js`
- Initialize in `server/index.js` after the `io` instance is created

**New frontend page:**
- Create `client/src/pages/{FeatureName}Page.jsx`
- Add a `<Route>` in `client/src/App.jsx`
- Add nav item to the appropriate sidebar (`Sidebar.jsx` for maintenance, `HQSidebar.jsx` for HQ)

**New reusable component:**
- Place in the appropriate subdirectory of `client/src/components/`
- If truly shared across domains: `client/src/components/shared/`

**New custom hook:**
- Create `client/src/hooks/use{FeatureName}.js`

**New translation string:**
- Add key/value to `src/locales/{lng}/common.json` (or `tasks.json` / `whatsapp.json`) for all supported languages

## Special Directories

**`uploads/`:**
- Purpose: Runtime storage for task completion photos and form files (logos, contracts)
- Generated: Yes (at runtime by multer / file system calls)
- Committed: No (files are user data)
- Subpaths: `uploads/` (task photos), `uploads/forms/logos/`, `uploads/forms/contracts/`

**`docs/`:**
- Purpose: Houses dynamically generated HTML confirmation pages in development
- Generated: Yes (by `htmlGenerator.js` in development; served dynamically in production)
- Committed: No

**`.wwebjs_auth_development/` and `server/.wwebjs_auth_development/`:**
- Purpose: WhatsApp Web session persistence (Chromium profile data)
- Generated: Yes (by `whatsapp-web.js` LocalAuth)
- Committed: No

**`client/dist/`:**
- Purpose: Vite production build output; served as static files by Express in production
- Generated: Yes (via `npm run build`)
- Committed: No

**`.planning/`:**
- Purpose: GSD planning documents — milestones, phases, todos, codebase maps
- Generated: No (manually created by GSD tooling)
- Committed: Yes

---

*Structure analysis: 2026-03-09*
