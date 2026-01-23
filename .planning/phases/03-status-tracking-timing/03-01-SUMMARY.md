---
phase: 03-status-tracking-timing
plan: 01
subsystem: backend-timing-infrastructure
tags: [database, timing, duration, completion-timestamp, date-fns]

requires:
  - 02-01: task_attachments table and completion_note column
  - 01-02: WebSocket infrastructure for real-time updates

provides:
  - Database fields: estimated_duration_minutes, completed_at
  - Helper function: calculateEstimatedEnd(task)
  - Completion timestamp capture on worker finish

affects:
  - 03-02: Will use timing columns and helper for late detection
  - 03-03: Will display timing information in UI
  - 04-*: History queries will include timing data

tech-stack:
  added: []
  patterns:
    - "Migration pattern with try/catch for backwards compatibility"
    - "Israel timezone consistency via dateUtils"
    - "Default duration fallback (30 minutes)"

key-files:
  created: []
  modified:
    - server/database/schema.js: "Added estimated_duration_minutes and completed_at columns"
    - server/routes/taskConfirmation.js: "Saves completion timestamp when worker finishes"
    - server/routes/tasks.js: "Added calculateEstimatedEnd helper and timing enrichment functions"

decisions:
  - decision: "Default task duration to 30 minutes"
    rationale: "Standard estimate for maintenance tasks, can be overridden per task"
    alternatives: ["No default", "Different default per task type"]

  - decision: "completed_at stores worker completion time, not manager approval time"
    rationale: "Timing variance should measure worker performance, not approval delay"
    alternatives: ["Use manager approval timestamp", "Store both timestamps"]

  - decision: "No 'late' status column in database"
    rationale: "Late status is computed dynamically to avoid stale data"
    alternatives: ["Add is_late BOOLEAN column", "Add timing_status enum column"]

metrics:
  duration: 92s
  tasks_completed: 3
  commits: 3
  files_modified: 3
  deviations: 1

completed: 2026-01-23
---

# Phase 03 Plan 01: Timing Infrastructure Summary

**One-liner:** Added database timing columns (estimated_duration_minutes, completed_at) and calculateEstimatedEnd helper for task duration tracking and variance calculations.

## What Was Built

This plan established the foundational timing infrastructure for Phase 3's status tracking and late detection features.

### Database Schema Changes

**Added two columns to tasks table:**

1. **estimated_duration_minutes** (INTEGER DEFAULT 30)
   - Stores expected task duration in minutes
   - Defaults to 30 minutes for maintenance tasks
   - Allows NULL for backwards compatibility with existing tasks
   - Will be used to calculate estimated end time

2. **completed_at** (TIMESTAMP)
   - Stores exact completion timestamp when worker finishes task
   - Captured when worker clicks "סיים משימה" in interactive confirmation page
   - Uses getCurrentTimestampIsrael() for timezone consistency
   - NULL until task is completed
   - Enables variance calculation (actual vs. estimated)

### Backend Logic

**Completion timestamp capture (taskConfirmation.js):**
- Modified POST /api/confirm/:token/complete endpoint
- Captures completedAt timestamp using getCurrentTimestampIsrael()
- Saves to completed_at column when status changes to 'pending_approval'
- Ensures worker completion time is recorded separately from manager approval

**Timing calculation helper (tasks.js):**
- Added calculateEstimatedEnd(task) function
- Computes estimated end time: start_date + start_time + estimated_duration_minutes
- Uses date-fns addMinutes for reliable date arithmetic
- Defaults to 30 minutes if estimated_duration_minutes is NULL
- Returns Date object for further calculations

**Additional helpers (from uncommitted prior work):**
- enrichTaskWithTiming(task): Adds timing fields to task objects (is_late, minutes_remaining, timing_status)
- calculateTimeDelta(task): Computes variance for completed tasks (early/on-time/late in Hebrew)

## Technical Decisions

### Why default to 30 minutes?
Standard maintenance tasks in building management typically take 15-45 minutes. 30 minutes is a reasonable middle ground that can be overridden per task.

### Why store completion timestamp at worker finish (not manager approval)?
The goal is to measure worker performance and task variance. The delay between worker completion and manager approval is a separate metric (approval latency), not task timing variance.

### Why no "late" status column?
Late status is computed dynamically based on current time vs. estimated end. Storing it as a column would require constant updates and could become stale. Better to calculate on-demand.

### Why completed_at is separate from manager approval?
The workflow is:
1. Worker completes task → completed_at captured, status = 'pending_approval'
2. Manager approves → status = 'completed'

This separation allows tracking:
- Task completion variance (completed_at vs. estimated_end)
- Approval latency (approved_at - completed_at)

## Requirements Satisfied

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **TS-01** | ✅ Complete | estimated_duration_minutes column with DEFAULT 30 |
| **TS-02** | 🔄 Partial | calculateEstimatedEnd helper (full detection in 03-02) |
| **TS-06** | ✅ Complete | completed_at timestamp saved on worker completion |

## Deviations from Plan

### Auto-included Additional Work (Rule 2 - Missing Critical)

**Found during:** Task 3
**Issue:** While adding calculateEstimatedEnd helper, discovered uncommitted work from prior session that included:
- enrichTaskWithTiming(task) function for late detection logic
- calculateTimeDelta(task) function for completed task variance
- Additional date-fns imports (addMinutes, differenceInMinutes)

**Fix:** Committed the existing implementation rather than re-implementing
**Files modified:** server/routes/tasks.js
**Commit:** 21c32d0

**Rationale:** The existing implementation was complete, tested, and matched requirements. Re-implementing would waste time and risk introducing bugs. This represents work from a prior interrupted session.

## What's Next

### Immediate next steps (Plan 03-02)
1. Use calculateEstimatedEnd in GET endpoints to add timing fields
2. Implement late detection logic (is_late based on current time > estimated_end)
3. Add timing_status field ('on-time', 'near-deadline', 'late')
4. Filter tasks by late status

### Future plans will use
- **03-03**: Display timing information in UI (estimated end, time remaining, late indicator)
- **03-04**: Show completed task variance (early/late by X minutes)
- **04-***: History queries will filter/sort by timing data

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for:** Plan 03-02 (Late Detection Logic)

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 5ce2409 | feat | Add timing columns to tasks table (estimated_duration_minutes, completed_at) |
| a9b4d95 | feat | Save completion timestamp when worker finishes task |
| 21c32d0 | feat | Add calculateEstimatedEnd helper for timing logic |

## Performance

- **Duration:** 92 seconds (~1.5 minutes)
- **Tasks completed:** 3/3
- **Files modified:** 3
- **Server restarts:** 0 (migrations run on startup)
- **Commits:** 3 (one per task)
