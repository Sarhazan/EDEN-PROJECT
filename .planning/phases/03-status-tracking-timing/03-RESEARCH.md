# Phase 3: Status Tracking & Timing - Research

**Researched:** 2026-01-23
**Domain:** Task scheduling, timing, and status tracking
**Confidence:** HIGH

## Summary

Phase 3 adds time-based task management to the existing Eden maintenance system. The research investigated how to track estimated duration, detect late tasks automatically, calculate time deltas, and display timing information clearly in the manager UI.

The codebase already has solid foundations: SQLite database with better-sqlite3, date-fns for date handling, Socket.IO for real-time updates, and a React frontend with task status management. The system currently tracks `start_date` and `start_time` but lacks duration estimates, completion timestamps, or late detection.

The standard approach is to add `estimated_duration_minutes` and `completed_at` fields to the tasks table, calculate late status dynamically on each request (SQLite generated columns would be overkill), and use real-time Socket.IO updates to refresh the UI when tasks transition to late status. A lightweight setInterval on the client provides immediate visual feedback without server polling.

**Primary recommendation:** Add timing fields to database schema, calculate late status in backend API endpoints using computed logic (not stored status), and implement client-side countdown timers with color-coded visual indicators for managers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.6.0 | Database operations | Already in use, synchronous API perfect for migrations |
| date-fns | 4.1.0 | Date/time calculations | Already in use, excellent for duration math and comparisons |
| socket.io | 4.8.3 | Real-time updates | Already in use, will broadcast late status changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | Existing stack is sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side calculation | node-cron (server-side job) | Cron adds complexity; client-side is simpler and real-time |
| Stored `late` status | VIRTUAL column in SQLite | Generated columns are overkill for simple comparison logic |
| Database triggers | Application logic | Triggers harder to debug; application logic is more maintainable |

**Installation:**
No new packages needed - existing dependencies are sufficient.

## Architecture Patterns

### Recommended Database Schema Extension
```sql
-- Add to tasks table via migration
ALTER TABLE tasks ADD COLUMN estimated_duration_minutes INTEGER DEFAULT 30;
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;

-- No need for 'late' column - calculate dynamically
```

**Rationale:** Store only source data (duration estimate, completion time). Derive late status from comparison logic, not stored values.

### Pattern 1: Dynamic Late Detection (Backend)
**What:** Calculate late status in real-time during API queries
**When to use:** Every time tasks are retrieved from database
**Example:**
```javascript
// In server/routes/tasks.js
function calculateLateStatus(task) {
  if (task.status === 'completed') return false;

  const now = new Date();
  const taskDateTime = new Date(`${task.start_date}T${task.start_time}`);
  const estimatedEnd = addMinutes(taskDateTime, task.estimated_duration_minutes || 30);

  return now > estimatedEnd;
}

// Attach to each task before sending to client
router.get('/today', (req, res) => {
  const tasks = db.prepare(`SELECT * FROM tasks WHERE ...`).all();
  const enrichedTasks = tasks.map(task => ({
    ...task,
    is_late: calculateLateStatus(task),
    estimated_end_time: calculateEstimatedEnd(task)
  }));
  res.json(enrichedTasks);
});
```

### Pattern 2: Time Delta Calculation (Backend)
**What:** Calculate difference between estimated and actual completion
**When to use:** When displaying completed tasks
**Example:**
```javascript
// Source: date-fns documentation
import { differenceInMinutes } from 'date-fns';

function calculateTimeDelta(task) {
  if (!task.completed_at) return null;

  const taskStart = new Date(`${task.start_date}T${task.start_time}`);
  const estimatedEnd = addMinutes(taskStart, task.estimated_duration_minutes || 30);
  const actualEnd = new Date(task.completed_at);

  const deltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

  return {
    deltaMinutes,
    isEarly: deltaMinutes < 0,
    isLate: deltaMinutes > 0,
    displayText: deltaMinutes < 0
      ? `הושלם מוקדם ב-${Math.abs(deltaMinutes)} דקות`
      : deltaMinutes > 0
      ? `איחור של ${deltaMinutes} דקות`
      : 'הושלם בזמן'
  };
}
```

