# Phase 4: History & Archive - Research

**Researched:** 2026-01-24
**Domain:** Database querying, filtering, pagination, scheduled tasks, React UI patterns
**Confidence:** HIGH

## Summary

Phase 4 implements a comprehensive history and archive system for completed tasks with advanced filtering, statistics, and automated retention management. The research covers five critical domains: efficient SQLite querying with multiple filters, scheduled cleanup jobs for data retention, React UI patterns for filter-heavy interfaces, performance-optimized pagination, and aggregate statistics calculation.

**Key findings:**
- SQLite composite indexes are essential for multi-filter performance - order matters (most selective first)
- node-cron is the optimal choice for scheduled cleanup: lightweight, simple, standard cron syntax
- URL-based filter state (useSearchParams) enables shareable views and better UX than component state
- Cursor-based pagination outperforms LIMIT/OFFSET for large datasets with consistent O(1) performance
- Window functions (SUM() OVER()) provide efficient single-query percentage calculations

**Primary recommendation:** Use composite indexes on (status, completed_at, employee_id, system_id), implement cursor-based pagination for scalability, manage filter state via URL parameters for shareability, and schedule node-cron cleanup jobs with WAL mode transactions for safe bulk deletes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | Current (in project) | SQLite database driver | Already in use, synchronous API, prepared statements, transaction support |
| node-cron | ^3.x | Scheduled task runner | Lightweight (1 dependency), standard cron syntax, battle-tested for cleanup jobs |
| date-fns | Current (in project) | Date manipulation | Already used in project for date calculations |
| React Router | Current (in project) | URL state management | Already in project, useSearchParams for filter persistence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-tailwindcss-datepicker | ^1.x | Date range picker UI | Modern, Tailwind-native, supports range selection with dayjs |
| @tanstack/react-virtual | ^3.x | Virtual scrolling | IF dataset exceeds 1000+ tasks (optional, start with pagination) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron | node-schedule | More flexibility (date-based scheduling) but heavier, overkill for simple daily cleanup |
| Cursor pagination | LIMIT/OFFSET | Simpler to implement but degrades performance as offset increases (O(n) vs O(1)) |
| react-tailwindcss-datepicker | Flowbite datepicker | Similar features but requires separate Flowbite dependency |
| URL state | Component state (useState) | Simpler but loses shareability, persistence, browser back/forward support |

**Installation:**
```bash
npm install node-cron react-tailwindcss-datepicker
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── routes/
│   └── history.js           # History endpoint with filtering
├── services/
│   └── dataRetention.js     # Cleanup logic (cron job)
└── database/
    └── migrations/          # Index creation scripts

client/src/
├── pages/
│   └── HistoryPage.jsx      # Main history view
├── components/
│   ├── HistoryFilters.jsx   # Filter controls
│   ├── HistoryStats.jsx     # Statistics display
│   └── HistoryTable.jsx     # Results table/list
└── hooks/
    └── useHistoryFilters.js # URL state management
```

### Pattern 1: Multi-Filter Query with Composite Index
**What:** Build dynamic WHERE clause based on active filters, use composite index for performance
**When to use:** Any query with 2+ optional filter conditions

**Example:**
```javascript
// Source: https://www.sqlitetutorial.net/sqlite-index/
// Migration: Create composite index
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_history
  ON tasks(status, completed_at DESC, employee_id, system_id)
`);

