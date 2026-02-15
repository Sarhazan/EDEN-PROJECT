# Architecture Patterns: Eden v2.0 Integration

**Domain:** Task Management System
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

Eden v2.0 adds four key features to the existing React + Socket.IO + SQLite architecture:

1. **WhatsApp Connection Monitoring** - Separate connection state from WebSocket state
2. **Stars System** - Flagging/favoriting tasks with filtering capability
3. **Mobile Responsive Layout** - Sidebar and main content adaptations for mobile screens
4. **Resizable Columns** - User-controlled column widths with localStorage persistence

All features integrate cleanly with the existing architecture without requiring structural changes. The current AppContext pattern and SQLite schema are flexible enough to accommodate v2.0 requirements.

## Current Architecture Analysis

### Existing Component Structure

```
Client (React 19)
├── AppContext (global state + Socket.IO client)
│   ├── Tasks, Systems, Employees, Suppliers, Locations
│   ├── Socket.IO connection (connectionStatus)
│   └── WhatsApp connection (whatsappConnected)
├── App.jsx (routing + layout)
│   └── Sidebar (fixed width: 288px / w-72)
│       └── Navigation items
├── Pages
│   ├── MyDayPage (2-column: 66% + 33% grid)
│   ├── AllTasksPage
│   ├── HistoryPage (table with filters)
│   └── SettingsPage
└── Components
    ├── TaskCard (task display)
    ├── TaskForm (task editing)
    └── Modal (shared dialog)

Server (Express + Socket.IO)
├── HTTP Server (port 3002)
├── Socket.IO Server (broadcasts task events)
├── Routes (REST API)
│   ├── /api/tasks
│   ├── /api/whatsapp
│   └── /api/history
├── Services
│   ├── whatsapp.js (singleton, WhatsApp Web.js client)
│   └── dataRetention.js (scheduled cleanup)
└── Database (SQLite + better-sqlite3)
    └── WAL mode + indexes

Data Flow:
1. UI action → REST API → SQLite → Socket.IO broadcast
2. Socket.IO event → AppContext setState → React re-render
3. WhatsApp status → REST API polling → AppContext state
```

### Strengths

- **Clear separation of concerns**: AppContext handles all state, components are presentational
- **Real-time updates via Socket.IO**: Task changes propagate instantly to all connected clients
- **Singleton pattern for WhatsApp**: Single WhatsApp Web.js instance shared across requests
- **SQLite with WAL mode**: Concurrent reads while writing
- **Mobile-first Tailwind**: Uses utility classes, easily responsive

### Integration Points for v2.0

| Feature | Integration Point | Complexity |
|---------|------------------|------------|
| WhatsApp connection monitoring | AppContext state expansion | Low |
| Stars system | SQLite schema + AppContext state | Low |
| Mobile responsive layout | Tailwind breakpoints + conditional rendering | Medium |
| Resizable columns | localStorage + React state (HistoryPage) | Low |

## Recommended Architecture: v2.0 Features

### 1. WhatsApp Connection Monitoring

**Challenge:** Currently tracks two connection states in AppContext:
- `connectionStatus` (WebSocket: 'connected' / 'disconnected' / 'error')
- `whatsappConnected` (boolean)

**Problem:** No visual separation between WebSocket health and WhatsApp service health.

**Solution:** Expand state management with dedicated WhatsApp state object.

#### Component Architecture

```
AppContext State (NEW):
├── connectionStatus (WebSocket state - unchanged)
└── whatsapp (object)
    ├── isReady: boolean
    ├── status: 'disconnected' | 'initializing' | 'qr_required' | 'ready' | 'error'
    ├── lastChecked: timestamp
    └── qrCode: string | null

SettingsPage (WhatsApp Section):
├── Connection status indicator
├── Connect/Disconnect buttons
├── QR code display (conditional)
└── Status message

Sidebar (Status Footer):
├── WebSocket indicator (existing)
└── WhatsApp indicator (NEW)
```

#### Data Flow