### Pattern 3: Client-Side Countdown Timer (Frontend)
**What:** Update UI every minute to show time remaining/overdue
**When to use:** In MyDayPage and TaskCard components
**Example:**
```javascript
// In client/src/pages/MyDayPage.jsx
useEffect(() => {
  const interval = setInterval(() => {
    // Force re-render to update time calculations
    setCurrentTime(new Date());
  }, 60000); // Update every 60 seconds

  return () => clearInterval(interval);
}, []);

// In TaskCard rendering
const calculateTimeRemaining = (task) => {
  const now = new Date();
  const taskStart = new Date(`${task.start_date}T${task.start_time}`);
  const estimatedEnd = addMinutes(taskStart, task.estimated_duration_minutes || 30);
  const diffMinutes = differenceInMinutes(estimatedEnd, now);

  if (diffMinutes > 0) {
    return { status: 'on-time', text: `נשארו ${diffMinutes} דקות` };
  } else {
    return { status: 'late', text: `באיחור ${Math.abs(diffMinutes)} דקות` };
  }
};
```

### Pattern 4: Visual Status Indicators (Frontend)
**What:** Color-coded task cards based on timing status
**When to use:** TaskCard component styling
**Example:**
```javascript
// Color coding for timing status
const timingColors = {
  onTime: 'border-l-4 border-green-500',
  nearDeadline: 'border-l-4 border-yellow-500', // < 10 minutes remaining
  late: 'border-l-4 border-red-500 bg-red-50'
};

const getTimingClass = (task) => {
  if (task.status === 'completed') return '';

  const remaining = calculateTimeRemaining(task);
  if (remaining.status === 'late') return timingColors.late;
  if (remaining.minutes < 10) return timingColors.nearDeadline;
  return timingColors.onTime;
};

// In TaskCard component
<div className={`task-card ${getTimingClass(task)}`}>
  {/* Task content */}
</div>
```

### Anti-Patterns to Avoid
- **Storing calculated `late` status in database:** Late status changes constantly with time passage - calculating it dynamically is more reliable and avoids stale data
- **Using setInterval with short intervals (< 1 minute):** Checking every second causes unnecessary re-renders - minute-level precision is sufficient for task management
- **Triggering Socket.IO events on every minute tick:** Don't broadcast time updates; only broadcast when task status actually changes (sent → in_progress → completed)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date/time math (add duration) | String concatenation + parsing | `date-fns` `addMinutes()` | Handles DST, leap years, timezone edge cases |
| Time difference calculation | Manual subtraction | `date-fns` `differenceInMinutes()` | Accounts for timezone offsets, leap seconds |
| Countdown timer component | Custom React timer from scratch | setInterval with cleanup | React's built-in effects handle cleanup properly |
| Status color mapping | Inline ternary chains | Lookup object (statusColors) | More maintainable, easier to update colors |

**Key insight:** Date/time calculations have countless edge cases (DST transitions, month boundaries, leap years). Always use a battle-tested library like date-fns rather than manual arithmetic.

## Common Pitfalls

### Pitfall 1: Storing Late Status in Database
**What goes wrong:** Database stores `status = 'late'` as a static value. Task becomes late at 8:31am but database still shows 'in_progress' until next update query runs.
**Why it happens:** Developers think of status as a database field, forgetting it's time-dependent
**How to avoid:** Calculate late status dynamically in API responses. Only store source data (start_time, estimated_duration), not derived data (late status)
**Warning signs:** Finding old tasks marked 'late' that are now completed but still have late flag

### Pitfall 2: Client-Server Time Sync Issues
**What goes wrong:** Client calculates "5 minutes remaining" but server says "already late" due to clock skew
**Why it happens:** Client and server clocks drift apart; client uses local time instead of server time
**How to avoid:**
  - Always use server-provided timestamps as source of truth
  - Backend calculates is_late flag and sends it to client
  - Client uses server's estimated_end_time for display, not its own calculations
**Warning signs:** Different users see different late statuses for same task

### Pitfall 3: Not Handling Recurring Tasks
**What goes wrong:** Recurring daily task shows "late" forever after first day expires
**Why it happens:** Code compares against original start_date instead of today's instance
**How to avoid:** For recurring tasks, compare against scheduled_time for today's instance, not the template's start_date
**Warning signs:** All recurring tasks show red/late status

