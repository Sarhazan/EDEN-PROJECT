---
status: resolved
trigger: "Investigate issue: late-tasks-count-not-updating"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:05:00Z
---

## Current Focus

hypothesis: Fix implemented and tested - verifying in actual application
test: Start server and test history API with completed tasks
expecting: History statistics should now show correct late task count and on-time percentage
next_action: verify the fix works end-to-end in the running application

## Symptoms

expected: When tasks are completed late (completed_at > estimated end time), the history statistics should show the count of late tasks in the "באיחור" field and adjust the "אחוז בזמן" (on-time percentage) accordingly.

actual: The statistics consistently show "0" in the "באיחור" (late) count even when there are tasks that were completed after their estimated end time. The on-time percentage shows 100% when it shouldn't.

errors: No visible console errors.

reproduction:
1. Complete some tasks late (after their estimated end time)
2. Navigate to history page
3. Select date range that includes those late tasks
4. Click "הצג"
5. Look at statistics: "מס' הושלמו" shows total count, but "באיחור" shows 0 instead of the actual late count

started: This is the first time testing statistics with real completed task data. The late detection logic exists in the task timing system (Phase 3), but the history statistics query may not be using it correctly.

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:01:00Z
  checked: server/routes/tasks.js PUT /:id/status endpoint (lines 528-648)
  found: When tasks are marked as "completed" via status change, completed_at is set (line 549-553) but time_delta_minutes is NEVER calculated or saved
  implication: Direct status changes to "completed" skip the time delta calculation entirely

- timestamp: 2026-01-24T00:01:30Z
  checked: server/routes/taskConfirmation.js POST /:token/complete endpoint (lines 143-218)
  found: When tasks are marked via employee confirmation, status is set to "pending_approval" (line 191), NOT "completed", and time_delta_minutes is NOT calculated
  implication: Employee completion flow doesn't calculate time delta either

- timestamp: 2026-01-24T00:02:00Z
  checked: server/routes/tasks.js POST /:id/approve endpoint (lines 159-269)
  found: Manager approval changes status from "pending_approval" to "completed" (line 174-182) but does NOT calculate or save time_delta_minutes
  implication: The approval flow also skips time delta calculation

- timestamp: 2026-01-24T00:02:30Z
  checked: server/routes/tasks.js enrichTaskWithTiming function (lines 32-56)
  found: For completed tasks, function calls calculateTimeDelta (line 37) which calculates time_delta_minutes (lines 92-117), but this is only for the API response - NOT saved to database
  implication: time_delta_minutes is calculated on-the-fly for API responses but never persisted to the database

- timestamp: 2026-01-24T00:03:00Z
  checked: Database query of all completed tasks
  found: ALL 9 completed tasks have time_delta_minutes = NULL
  implication: Confirms that time_delta_minutes is NEVER being saved to the database

## Resolution

root_cause: The time_delta_minutes field exists in the database schema and is calculated correctly by the calculateTimeDelta() function, but it is never persisted. The calculation happens only in enrichTaskWithTiming() for API responses. When tasks are marked as completed (via status change, employee completion->approval, or direct approval), the UPDATE queries never include time_delta_minutes. The history statistics query expects time_delta_minutes to be stored in the database, but since all values are NULL, it always returns 0 for late tasks.

fix: Modified server/routes/tasks.js in two places:
1. POST /:id/approve endpoint (lines 159-182): Calculate time_delta_minutes using calculateEstimatedEnd() and differenceInMinutes(), then save it in the UPDATE query
2. PUT /:id/status endpoint (lines 547-560): When status is 'completed', calculate time_delta_minutes and include it in the UPDATE query

Also backfilled existing completed tasks with their time_delta_minutes values.

verification:
- Backfilled 9 existing completed tasks: 4 late, 5 early (verified with database query)
- Created test scripts that confirmed both endpoints correctly calculate and save time_delta_minutes
- Test 1 (PUT /:id/status): Late task (30 min late) correctly saved and counted
- Test 2 (POST /:id/approve): Time delta correctly calculated and saved
- Test 3 (History API query): Exact query from history.js returns correct statistics
  - Total Completed: 9
  - Late Tasks: 4
  - On-time Percentage: 55.6%
- All test files cleaned up
- Fix verified and working correctly

files_changed: ["server/routes/tasks.js"]

root_cause:
fix:
verification:
files_changed: []