```
User clicks "Connect WhatsApp" (SettingsPage)
  ↓
POST /api/whatsapp/initialize
  ↓
whatsapp.js service.initialize()
  ↓
Polling loop: GET /api/whatsapp/status every 3 seconds
  ↓
AppContext.setWhatsapp({ status, isReady, qrCode })
  ↓
React re-render (SettingsPage shows QR, Sidebar updates indicator)
  ↓
When ready event fires: status → 'ready'
  ↓
Stop polling, show success message
```

#### Implementation Pattern

**State Management (AppContext.jsx):**

```javascript
const [whatsapp, setWhatsapp] = useState({
  isReady: false,
  status: 'disconnected', // 'disconnected' | 'initializing' | 'qr_required' | 'ready' | 'error'
  lastChecked: null,
  qrCode: null
});

// Enhanced polling function
const checkWhatsAppConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/whatsapp/status`);
    const data = await response.json();
    setWhatsapp({
      isReady: data.isReady,
      status: data.status,
      lastChecked: Date.now(),
      qrCode: data.qrCode || null
    });
  } catch (error) {
    console.error('Error checking WhatsApp connection:', error);
    setWhatsapp(prev => ({ ...prev, status: 'error' }));
  }
};
```

**Server Enhancement (routes/whatsapp.js):**

```javascript
router.get('/status', async (req, res) => {
  const status = whatsappService.getStatus();
  const qrCode = await whatsappService.getQRCode();

  res.json({
    isReady: status.isReady,
    status: status.isReady ? 'ready' :
            qrCode ? 'qr_required' :
            status.isInitialized ? 'initializing' :
            'disconnected',
    qrCode: qrCode
  });
});
```

**UI Component (Sidebar footer):**

```javascript
<div className="flex items-center gap-2 text-sm">
  {/* WebSocket indicator */}
  <div className={`w-2 h-2 rounded-full ${getWebSocketColor()}`}></div>
  <span>{getWebSocketText()}</span>

  {/* WhatsApp indicator (NEW) */}
  <div className={`w-2 h-2 rounded-full ${getWhatsAppColor()}`}></div>
  <span>{getWhatsAppText()}</span>
</div>
```

#### Benefits

- **Clear separation**: Users distinguish between WebSocket issues and WhatsApp issues
- **Better UX**: Status messages like "Waiting for QR scan" vs "Disconnected"
- **Same pattern**: Follows existing `connectionStatus` approach
- **No architectural changes**: Just expanded state management

---

### 2. Stars System (Favorites)

**Challenge:** Users need to flag important tasks for quick access.

**Solution:** Add `is_starred` boolean column to tasks table, add filter UI, persist in SQLite.

#### Component Architecture

```
Database (SQLite):
└── tasks table
    └── is_starred: BOOLEAN DEFAULT 0 (NEW COLUMN)

AppContext:
└── tasks (already includes starred field after fetch)

TaskCard (UI Enhancement):
├── Star icon button (FaStar / FaRegStar)
└── onClick → toggleTaskStar(taskId)

AllTasksPage / MyDayPage (Filters):
├── "Show starred only" checkbox
└── Filtered task list based on is_starred

HistoryPage (Filters):
└── "Starred" filter option
```

#### Data Flow

```
User clicks star icon on TaskCard
  ↓
toggleTaskStar(taskId) → PUT /api/tasks/:id/star
  ↓
SQLite: UPDATE tasks SET is_starred = NOT is_starred WHERE id = :id
  ↓
Socket.IO broadcast: 'task:updated' with full task object
  ↓
AppContext receives event → updates tasks array
  ↓
React re-render → Star icon updates (filled/outlined)
```

#### Implementation Pattern

**Database Migration (schema.js):**

```javascript
// Add is_starred column (migration)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT 0`);
  console.log('Added is_starred column to tasks table');
} catch (e) {
  // Column already exists, ignore
}

// Create index for starred filter performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_starred
  ON tasks(is_starred, status, start_date)
`);
```

**API Route (routes/tasks.js):**

```javascript
// Toggle star status
router.put('/:id/star', (req, res) => {
  try {
    const { id } = req.params;

    // Toggle is_starred
    const result = db.prepare(`
      UPDATE tasks
      SET is_starred = NOT is_starred,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    // Fetch updated task
    const task = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(id);

    // Broadcast via Socket.IO
    io.emit('task:updated', { task });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**AppContext Enhancement:**