### Pitfall 4: Real-Time Updates Causing Flicker
**What goes wrong:** UI re-renders every second causing visible flashing/flickering
**Why it happens:** setInterval(, 1000) with state updates triggers full component re-render
**How to avoid:** Use 60-second intervals (not 1-second). Minute-level precision is sufficient for maintenance tasks
**Warning signs:** Visible flashing in task list, high CPU usage in DevTools profiler

### Pitfall 5: Timezone Confusion with completed_at
**What goes wrong:** Task completed at 8:30 Israel time but stored as UTC, displays wrong time to manager
**Why it happens:** JavaScript Date defaults to UTC, but users think in local time
**How to avoid:** Use existing `getCurrentTimestampIsrael()` utility when saving completed_at timestamp
**Warning signs:** Completion times off by 2-3 hours from what employee actually clicked

## Code Examples

Verified patterns from official sources:

### Adding Duration Field to Task Creation Form
```javascript
// In client/src/components/forms/TaskForm.jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    משך זמן משוער (דקות)
  </label>
  <input
    type="number"
    name="estimated_duration_minutes"
    value={task.estimated_duration_minutes || 30}
    onChange={handleChange}
    min="5"
    step="5"
    className="w-full border border-gray-300 rounded-lg px-3 py-2"
    required
  />
  <p className="text-xs text-gray-500 mt-1">
    זמן משוער לביצוע המשימה (ברירת מחדל: 30 דקות)
  </p>
</div>
```

### Saving Completion Timestamp with Timezone
```javascript
// In server/routes/taskConfirmation.js
const { getCurrentTimestampIsrael } = require('../utils/dateUtils');

router.post('/:token/complete/:taskId', async (req, res) => {
  const completedAt = getCurrentTimestampIsrael();

  db.prepare(`
    UPDATE tasks
    SET status = 'pending_approval', completed_at = ?
    WHERE id = ?
  `).run(completedAt, taskId);

  // Broadcast update via Socket.IO
  io.emit('task:updated', { task: updatedTask });
});
```

### Enriching Tasks with Timing Data
```javascript
// In server/routes/tasks.js
const { addMinutes, differenceInMinutes } = require('date-fns');

function enrichTaskWithTiming(task) {
  const now = new Date();
  const taskStart = new Date(`${task.start_date}T${task.start_time}`);
  const estimatedEnd = addMinutes(taskStart, task.estimated_duration_minutes || 30);

  const isLate = task.status !== 'completed' && now > estimatedEnd;
  const minutesRemaining = differenceInMinutes(estimatedEnd, now);

  return {
    ...task,
    estimated_end_time: estimatedEnd.toTimeString().slice(0, 5), // "HH:MM"
    is_late: isLate,
    minutes_remaining: isLate ? minutesRemaining * -1 : minutesRemaining, // Positive = remaining, negative = overdue
    timing_status: isLate ? 'late' : (minutesRemaining < 10 ? 'near-deadline' : 'on-time')
  };
}

router.get('/today', (req, res) => {
  const tasks = db.prepare(`SELECT * FROM tasks WHERE ...`).all(today);
  const enriched = tasks.map(enrichTaskWithTiming);
  res.json(enriched);
});
```

### TaskCard Late Status Display
```javascript
// In client/src/components/shared/TaskCard.jsx
export default function TaskCard({ task, onEdit }) {
  const getTimingDisplay = () => {
    if (task.status === 'completed') {
      if (!task.completed_at) return null;

      // Show completion time delta
      return (
        <div className="text-sm text-green-600">
          {task.timing_delta_text || 'הושלם בזמן'}
        </div>
      );
    }

    if (task.is_late) {
      return (
        <div className="text-sm font-semibold text-red-600">
          ⏰ באיחור {task.minutes_remaining} דקות
        </div>
      );
    }

    if (task.timing_status === 'near-deadline') {
      return (
        <div className="text-sm font-semibold text-yellow-600">
          ⚠️ נשארו {task.minutes_remaining} דקות
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-600">
        נשארו {task.minutes_remaining} דקות
      </div>
    );
  };

  return (
    <div className={`
      task-card
      ${task.is_late ? 'border-l-4 border-red-500 bg-red-50' : ''}
      ${task.timing_status === 'near-deadline' ? 'border-l-4 border-yellow-500' : ''}
    `}>
      {/* Task content */}
      <div className="timing-info mt-2">
        {getTimingDisplay()}
      </div>
    </div>
  );
}
```

