# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
eden-claude/
├── client/                 # React SPA frontend
│   ├── dist/              # Vite build output
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── assets/        # Images, fonts
│   │   ├── components/    # Reusable UI components
│   │   │   ├── forms/     # Entity forms
│   │   │   ├── layout/    # Sidebar, DataControls
│   │   │   └── shared/    # Modal, TaskCard
│   │   ├── context/       # React Context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Route pages
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Root component with router
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles with Tailwind
│   ├── index.html         # HTML shell
│   ├── package.json       # Frontend dependencies
│   ├── vite.config.js     # Vite configuration
│   └── tailwind.config.js # Tailwind + RTL configuration
├── server/                # Express REST API backend
│   ├── database/          # Database schema and seeds
│   │   ├── schema.js      # Table definitions + DB instance
│   │   └── seed.js        # Sample data
│   ├── routes/            # API route handlers
│   │   ├── tasks.js       # Task CRUD + recurring logic
│   │   ├── systems.js     # Systems CRUD
│   │   ├── employees.js   # Employees CRUD
│   │   ├── suppliers.js   # Suppliers CRUD
│   │   ├── locations.js   # Locations CRUD
│   │   ├── whatsapp.js    # WhatsApp integration
│   │   ├── taskConfirmation.js # Token-based confirmations
│   │   └── data.js        # Seed/clear endpoints
│   ├── services/          # Business logic services
│   │   ├── whatsapp.js    # WhatsApp client singleton
│   │   └── htmlGenerator.js # Static HTML generation
│   ├── templates/         # HTML templates
│   ├── uploads/           # File upload storage
│   ├── .wwebjs_auth/      # WhatsApp session data
│   ├── index.js           # Express server entry
│   └── .env               # Environment variables
├── docs/                  # Generated confirmation pages
│   └── task-*.html        # Token-based static pages
├── .planning/             # GSD planning artifacts
│   └── codebase/          # Codebase documentation
├── .auto-claude/          # Auto-Claude artifacts
├── maintenance.db         # SQLite database file
├── package.json           # Root dependencies + scripts
└── vercel.json            # Vercel deployment config
```

## Directory Purposes

**client/src/components/forms:**
- Purpose: Entity creation/editing forms
- Contains: TaskForm, SystemForm, SupplierForm, EmployeeForm, LocationForm
- Key files: All forms use controlled inputs and submit to AppContext methods

**client/src/components/layout:**
- Purpose: Persistent layout components
- Contains: Sidebar for navigation, DataControls for seed/clear operations
- Key files: `Sidebar.jsx` renders navigation with route highlighting, `DataControls.jsx` positioned bottom-left

**client/src/components/shared:**
- Purpose: Reusable UI components
- Contains: Modal wrapper, TaskCard display component
- Key files: `Modal.jsx` handles overlay and close, `TaskCard.jsx` displays task with status badges

**client/src/context:**
- Purpose: Global state management
- Contains: AppContext provider with all entity state and methods
- Key files: `AppContext.jsx` - single context file with fetch/CRUD methods for tasks, systems, employees, suppliers, locations

**client/src/pages:**
- Purpose: Route-specific page components
- Contains: MyDayPage, AllTasksPage, SystemsPage, SuppliersPage, EmployeesPage, LocationsPage, SettingsPage, TaskConfirmationPage
- Key files: `MyDayPage.jsx` (main dashboard with stats), `TaskConfirmationPage.jsx` (public confirmation page)

**server/database:**
- Purpose: Database schema and initialization
- Contains: Table creation, migrations, seed data
- Key files: `schema.js` exports db instance and initializeDatabase(), `seed.js` for sample data

**server/routes:**
- Purpose: API endpoint handlers
- Contains: Express routers for each entity and integration
- Key files: `tasks.js` (complex recurring logic), `whatsapp.js` (bulk send orchestration)

**server/services:**
- Purpose: External integrations and business logic
- Contains: WhatsApp client management, HTML generation
- Key files: `whatsapp.js` (singleton with QR auth), `htmlGenerator.js` (template + git deployment)

**docs:**
- Purpose: Static HTML confirmation pages
- Contains: Generated task confirmation pages
- Generated: Yes
- Committed: Yes (pushed via htmlGenerator service)

## Key File Locations

**Entry Points:**
- `c:/dev/projects/claude projects/eden claude/client/src/main.jsx`: React app mount
- `c:/dev/projects/claude projects/eden claude/server/index.js`: Express server startup

**Configuration:**
- `c:/dev/projects/claude projects/eden claude/client/vite.config.js`: Vite dev server config
- `c:/dev/projects/claude projects/eden claude/client/tailwind.config.js`: Tailwind + RTL config
- `c:/dev/projects/claude projects/eden claude/vercel.json`: Static site deployment config
- `c:/dev/projects/claude projects/eden claude/server/.env`: API keys and URLs

**Core Logic:**
- `c:/dev/projects/claude projects/eden claude/client/src/context/AppContext.jsx`: Client state + API calls
- `c:/dev/projects/claude projects/eden claude/server/routes/tasks.js`: Task business logic (recurring)
- `c:/dev/projects/claude projects/eden claude/server/services/whatsapp.js`: WhatsApp integration
- `c:/dev/projects/claude projects/eden claude/server/database/schema.js`: Database schema

**Testing:**
- No test files detected in codebase

## Naming Conventions

**Files:**
- React components: PascalCase with .jsx extension (e.g., `TaskForm.jsx`, `MyDayPage.jsx`)
- Node modules: camelCase with .js extension (e.g., `whatsapp.js`, `htmlGenerator.js`)
- Config files: kebab-case or dotfiles (e.g., `vite.config.js`, `.env`)
- Database: Single SQLite file `maintenance.db` at root

**Directories:**
- Lowercase for server (e.g., `routes/`, `services/`, `database/`)
- Lowercase for client structure (e.g., `components/`, `pages/`, `context/`)
- Subdirectories lowercase (e.g., `components/forms/`, `components/shared/`)

**Components:**
- Default exports for all React components
- Named exports for Context hook (e.g., `useApp`)
- PascalCase component names matching filename

**Routes:**
- API routes prefixed with `/api/*`
- Route files export `router` from express.Router()
- Mounted in `server/index.js` with `app.use()`

## Where to Add New Code

**New Feature:**
- Primary code: Depends on feature type
  - Client UI: `client/src/components/` or `client/src/pages/`
  - API endpoint: `server/routes/`
  - Business logic: `server/services/`
- Tests: No test infrastructure exists

**New Component/Module:**
- Implementation:
  - Shared UI component: `client/src/components/shared/`
  - Form component: `client/src/components/forms/`
  - Page component: `client/src/pages/`
  - Layout component: `client/src/components/layout/`
  - Backend route: `server/routes/` (then mount in `server/index.js`)
  - Backend service: `server/services/`

**Utilities:**
- Shared helpers:
  - Client utilities: `client/src/utils/`
  - Server utilities: `server/services/` (no dedicated utils folder)

**New Entity Type:**
1. Add table to `server/database/schema.js`
2. Create route handler in `server/routes/[entity].js`
3. Mount route in `server/index.js`
4. Add state and methods to `client/src/context/AppContext.jsx`
5. Create form in `client/src/components/forms/[Entity]Form.jsx`
6. Create page in `client/src/pages/[Entities]Page.jsx`
7. Add route to `client/src/App.jsx`
8. Add sidebar link to `client/src/components/layout/Sidebar.jsx`

**New API Endpoint:**
1. Add route handler to existing file in `server/routes/` OR
2. Create new route file in `server/routes/[feature].js`
3. Mount in `server/index.js` with `app.use('/api/[feature]', require('./routes/[feature]'))`

## Special Directories

**.wwebjs_auth:**
- Purpose: WhatsApp Web session persistence
- Generated: Yes (by whatsapp-web.js library)
- Committed: No (gitignored)

**.wwebjs_cache:**
- Purpose: WhatsApp Web browser cache
- Generated: Yes (by whatsapp-web.js library)
- Committed: No (gitignored)

**client/dist:**
- Purpose: Vite production build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**node_modules:**
- Purpose: NPM dependencies
- Generated: Yes (by `npm install`)
- Committed: No (gitignored)

**docs:**
- Purpose: Static HTML pages for task confirmations
- Generated: Yes (by htmlGenerator service)
- Committed: Yes (pushed to GitHub for GitHub Pages/Vercel hosting)

**.auto-claude:**
- Purpose: Auto-Claude ideation and specs
- Generated: Yes (by Auto-Claude)
- Committed: Typically yes

**.planning:**
- Purpose: GSD planning artifacts and codebase documentation
- Generated: Yes (by GSD commands)
- Committed: Typically yes

---

*Structure analysis: 2026-01-19*