```javascript
const toggleTaskStar = async (id) => {
  const response = await fetch(`${API_URL}/tasks/${id}/star`, {
    method: 'PUT'
  });
  if (!response.ok) throw new Error('שגיאה בעדכון כוכב');
  // Socket.IO will handle state update via 'task:updated' event
};

// Add to context value
const value = {
  // ... existing values
  toggleTaskStar
};
```

**TaskCard Component (UI):**

```javascript
import { FaStar, FaRegStar } from 'react-icons/fa';

function TaskCard({ task, onEdit }) {
  const { toggleTaskStar } = useApp();

  return (
    <div className="task-card">
      {/* Star button in top-right corner */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          toggleTaskStar(task.id);
        }}
        className="absolute top-2 left-2 text-yellow-500 hover:text-yellow-600"
      >
        {task.is_starred ? <FaStar /> : <FaRegStar />}
      </button>

      {/* Rest of task card */}
    </div>
  );
}
```

**Filter UI (MyDayPage / AllTasksPage):**

```javascript
const [showStarredOnly, setShowStarredOnly] = useState(false);

// Filter logic
const filteredTasks = useMemo(() => {
  let filtered = tasks.filter(/* existing filters */);

  if (showStarredOnly) {
    filtered = filtered.filter(t => t.is_starred === 1);
  }

  return filtered;
}, [tasks, showStarredOnly, /* other deps */]);

// UI
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={showStarredOnly}
    onChange={(e) => setShowStarredOnly(e.target.checked)}
  />
  <FaStar className="text-yellow-500" />
  <span>הצג רק מסומנים</span>
</label>
```

#### Benefits

- **Simple data model**: Single boolean column, no joins required
- **Real-time updates**: Socket.IO propagates star changes instantly
- **Index for performance**: Filter by starred doesn't slow down queries
- **Consistent with existing patterns**: Same CRUD flow as other task operations

---

### 3. Mobile Responsive Layout

**Challenge:** Current layout uses fixed-width sidebar (w-72 = 288px) and desktop-only navigation. Mobile screens (< 768px) need collapsible sidebar and stacked layouts.

**Solution:** Tailwind breakpoints + conditional rendering + hamburger menu.

#### Component Architecture

```
Responsive Breakpoints (Tailwind defaults):
├── Mobile: < 640px (sm)
├── Tablet: 640px - 1024px (sm - lg)
└── Desktop: > 1024px (lg)

App.jsx Layout:
├── Mobile (< lg):
│   ├── Hidden sidebar (off-canvas)
│   ├── Hamburger menu button (top-left)
│   ├── Full-width main content
│   └── Overlay when sidebar open
└── Desktop (>= lg):
    ├── Fixed sidebar (w-72, right-0)
    └── Main content with margin (mr-72)

MyDayPage Grid:
├── Mobile (< lg):
│   └── Single column (col-span-12)
│       ├── Recurring tasks
│       └── One-time tasks (below)
└── Desktop (>= lg):
    └── Two columns (grid-cols-12)
        ├── Recurring (col-span-8)
        └── One-time (col-span-4)

HistoryPage Table:
├── Mobile (< md):
│   └── Card layout (stacked)
│       └── Each row = expandable card
└── Desktop (>= md):
    └── Table layout (current)
```

#### Implementation Pattern

**App.jsx (Layout Container):**