// Query builder pattern for dynamic filters
function buildHistoryQuery(filters) {
  const conditions = ['status = ?'];
  const params = ['completed'];

  if (filters.startDate) {
    conditions.push('completed_at >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('completed_at <= ?');
    params.push(filters.endDate);
  }

  if (filters.employeeId) {
    conditions.push('employee_id = ?');
    params.push(filters.employeeId);
  }

  if (filters.systemId) {
    conditions.push('system_id = ?');
    params.push(filters.systemId);
  }

  const whereClause = conditions.join(' AND ');

  return {
    sql: `
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE ${whereClause}
      ORDER BY t.completed_at DESC
      LIMIT ? OFFSET ?
    `,
    params: [...params, filters.limit || 50, filters.offset || 0]
  };
}

// Usage with prepared statement
const query = buildHistoryQuery(filters);
const stmt = db.prepare(query.sql);
const results = stmt.all(...query.params);
```

### Pattern 2: Statistics with Window Functions
**What:** Calculate aggregate statistics (count, percentage) in single query
**When to use:** Dashboard stats, summary metrics

**Example:**
```javascript
// Source: https://www.baeldung.com/sql/calculate-percentage
const stats = db.prepare(`
  SELECT
    COUNT(*) as total_completed,
    SUM(CASE WHEN time_delta_minutes > 0 THEN 1 ELSE 0 END) as total_late,
    ROUND(
      100.0 * SUM(CASE WHEN time_delta_minutes <= 0 THEN 1 ELSE 0 END) / COUNT(*),
      1
    ) as on_time_percentage
  FROM tasks
  WHERE status = 'completed'
    AND completed_at >= ?
    AND completed_at <= ?
`).get(startDate, endDate);

// Result: { total_completed: 102, total_late: 12, on_time_percentage: 88.2 }
```

### Pattern 3: URL-Based Filter State Management
**What:** Sync filter state with URL query parameters for shareability and persistence
**When to use:** Any filtering UI where users benefit from bookmarkable/shareable views

**Example:**
```javascript
// Source: https://blog.logrocket.com/url-state-usesearchparams/
// hooks/useHistoryFilters.js
import { useSearchParams } from 'react-router-dom';

export function useHistoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    startDate: searchParams.get('start') || '',
    endDate: searchParams.get('end') || '',
    employeeId: searchParams.get('employee') || '',
    systemId: searchParams.get('system') || '',
    locationId: searchParams.get('location') || '',
  };

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return { filters, updateFilter, clearFilters };
}