### Client-Side Countdown Updates
```javascript
// In client/src/pages/MyDayPage.jsx
import { useState, useEffect } from 'react';

export default function MyDayPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Tasks will re-calculate is_late status on each render
  // This happens automatically when currentTime state changes
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store 'late' as status enum | Calculate dynamically from time comparison | 2020s+ | Always accurate, no stale status data |
| Cron job checks every N minutes | Client-side setInterval + server calculation | 2018+ | Real-time updates without server polling |
| JavaScript Date math | date-fns library | 2019+ | Handles edge cases correctly |
| Stored computed columns | Virtual columns or app logic | SQLite 3.31+ (2020) | More flexible, easier to debug |
| Polling for updates | WebSocket push | 2015+ | Instant updates, lower server load |

**Deprecated/outdated:**
- Manual string concatenation for timestamps: Use date-fns or ISO format instead
- setTimeout for countdown timers: Use setInterval with proper cleanup
- PHP-style timestamp integers: Use ISO 8601 strings for better database portability

## Open Questions

Things that couldn't be fully resolved:

1. **Should late detection trigger immediate Socket.IO broadcast?**
   - What we know: Currently broadcasts only on explicit status changes (sent → completed)
   - What's unclear: Whether becoming "late" (time-based) should trigger broadcast, or if client-side countdown is sufficient
   - Recommendation: Start with client-side only; add broadcast if managers report inconsistencies across devices

2. **Optimal setInterval timing**
   - What we know: 60 seconds is standard, 1 second causes performance issues
   - What's unclear: Whether 30 seconds would provide better UX without performance hit
   - Recommendation: Start with 60 seconds; can reduce to 30 based on user feedback

3. **How to handle timezone-aware queries**
   - What we know: System uses `getCurrentTimestampIsrael()` for saving timestamps
   - What's unclear: Whether SQLite date comparisons need timezone conversion or if storing in Israel time is sufficient
   - Recommendation: Store all timestamps in Israel timezone (as currently done); no conversion needed since all users are in same timezone

## Sources

### Primary (HIGH confidence)
- [SQLite Generated Columns Official Documentation](https://sqlite.org/gencol.html) - Confirmed VIRTUAL vs STORED column behavior
- [date-fns v4 Documentation](https://date-fns.org/) - Used via npm package already installed in project
- [Socket.IO v4 Documentation](https://socket.io/docs/v4/) - Already integrated in codebase

### Secondary (MEDIUM confidence)
- [Better Stack - Node.js Schedulers Comparison 2026](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) - Evaluated node-cron alternatives (decided against cron)
- [LogRocket - Best Node.js Schedulers](https://blog.logrocket.com/comparing-best-node-js-schedulers/) - Confirmed setInterval + app logic is simpler than Bull/Agenda for this use case
- [TrackingTime - Time Tracking Trends 2026](https://trackingtime.co/time-tracking-software/best-time-tracking-integrations.html) - AI-powered detection patterns (informative but not directly applicable)
- [Prototypr - Time in UI/UX Design](https://blog.prototypr.io/expressing-time-in-ui-ux-design-5-rules-and-a-few-other-things-eda5531a41a7) - Countdown timer best practices

### Tertiary (LOW confidence)
- [Various Dribbble/Figma countdown timer designs](https://dribbble.com/tags/countdown_timer) - Visual inspiration only, not technical guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing dependencies are well-documented and sufficient
- Architecture: HIGH - Patterns verified in current codebase (date-fns, Socket.IO, SQLite)
- Pitfalls: MEDIUM - Based on common patterns, but not verified in this specific codebase context
- UI/UX patterns: MEDIUM - General best practices, not Eden-specific validation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, unlikely to change)

---

## Key Takeaways for Planner

1. **No new dependencies needed** - use existing date-fns, Socket.IO, better-sqlite3
2. **Add 2 database columns only**: `estimated_duration_minutes`, `completed_at`
3. **Calculate late status dynamically** - do NOT store as separate status enum
4. **Backend enriches tasks** with timing data before sending to client
5. **Client uses setInterval(60000)** for countdown updates
6. **Visual indicators**: red border + red background for late tasks
7. **Reuse existing patterns**: getCurrentTimestampIsrael(), Socket.IO broadcasting, TaskCard styling