```javascript
function MainContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isPublicRoute = location.pathname.startsWith('/confirm/');

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - responsive */}
      {!isPublicRoute && (
        <>
          {/* Overlay for mobile (when sidebar open) */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
            fixed right-0 top-0 h-screen z-50 transition-transform duration-300
            lg:translate-x-0
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          `}>
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Hamburger menu (mobile only) */}
      {!isPublicRoute && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 right-4 z-30 lg:hidden bg-primary text-white p-3 rounded-lg shadow-lg"
        >
          <FaBars className="text-xl" />
        </button>
      )}

      {/* Main content */}
      <main className={`
        flex-1
        ${isPublicRoute ? '' : 'lg:mr-72'}
        ${isPublicRoute ? '' : 'pt-16 lg:pt-0'}
      `}>
        <Routes>
          {/* routes */}
        </Routes>
      </main>
    </div>
  );
}
```

**Sidebar.jsx (Enhanced):**

```javascript
export default function Sidebar({ onClose }) {
  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen flex flex-col">
      {/* Close button (mobile only) */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 text-white lg:hidden"
      >
        <FaTimes className="text-xl" />
      </button>

      {/* Header */}
      <div className="p-8 border-b border-gray-700/50">
        <h1 className="text-2xl font-bold">ניהול תחזוקה</h1>
      </div>

      {/* Navigation (same as before) */}
      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose} // Close sidebar on navigation (mobile)
            className={/* existing classes */}
          >
            {/* nav item content */}
          </NavLink>
        ))}
      </nav>

      {/* Connection status (same as before) */}
    </div>
  );
}
```

**MyDayPage.jsx (Responsive Grid):**

```javascript
// Replace fixed grid-cols-12 with responsive grid
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  {/* Recurring Tasks */}
  <div className="lg:col-span-8">
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">משימות קבועות</h2>
      {/* tasks */}
    </div>
  </div>

  {/* One-Time Tasks */}
  <div className="lg:col-span-4">
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold mb-4">משימות חד פעמיות</h2>
      {/* tasks */}
    </div>
  </div>