// HistoryPage.jsx
function HistoryPage() {
  const { filters, updateFilter, clearFilters } = useHistoryFilters();

  // Fetch data whenever filters change
  useEffect(() => {
    fetchHistory(filters);
  }, [filters]);

  return (
    <div>
      <HistoryFilters
        filters={filters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />
      <HistoryResults data={results} />
    </div>
  );
}
```

### Pattern 4: Scheduled Cleanup with node-cron
**What:** Automated deletion of records older than retention period
**When to use:** Data retention policies, automatic archival

**Example:**
```javascript
// Source: https://github.com/node-cron/node-cron
// services/dataRetention.js
const cron = require('node-cron');
const { db } = require('../database/schema');

function cleanupOldTasks() {
  try {
    console.log('Starting task cleanup...');

    // Use transaction for safe bulk delete
    const stmt = db.prepare(`
      DELETE FROM tasks
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-2 years')
    `);

    const result = db.transaction(() => {
      return stmt.run();
    })();

    console.log(`Cleanup complete: ${result.changes} tasks deleted`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Schedule to run daily at 2:00 AM
function initializeDataRetention() {
  // Cron format: second minute hour day month weekday
  cron.schedule('0 2 * * *', cleanupOldTasks, {
    timezone: "Asia/Jerusalem"
  });

  console.log('Data retention cron job initialized (runs daily at 2:00 AM)');
}

module.exports = { initializeDataRetention, cleanupOldTasks };

// server/index.js
const { initializeDataRetention } = require('./services/dataRetention');
initializeDataRetention();
```

### Pattern 5: Cursor-Based Pagination for Large Datasets
**What:** Use indexed cursor (last seen ID) instead of OFFSET for consistent performance
**When to use:** Datasets with 1000+ records or deep pagination

**Example:**
```javascript
// Source: https://dev.to/jacktt/comparing-limit-offset-and-cursor-pagination-1n81
// GET /api/history?cursor=12345&limit=50
router.get('/history', (req, res) => {
  const { cursor, limit = 50 } = req.query;

  let sql, params;

  if (cursor) {
    // Fetch next page after cursor
    sql = `
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.status = 'completed' AND t.id < ?
      ORDER BY t.id DESC
      LIMIT ?
    `;
    params = [cursor, parseInt(limit) + 1]; // Fetch +1 to detect hasMore
  } else {
    // First page
    sql = `
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.status = 'completed'
      ORDER BY t.id DESC
      LIMIT ?
    `;
    params = [parseInt(limit) + 1];
  }

  const results = db.prepare(sql).all(...params);
  const hasMore = results.length > limit;
  const tasks = hasMore ? results.slice(0, -1) : results;
  const nextCursor = hasMore ? tasks[tasks.length - 1].id : null;

  res.json({ tasks, nextCursor, hasMore });
});
```

### Anti-Patterns to Avoid
- **Building SQL with string concatenation:** Vulnerable to SQL injection. Always use parameterized queries with `?` placeholders.
- **Using OFFSET for deep pagination:** Performance degrades linearly (O(n)). Use cursor-based pagination for scalability.
- **Storing filter state only in component state:** Users can't share/bookmark filtered views. Use URL parameters.
- **Running cleanup job synchronously in request:** Blocks request handling. Use scheduled background job.
- **Creating single-column indexes for multi-filter queries:** Forces SQLite to pick one index. Use composite index covering all filter columns.
- **Deleting without transaction:** Risky for bulk operations. Wrap in transaction for atomicity and rollback capability.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range picker UI | Custom calendar component | react-tailwindcss-datepicker | Handles edge cases (leap years, month boundaries, time zones), accessibility, keyboard navigation |
| Cron job scheduling | setInterval with manual time calculations | node-cron | Standard cron syntax, timezone support, handles DST transitions, battle-tested |
| URL state management | Manual searchParams parsing/serialization | React Router useSearchParams | Browser history integration, type safety with custom hooks, standard API |
| SQL injection prevention | Manual string escaping | better-sqlite3 prepared statements | Prevents all injection vectors, optimizes query plan caching |
| Bulk delete optimization | Loop with individual DELETE statements | Transaction-wrapped prepared statement | 100x faster (single commit vs N commits), atomic operation |
| Virtual scrolling | Custom viewport calculations | @tanstack/react-virtual (if needed) | Handles dynamic heights, scroll position preservation, resize handling |
| Date formatting | Manual toISOString/substring | date-fns format() | Already in project, handles locale, time zones, edge cases |

**Key insight:** Data retention, SQL query building, and date handling are more complex than they appear. SQLite query optimization requires understanding index usage (EXPLAIN QUERY PLAN), scheduled jobs must handle timezone/DST correctly, and date range filtering has many edge cases (null values, time zone conversions, inclusive/exclusive ranges). Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Missing or Incorrect Composite Index Column Order
**What goes wrong:** Creating indexes on individual columns (employee_id, system_id separately) or composite index with wrong column order leads to slow queries when filtering by multiple criteria.

**Why it happens:** SQLite can only use one index per query (or merge multiple with overhead). Wrong column order prevents index usage for common filter combinations.

**How to avoid:**
- Create composite index with columns in order: constant filters first (status), then most selective variable filter (completed_at), then remaining filters
- Use EXPLAIN QUERY PLAN to verify index usage: `EXPLAIN QUERY PLAN SELECT ... WHERE status = ? AND completed_at > ? AND employee_id = ?`
- Look for "USING INDEX idx_tasks_history" in output, not "SCAN TABLE tasks"

**Warning signs:**
- History page slows down with 1000+ completed tasks
- EXPLAIN shows "SCAN TABLE" instead of "USING INDEX"
- Query time increases as dataset grows

### Pitfall 2: OFFSET Pagination Performance Degradation
**What goes wrong:** Using LIMIT/OFFSET for pagination works fine initially but becomes slow as users navigate to later pages. Page 100 (OFFSET 5000) takes significantly longer than page 1.

**Why it happens:** SQLite must scan and discard OFFSET rows before returning results. OFFSET 5000 means reading and throwing away 5000 rows every query - O(n) time complexity.

**How to avoid:**
- Start with simple LIMIT/OFFSET for MVP (acceptable for <1000 records)
- Monitor query performance as dataset grows
- Switch to cursor-based pagination when OFFSET values exceed ~500 or response time degrades
- Cursor pagination uses indexed WHERE clause (id < cursor) which is O(1)

**Warning signs:**
- Response time increases as page number increases
- Last page loads much slower than first page
- Query time jumps when OFFSET > 1000

### Pitfall 3: Filter State Lost on Page Refresh
**What goes wrong:** User applies filters, finds relevant tasks, refreshes page - all filters reset to defaults. Frustrating UX, especially when sharing links.

**Why it happens:** Filter state stored in component state (useState) is lost on unmount/refresh. URLs don't reflect current view.

**How to avoid:**
- Store all filter state in URL query parameters via useSearchParams
- Initialize filter state from URL on mount
- Update URL when filters change (setSearchParams)
- Benefits: shareable links, browser back/forward works, persistence across refresh

**Warning signs:**
- Users complain about losing filtered view on refresh
- Can't share specific filtered view with colleagues
- Browser back button doesn't undo filter changes

### Pitfall 4: Timezone Confusion in Date Range Filtering
**What goes wrong:** User selects "January 1-31, 2025" but results include/exclude wrong tasks due to timezone mismatches between client, server, and database.

**Why it happens:**
- Client sends date in local timezone
- Server interprets in server timezone
- SQLite stores as TEXT (ISO 8601) or Unix timestamp
- Comparisons happen in different timezone contexts

**How to avoid:**
- Store completed_at as ISO 8601 string with timezone info OR Unix timestamp (already in schema)
- When filtering by date range, convert user's date to start-of-day and end-of-day in consistent timezone
- Use date-fns with explicit timezone handling or store dates in UTC
- Document timezone behavior (e.g., "all dates in Israel time")

**Warning signs:**
- Tasks completed on Jan 31 23:00 don't appear in "January" filter
- Off-by-one-day errors in filtered results
- Different results when querying from different client timezones

### Pitfall 5: Cleanup Job Without Transaction or Logging
**What goes wrong:** Scheduled cleanup job crashes mid-execution, deletes half the intended records, and leaves database in inconsistent state. No way to know what was deleted or why it failed.

**Why it happens:**
- Bulk DELETE without transaction commits each row individually
- Crash during delete leaves partial completion
- No error handling or logging makes debugging impossible

**How to avoid:**
- Wrap cleanup DELETE in db.transaction() for atomicity (all-or-nothing)
- Add comprehensive logging: start time, row count before, rows deleted, end time, errors
- Add error handling with try/catch and rollback on failure
- Consider soft delete first (add deleted_at column) before hard delete for safety
- Test cleanup job with large datasets to verify transaction behavior

**Warning signs:**
- Cleanup job logs show errors but deletes still happen
- Inconsistent number of deleted records between runs
- Database locks or corruption after cleanup
- Can't reproduce or debug cleanup failures

### Pitfall 6: Percentage Calculation Integer Division
**What goes wrong:** Statistics show "88% on-time" as "0" or incorrect values.

**Why it happens:** SQL division of integers returns integer (12/100 = 0). Need to force decimal division.

**How to avoid:**
- Multiply by 100.0 (with decimal) not 100
- Example: `100.0 * late_count / total_count` not `100 * late_count / total_count`
- Use ROUND() for display precision: `ROUND(100.0 * x / y, 1)` for one decimal place

**Warning signs:**
- Percentages always show 0 or 100
- Statistics don't match manual calculation
- Loss of precision in percentage values

### Pitfall 7: Not Enabling WAL Mode for Better-sqlite3
**What goes wrong:** Write operations block reads, poor concurrency, slower bulk operations.

**Why it happens:** Default SQLite mode uses rollback journal with exclusive locks.

**How to avoid:**
- Enable WAL mode in database initialization: `db.pragma('journal_mode = WAL')`
- WAL allows concurrent reads during writes, improves performance for 1GB+ databases
- Combine with appropriate cache size: `db.pragma('cache_size = 50000')`

**Warning signs:**
- Cleanup job blocks all read queries
- History page freezes during task completion writes
- Poor performance with concurrent users

## Code Examples

Verified patterns from official sources:

### Complete History Route with Filtering and Stats
```javascript
// Source: Combined patterns from research
// routes/history.js
const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// GET /api/history?startDate=2025-01-01&endDate=2025-01-31&employee=5&system=3&limit=50&offset=0
router.get('/', (req, res) => {
  try {
    const {
      startDate,
      endDate,
      employeeId,
      systemId,
      locationId,
      limit = 50,
      offset = 0
    } = req.query;

    // Build dynamic WHERE clause
    const conditions = ['t.status = ?'];
    const params = ['completed'];

    // Default to last 7 days if no date range specified
    if (startDate) {
      conditions.push('t.completed_at >= ?');
      params.push(startDate);
    } else {
      conditions.push('t.completed_at >= datetime("now", "-7 days")');
    }

    if (endDate) {
      conditions.push('t.completed_at <= ?');
      params.push(endDate);
    }

    if (employeeId) {
      conditions.push('t.employee_id = ?');
      params.push(employeeId);
    }

    if (systemId) {
      conditions.push('t.system_id = ?');
      params.push(systemId);
    }

    if (locationId) {
      conditions.push('s.location_id = ?');
      params.push(locationId);
    }

    const whereClause = conditions.join(' AND ');

    // Get filtered tasks
    const tasksQuery = `
      SELECT t.*,
             s.name as system_name,
             e.name as employee_name,
             l.name as location_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE ${whereClause}
      ORDER BY t.completed_at DESC
      LIMIT ? OFFSET ?
    `;

    const tasks = db.prepare(tasksQuery).all(...params, limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      WHERE ${whereClause}
    `;

    const { total } = db.prepare(countQuery).get(...params);

    // Get statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_completed,
        SUM(CASE WHEN t.time_delta_minutes > 0 THEN 1 ELSE 0 END) as total_late,
        ROUND(
          100.0 * SUM(CASE WHEN t.time_delta_minutes <= 0 THEN 1 ELSE 0 END) / COUNT(*),
          1
        ) as on_time_percentage
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      WHERE ${whereClause}
    `;

    const stats = db.prepare(statsQuery).get(...params);

    res.json({
      tasks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      },
      stats
    });

  } catch (error) {
    console.error('History query failed:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
```

### React History Page with Filters
```javascript
// Source: https://blog.logrocket.com/url-state-usesearchparams/
// pages/HistoryPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Datepicker from 'react-tailwindcss-datepicker';

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Parse filters from URL
  const filters = {
    startDate: searchParams.get('start') || '',
    endDate: searchParams.get('end') || '',
    employeeId: searchParams.get('employee') || '',
    systemId: searchParams.get('system') || '',
    locationId: searchParams.get('location') || '',
  };

  // Update single filter
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('offset'); // Reset pagination on filter change
    setSearchParams(newParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Fetch history when filters change
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const queryString = searchParams.toString();
        const response = await fetch(`/api/history?${queryString}`);
        const data = await response.json();
        setTasks(data.tasks);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [searchParams]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">היסטוריית משימות</h1>

      {/* Statistics */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600">סך הכל הושלמו</p>
              <p className="text-2xl font-bold">{stats.total_completed}</p>
            </div>
            <div>
              <p className="text-gray-600">באיחור</p>
              <p className="text-2xl font-bold text-red-600">{stats.total_late}</p>
            </div>
            <div>
              <p className="text-gray-600">אחוז הצלחה</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.on_time_percentage}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-4">סינון</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-2">טווח תאריכים</label>
            <Datepicker
              value={{
                startDate: filters.startDate,
                endDate: filters.endDate
              }}
              onChange={(newValue) => {
                updateFilter('start', newValue?.startDate || '');
                updateFilter('end', newValue?.endDate || '');
              }}
              displayFormat="DD/MM/YYYY"
              i18n="he"
            />
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">עובד</label>
            <select
              value={filters.employeeId}
              onChange={(e) => updateFilter('employee', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">כל העובדים</option>
              {/* Populate from API */}
            </select>
          </div>

          {/* System Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">מערכת</label>
            <select
              value={filters.systemId}
              onChange={(e) => updateFilter('system', e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">כל המערכות</option>
              {/* Populate from API */}
            </select>
          </div>
        </div>

        <button
          onClick={clearFilters}
          className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          נקה סינון
        </button>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <p className="p-8 text-center">טוען...</p>
        ) : tasks.length === 0 ? (
          <p className="p-8 text-center text-gray-500">לא נמצאו משימות</p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-gray-600">
                      {task.employee_name} • {task.system_name}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-600">
                      הושלם: {new Date(task.completed_at).toLocaleDateString('he-IL')}
                    </p>
                    {task.time_delta_minutes > 0 && (
                      <span className="text-sm text-red-600">באיחור</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Data Retention Service
```javascript
// Source: https://github.com/node-cron/node-cron
// services/dataRetention.js
const cron = require('node-cron');
const { db } = require('../database/schema');

/**
 * Delete completed tasks older than 2 years
 * Runs in transaction for safety
 */
function cleanupOldTasks() {
  const startTime = new Date();
  console.log(`[Data Retention] Starting cleanup at ${startTime.toISOString()}`);

  try {
    // Get count before deletion for logging
    const beforeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-2 years')
    `).get();

    console.log(`[Data Retention] Found ${beforeCount.count} tasks to delete`);

    if (beforeCount.count === 0) {
      console.log('[Data Retention] No tasks to delete');
      return;
    }

    // Delete in transaction
    const deleteStmt = db.prepare(`
      DELETE FROM tasks
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-2 years')
    `);

    const result = db.transaction(() => {
      return deleteStmt.run();
    })();

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(
      `[Data Retention] Cleanup complete: ${result.changes} tasks deleted in ${duration}ms`
    );

    // Optional: Log to database for audit trail
    db.prepare(`
      INSERT INTO system_logs (event_type, details, created_at)
      VALUES (?, ?, ?)
    `).run(
      'data_retention_cleanup',
      JSON.stringify({ deleted: result.changes, duration }),
      new Date().toISOString()
    );

  } catch (error) {
    console.error('[Data Retention] Cleanup failed:', error);
    // Consider sending alert email/notification on failure
  }
}

/**
 * Initialize scheduled cleanup job
 * Runs daily at 2:00 AM Israel time
 */
function initializeDataRetention() {
  // Validate cron expression
  if (!cron.validate('0 2 * * *')) {
    console.error('[Data Retention] Invalid cron expression');
    return;
  }

  // Schedule job
  cron.schedule('0 2 * * *', cleanupOldTasks, {
    timezone: "Asia/Jerusalem",
    scheduled: true
  });

  console.log('[Data Retention] Cron job initialized (daily at 2:00 AM Israel time)');

  // For testing: Expose manual trigger
  return { cleanupOldTasks };
}

module.exports = { initializeDataRetention, cleanupOldTasks };
```

### Database Migration for Indexes
```javascript
// Source: https://www.sqlitetutorial.net/sqlite-index/
// database/migrations/004_history_indexes.js

function createHistoryIndexes(db) {
  console.log('Creating history query indexes...');

  // Composite index for history queries with filters
  // Order: constant (status) -> most selective (completed_at) -> filters
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_history
    ON tasks(status, completed_at DESC, employee_id, system_id)
  `);

  // Index for data retention cleanup query
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_retention
    ON tasks(status, completed_at)
  `);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Increase cache size (50000 pages * 4KB = ~200MB)
  db.pragma('cache_size = 50000');

  console.log('History indexes created successfully');

  // Verify index usage
  const plan = db.prepare(`
    EXPLAIN QUERY PLAN
    SELECT * FROM tasks
    WHERE status = 'completed'
      AND completed_at >= datetime('now', '-7 days')
      AND employee_id = 1
  `).all();

  console.log('Query plan:', plan);
}

module.exports = { createHistoryIndexes };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LIMIT/OFFSET pagination | Cursor-based pagination | 2020-2023 | Consistent O(1) performance vs O(n), critical for large datasets |
| Component state for filters | URL query parameters (useSearchParams) | React Router v6 (2021) | Shareable views, browser back/forward support, persistence |
| Rollback journal | WAL mode | SQLite 3.7.0 (2010), widely adopted 2020+ | Concurrent reads during writes, better performance |
| node-schedule | node-cron | 2019-2023 shift | Lighter weight (1 dependency vs many), standard cron syntax |
| Manual window calculations | @tanstack/react-virtual | 2023-2025 | Replaces deprecated react-virtualized, better hooks support |
| Integer percentage | Decimal precision (100.0) | Always existed, common mistake | Accurate percentage calculations |

**Deprecated/outdated:**
- **react-virtualized**: Deprecated in favor of @tanstack/react-virtual (better performance, modern React hooks)
- **OFFSET pagination for large datasets**: Still works but inefficient, cursor-based is modern standard
- **Storing dates as TEXT without timezone**: Leads to timezone bugs, prefer ISO 8601 with timezone or Unix timestamp
- **Running cron jobs without timezone config**: Can cause DST issues, always specify timezone

## Open Questions

Things that couldn't be fully resolved:

1. **Location filtering requirement**
   - What we know: Requirements mention filtering by location (HA-06)
   - What's unclear: Current schema shows locations table but no direct link from tasks to locations (tasks -> systems, but systems might have location_id)
   - Recommendation: Verify if systems table has location_id foreign key. If not, add migration: `ALTER TABLE systems ADD COLUMN location_id INTEGER REFERENCES locations(id)`. Filter via JOIN through systems.

2. **Soft delete vs hard delete for retention**
   - What we know: Requirements specify deletion after 2 years (HA-08)
   - What's unclear: Should tasks be soft-deleted (marked as deleted but kept) or hard-deleted (permanently removed)?
   - Recommendation: Start with hard delete per requirements, but consider adding soft delete first (deleted_at column) for safety. Can hard-delete soft-deleted records after 30 days grace period.

3. **Statistics calculation scope**
   - What we know: Requirements ask for "basic statistics" (HA-07)
   - What's unclear: Should statistics be calculated only on filtered results or always show global stats?
   - Recommendation: Calculate stats on filtered results (more useful for analysis), but consider showing both filtered and global stats for context.

4. **Pagination strategy selection**
   - What we know: Need to display potentially thousands of tasks
   - What's unclear: Expected dataset size - 100s, 1000s, or 10,000s of completed tasks?
   - Recommendation: Start with simple LIMIT/OFFSET (easier implementation), monitor performance, switch to cursor-based if query time exceeds 500ms or dataset exceeds 5000 tasks.

5. **Virtual scrolling necessity**
   - What we know: Large datasets can benefit from virtual scrolling
   - What's unclear: Is pagination sufficient or do users need infinite scroll view?
   - Recommendation: Start with pagination (simpler UX, better for reports). Add @tanstack/react-virtual only if users explicitly request infinite scroll or if dataset exceeds 10,000 tasks.

## Sources

### Primary (HIGH confidence)
- [SQLite Index Tutorial](https://www.sqlitetutorial.net/sqlite-index/) - Composite index strategies, performance optimization
- [SQLite Query Optimizer Overview](https://sqlite.org/optoverview.html) - Official documentation on how SQLite uses indexes
- [better-sqlite3 API Documentation](https://wchargin.com/better-sqlite3/api.html) - Prepared statements, transactions
- [node-cron GitHub](https://github.com/node-cron/node-cron) - Cron syntax, scheduling options
- [React Router Search Params Guide](https://www.robinwieruch.de/react-router-search-params/) - URL state management patterns
- [SQLite WAL Mode](https://sqlite.org/wal.html) - Write-ahead logging for better concurrency

### Secondary (MEDIUM confidence)
- [Comparing LIMIT/OFFSET vs Cursor Pagination](https://dev.to/jacktt/comparing-limit-offset-and-cursor-pagination-1n81) - Performance comparison, implementation patterns
- [Better Stack: Node.js Schedulers Comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) - node-cron vs alternatives (2025)
- [LogRocket: URL State with useSearchParams](https://blog.logrocket.com/url-state-usesearchparams/) - React Router v6 patterns
- [Baeldung: SQL Percentage Calculation](https://www.baeldung.com/sql/calculate-percentage) - Window functions, aggregate best practices
- [Android Developers: SQLite Performance Best Practices](https://developer.android.com/topic/performance/sqlite-performance-best-practices) - Composite indexes, transaction optimization
- [TanStack Virtual vs React-Window Comparison](https://mashuktamim.medium.com/react-virtualization-showdown-tanstack-virtualizer-vs-react-window-for-sticky-table-grids-69b738b36a83) - Performance benchmarks (2025)

### Tertiary (LOW confidence - verify during implementation)
- [react-tailwindcss-datepicker npm](https://www.npmjs.com/package/react-tailwindcss-datepicker) - Date picker library choice
- [Optimizing Large Lists: Virtualization vs Pagination](https://www.ignek.com/blog/optimizing-large-lists-in-react-virtualization-vs-pagination/) - When to use each approach
- [SQLite Delete Query Tutorial](https://www.sqlitetutorial.net/sqlite-delete/) - DELETE statement patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - better-sqlite3, node-cron, React Router already in project; date picker is straightforward addition
- Architecture: HIGH - Patterns verified from official docs (SQLite, React Router), battle-tested approaches
- Pitfalls: HIGH - Based on documented common issues (composite index order, OFFSET performance, timezone handling)
- Performance recommendations: MEDIUM-HIGH - Cursor pagination and composite indexes well-documented, but optimal strategy depends on actual dataset size
- Virtual scrolling necessity: MEDIUM - May not be needed depending on dataset size and UX preferences

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain, libraries mature)

**Notes:**
- All core libraries (better-sqlite3, node-cron, React Router) are stable and widely adopted
- Pagination strategy should be validated with actual data volume during implementation
- Composite index column order must be verified with EXPLAIN QUERY PLAN on real queries
- Consider creating location_id foreign key in systems table if not already present for location filtering