</div>
```

**HistoryPage.jsx (Responsive Table):**

```javascript
function HistoryPage() {
  return (
    <div className="p-6">
      {/* Desktop: Table view */}
      <div className="hidden md:block">
        <table className="min-w-full bg-white rounded-lg shadow">
          {/* existing table */}
        </table>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-4">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-white rounded-lg shadow p-4">
            <div className="font-bold">{task.title}</div>
            <div className="text-sm text-gray-600">{task.system_name}</div>
            <div className="text-sm text-gray-600">{task.employee_name}</div>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}>
                {getStatusText(task.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Stats Bar (MyDayPage) - Responsive:**

```javascript
// Change from grid-cols-4 to responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {/* stats cards - same content, responsive layout */}
</div>
```

#### Benefits

- **Tailwind's mobile-first approach**: Unprefixed = mobile, `lg:` = desktop
- **No media queries needed**: Breakpoint utilities handle everything
- **Smooth transitions**: Off-canvas sidebar slides in/out with CSS transitions
- **Maintains existing desktop UX**: No changes for desktop users
- **Standard patterns**: Hamburger menu + overlay + slide-in sidebar (proven UX)

**Source:** [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design), [Mastering Responsive Design with Tailwind CSS](https://dev.to/hitesh_developer/mastering-responsive-design-with-tailwind-css-tips-and-tricks-1f39)

---

### 4. Resizable Columns (HistoryPage)

**Challenge:** HistoryPage table has fixed column widths. Users need to adjust column widths based on their screen size and preferences.

**Solution:** CSS resize handles + localStorage persistence for column widths.

#### Component Architecture

```
HistoryPage State:
└── columnWidths (object)
    ├── title: number (pixels)
    ├── system: number
    ├── employee: number
    ├── status: number
    └── date: number

LocalStorage:
└── 'eden_history_column_widths' (JSON string)

Table Structure:
├── <th> elements with:
│   ├── style={{ width: columnWidths[key] }}
│   └── Resize handle (absolute positioned div)
└── Resize event listeners:
    ├── onMouseDown (start resize)
    ├── onMouseMove (update width)
    └── onMouseUp (save to localStorage)
```

#### Implementation Pattern

**HistoryPage.jsx (State Management):**

```javascript
import { useState, useEffect, useRef } from 'react';

function HistoryPage() {
  // Load column widths from localStorage
  const [columnWidths, setColumnWidths] = useState(() => {
    const saved = localStorage.getItem('eden_history_column_widths');
    return saved ? JSON.parse(saved) : {
      title: 300,
      system: 150,
      employee: 150,
      status: 120,
      date: 150,
      actions: 100
    };
  });

  // Save to localStorage whenever widths change
  useEffect(() => {
    localStorage.setItem('eden_history_column_widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Resize handlers
  const resizingColumn = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = (e, columnKey) => {
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];

    // Add mouse move and mouse up listeners to document
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);

    e.preventDefault();
  };

  const handleResizeMove = (e) => {
    if (!resizingColumn.current) return;

    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff); // Min width 50px

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  return (
    <div className="p-6">
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead>
          <tr>
            <th style={{ width: columnWidths.title }} className="relative">
              <span>כותרת</span>
              <div
                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                onMouseDown={(e) => handleResizeStart(e, 'title')}
              />
            </th>

            <th style={{ width: columnWidths.system }} className="relative">
              <span>מערכת</span>
              <div
                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                onMouseDown={(e) => handleResizeStart(e, 'system')}
              />
            </th>

            {/* Similar for other columns */}
          </tr>
        </thead>
        <tbody>
          {/* rows use same column widths */}
        </tbody>
      </table>
    </div>
  );
}
```

**Alternative: React Library Approach (TanStack Table):**

If you want a more robust solution with less manual work:

```javascript
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { useState, useEffect } from 'react';

function HistoryPage() {
  const [columnSizing, setColumnSizing] = useState(() => {
    const saved = localStorage.getItem('eden_history_column_sizing');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('eden_history_column_sizing', JSON.stringify(columnSizing));
  }, [columnSizing]);

  const table = useReactTable({
    data: tasks,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th
                key={header.id}
                style={{ width: header.getSize() }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}

                {/* Resize handle */}
                <div
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className="resizer"
                />
              </th>
            ))}
          </tr>
        ))}
      </thead>
      {/* tbody */}
    </table>
  );
}
```

#### Benefits

- **Vanilla approach**: No dependencies, full control, ~50 lines of code
- **TanStack Table approach**: Battle-tested library, handles edge cases, touch support
- **Persists across sessions**: Users don't lose their column size preferences
- **Minimal performance impact**: Only re-renders affected columns during resize
- **Fallback values**: If localStorage is empty, use sensible defaults

**Source:** [React Table Column Resizing Guide](https://www.simple-table.com/blog/react-table-column-resizing-guide), [TanStack Table Column Resizing](https://github.com/TanStack/table/discussions/2498)

---

## Integration Points with Existing System

### Socket.IO Event Handling

All new features integrate with existing Socket.IO real-time update pattern:

```javascript
// Existing events (unchanged):
socket.on('task:created', (data) => { /* ... */ });
socket.on('task:updated', (data) => { /* ... */ }); // Stars use this
socket.on('task:deleted', (data) => { /* ... */ });

// No new events needed for v2.0 features
```

**Why it works:**
- Stars toggle triggers 'task:updated' (task object includes is_starred field)
- No new event types required
- Existing optimistic updates work for star changes

### SQLite Schema Additions

New columns added via migrations in schema.js:

```sql
-- Stars system
ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT 0;
CREATE INDEX idx_tasks_starred ON tasks(is_starred, status, start_date);

-- No schema changes needed for:
-- - WhatsApp monitoring (state-only)
-- - Responsive layout (UI-only)
-- - Resizable columns (localStorage-only)
```

### AppContext Expansion

State additions follow existing patterns:

```javascript
// BEFORE (v1.0)
const [whatsappConnected, setWhatsappConnected] = useState(false);
const [connectionStatus, setConnectionStatus] = useState('disconnected');

// AFTER (v2.0)
const [whatsapp, setWhatsapp] = useState({ /* enhanced object */ });
const [connectionStatus, setConnectionStatus] = useState('disconnected'); // unchanged

// NEW methods added to context value:
const value = {
  // ... existing methods
  toggleTaskStar,        // NEW
  checkWhatsAppStatus    // ENHANCED (returns more detail)
};
```

## Suggested Build Order

Based on dependencies and complexity:

### Phase 1: Foundation (Lowest Risk)
1. **Stars System** (2-3 hours)
   - SQLite migration + index
   - API route (PUT /tasks/:id/star)
   - AppContext method (toggleTaskStar)
   - TaskCard UI (star icon button)
   - Reason: No architectural changes, follows existing CRUD pattern

2. **Resizable Columns** (3-4 hours)
   - HistoryPage state management
   - Resize event handlers
   - localStorage persistence
   - CSS styling for resize handles
   - Reason: Isolated to one component, no backend changes

### Phase 2: UI Adaptation (Medium Risk)
3. **Mobile Responsive Layout** (4-6 hours)
   - App.jsx layout changes (hamburger menu + overlay)
   - Sidebar enhancement (close button, onClose prop)
   - MyDayPage grid responsiveness
   - HistoryPage table → card view on mobile
   - Stats bar responsiveness
   - Reason: Requires testing across breakpoints, affects multiple components

### Phase 3: Service Integration (Higher Complexity)
4. **WhatsApp Connection Monitoring** (3-4 hours)
   - AppContext state expansion
   - Enhanced /api/whatsapp/status route
   - whatsapp.js service status method
   - SettingsPage UI (status display, QR code)
   - Sidebar indicator update
   - Reason: Requires coordination between polling, state management, and UI updates

**Total Estimated Time:** 12-17 hours

**Rationale for Order:**
- Start with backend-light features (stars, resize) to build confidence
- Mobile layout affects multiple components, so do it mid-way when familiar with structure
- WhatsApp monitoring is most complex (state + polling + service coordination), do last

## Component Boundaries

Clear separation of responsibilities:

| Component | Responsibility | Dependencies |
|-----------|---------------|--------------|
| **AppContext** | Global state + Socket.IO + API calls | None (top-level) |
| **App.jsx** | Routing + layout shell + sidebar state | AppContext, Router |
| **Sidebar** | Navigation + connection indicators | AppContext (read-only) |
| **MyDayPage** | Task list + filters + stats | AppContext (read + write) |
| **TaskCard** | Task display + star toggle | AppContext.toggleTaskStar |
| **HistoryPage** | Table + filters + resize | AppContext (read-only) + localStorage |
| **SettingsPage** | WhatsApp connection UI | AppContext.whatsapp + API calls |

**Rule:** Components never directly mutate global state - they call AppContext methods.

## Data Flow Patterns

### Pattern 1: Optimistic UI Updates (Stars)

```
User clicks star → Optimistic update (immediate UI change)
  ↓
API call (PUT /tasks/:id/star)
  ↓
Success: Socket.IO broadcast confirms update
  ↓
Failure: Rollback optimistic change, show error
```

**Why:** Instant feedback, resilient to network latency.

### Pattern 2: Polling with State Machine (WhatsApp)

```
Initial state: { status: 'disconnected' }
  ↓
User clicks "Connect" → { status: 'initializing' }
  ↓
Poll /api/whatsapp/status every 3 seconds
  ↓
QR code received → { status: 'qr_required', qrCode: '...' }
  ↓
Ready event → { status: 'ready' } → Stop polling
  ↓
Error → { status: 'error' } → Stop polling
```

**Why:** State machine prevents invalid states, polling captures async events.

### Pattern 3: Responsive Conditional Rendering

```
Window width < 1024px (lg breakpoint)
  ↓
Sidebar: translate-x-full (hidden off-canvas)
Hamburger menu: visible
Main content: full width
  ↓
Window width >= 1024px
  ↓
Sidebar: translate-x-0 (visible, fixed position)
Hamburger menu: hidden
Main content: margin-right to avoid overlap
```

**Why:** CSS-driven, no JavaScript window size listeners needed.

### Pattern 4: localStorage Sync (Resizable Columns)

```
Component mount → Load from localStorage
  ↓
User drags resize handle → Update React state
  ↓
useEffect watches state → Save to localStorage
  ↓
Component unmount/remount → Restore from localStorage
```

**Why:** Decoupled from AppContext (component-specific concern), persists across sessions.

**Source:** [Using WebSockets with React](https://tkdodo.eu/blog/using-web-sockets-with-react-query), [React State Management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Multiple WebSocket Connections
**What:** Creating new Socket.IO client instance in each component
**Why bad:** Performance overhead, duplicate event listeners, hard to debug
**Instead:** Single Socket.IO client in AppContext, components subscribe via context

### Anti-Pattern 2: Mixing localStorage and AppContext for Same Data
**What:** Storing starred tasks in both AppContext and localStorage
**Why bad:** State synchronization issues, source of truth ambiguity
**Instead:**
- AppContext for runtime state (fetched from server)
- localStorage only for UI preferences (column widths, theme)
- SQLite for persistent data (is_starred in tasks table)

### Anti-Pattern 3: Polling Without Cleanup
**What:** Starting WhatsApp status polling without cleanup function
**Why bad:** Memory leaks, polling continues after component unmounts
**Instead:** Return cleanup function from useEffect, clear interval on unmount

```javascript
// WRONG
useEffect(() => {
  const interval = setInterval(checkStatus, 3000);
}, []);

// RIGHT
useEffect(() => {
  const interval = setInterval(checkStatus, 3000);
  return () => clearInterval(interval); // Cleanup
}, []);
```

### Anti-Pattern 4: Overusing Breakpoints
**What:** Different component structures for mobile vs desktop (duplicate code)
**Why bad:** Code duplication, maintenance burden, inconsistent behavior
**Instead:** Same component structure, use Tailwind utilities to adjust layout:

```javascript
// WRONG
{isMobile ? <MobileTaskCard /> : <DesktopTaskCard />}

// RIGHT
<TaskCard className="flex-col sm:flex-row gap-2 sm:gap-4" />
```

### Anti-Pattern 5: Inline Styles for Responsive Design
**What:** JavaScript-driven responsive behavior with window.innerWidth checks
**Why bad:** Performance (resize event listeners), hydration issues (SSR), harder to maintain
**Instead:** CSS-driven with Tailwind breakpoints (Tailwind generates optimized CSS)

**Source:** [How to Avoid Multiple WebSocket Connections](https://getstream.io/blog/websocket-connections-react/)

## Scalability Considerations

### At 100 concurrent users:

| Concern | Current Architecture | v2.0 Changes |
|---------|---------------------|--------------|
| **Socket.IO connections** | 100 active connections, manageable | No change (same Socket.IO pattern) |
| **WhatsApp service** | Single singleton instance, handles all requests | Polling per client (100 × 3s intervals), use debouncing or server-side caching |
| **SQLite queries** | WAL mode enables concurrent reads | is_starred filter uses index, no performance impact |
| **localStorage** | Client-side only, no server impact | Column widths stored per browser, no scalability concern |

**Recommendation:** For 100+ users polling WhatsApp status, add server-side caching:

```javascript
// Server-side cache (routes/whatsapp.js)
let cachedStatus = null;
let cacheExpiry = 0;

router.get('/status', async (req, res) => {
  const now = Date.now();

  // Return cached status if still valid (3 second cache)
  if (cachedStatus && now < cacheExpiry) {
    return res.json(cachedStatus);
  }

  // Fetch fresh status
  const status = whatsappService.getStatus();
  const qrCode = await whatsappService.getQRCode();

  cachedStatus = {
    isReady: status.isReady,
    status: status.isReady ? 'ready' : qrCode ? 'qr_required' : 'disconnected',
    qrCode: qrCode
  };
  cacheExpiry = now + 3000; // Cache for 3 seconds

  res.json(cachedStatus);
});
```

### At 1000+ users:

| Concern | Mitigation |
|---------|-----------|
| **WhatsApp polling load** | Move to WebSocket event for status changes instead of polling |
| **localStorage conflicts** | No issue (client-side storage, isolated per browser) |
| **SQLite write contention** | Stars toggle is low-frequency write, index handles reads efficiently |
| **Socket.IO broadcast overhead** | Use rooms/namespaces to segment clients (e.g., per-employee rooms) |

**Recommendation:** Emit WhatsApp status changes via Socket.IO instead of polling:

```javascript
// whatsapp.js service
this.client.on('ready', () => {
  this.isReady = true;
  io.emit('whatsapp:status_changed', { status: 'ready' }); // Broadcast to all clients
});

this.client.on('qr', (qr) => {
  io.emit('whatsapp:status_changed', { status: 'qr_required', qrCode: qr });
});
```

## Testing Strategy

### Unit Tests (Component Level)

```javascript
// TaskCard star toggle
test('toggles star icon when clicked', async () => {
  const mockToggle = jest.fn();
  render(<TaskCard task={{ is_starred: 0 }} />, {
    wrapper: ({ children }) => (
      <AppContext.Provider value={{ toggleTaskStar: mockToggle }}>
        {children}
      </AppContext.Provider>
    )
  });

  fireEvent.click(screen.getByRole('button', { name: /star/i }));
  expect(mockToggle).toHaveBeenCalledWith(task.id);
});

// HistoryPage column resize
test('saves column widths to localStorage', () => {
  const { container } = render(<HistoryPage />);
  const resizeHandle = container.querySelector('.resize-handle');

  fireEvent.mouseDown(resizeHandle, { clientX: 100 });
  fireEvent.mouseMove(document, { clientX: 150 });
  fireEvent.mouseUp(document);

  const saved = JSON.parse(localStorage.getItem('eden_history_column_widths'));
  expect(saved.title).toBeGreaterThan(0);
});
```

### Integration Tests (Feature Level)

```javascript
// WhatsApp connection flow
test('displays QR code when connection initializing', async () => {
  fetchMock.mockResponse(JSON.stringify({ status: 'qr_required', qrCode: 'test-qr' }));

  render(<SettingsPage />);
  fireEvent.click(screen.getByText('התחבר לוואטסאפ'));

  await waitFor(() => {
    expect(screen.getByAltText('WhatsApp QR Code')).toBeInTheDocument();
  });
});

// Stars filter
test('filters tasks by starred status', () => {
  const tasks = [
    { id: 1, title: 'Task 1', is_starred: 1 },
    { id: 2, title: 'Task 2', is_starred: 0 }
  ];

  render(<AllTasksPage />, {
    wrapper: ({ children }) => (
      <AppContext.Provider value={{ tasks }}>
        {children}
      </AppContext.Provider>
    )
  });

  fireEvent.click(screen.getByLabelText('הצג רק מסומנים'));

  expect(screen.getByText('Task 1')).toBeInTheDocument();
  expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
});
```

### Responsive Tests (Visual Regression)

```javascript
// Mobile layout
test('shows hamburger menu on mobile', () => {
  window.innerWidth = 375; // iPhone width
  render(<App />);

  expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  expect(screen.queryByRole('navigation')).not.toBeVisible();
});

test('shows sidebar on desktop', () => {
  window.innerWidth = 1440;
  render(<App />);

  expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  expect(screen.getByRole('navigation')).toBeVisible();
});
```

## Summary

v2.0 features integrate cleanly with Eden's existing architecture:

1. **WhatsApp monitoring** extends AppContext state management pattern
2. **Stars system** uses existing Socket.IO + SQLite CRUD pattern
3. **Mobile responsive** leverages Tailwind's built-in breakpoint system
4. **Resizable columns** uses localStorage (no backend impact)

**No major architectural changes required.** All features build on existing foundations:
- AppContext for state management
- Socket.IO for real-time updates
- SQLite for persistence
- Tailwind for responsive UI

**Build order:** Stars → Resize → Mobile → WhatsApp (simple → complex)

---

## Sources

- [How to Use WebSockets in React for Real-Time Applications](https://oneuptime.com/blog/post/2026-01-15-websockets-react-real-time-applications/view)
- [Using WebSockets with React Query](https://tkdodo.eu/blog/using-web-sockets-with-react-query)
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mastering Responsive Design with Tailwind CSS](https://dev.to/hitesh_developer/mastering-responsive-design-with-tailwind-css-tips-and-tricks-1f39)
- [React Table Column Resizing Guide](https://www.simple-table.com/blog/react-table-column-resizing-guide)
- [TanStack Table Column Resizing Discussion](https://github.com/TanStack/table/discussions/2498)
- [How to Avoid Multiple WebSocket Connections in React](https://getstream.io/blog/websocket-connections-react/)
- [Best SQLite Solutions for React Native 2026](https://vibe.forem.com/eira-wexford/best-sqlite-solutions-for-react-native-app-development-in-2026-3b5l)
