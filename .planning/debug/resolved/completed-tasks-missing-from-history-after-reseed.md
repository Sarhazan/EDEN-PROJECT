---
status: resolved
trigger: "completed-tasks-missing-from-history-after-reseed"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:00:00Z
---

## Current Focus

hypothesis: Fix applied - need to verify it works end-to-end
test: Test that newly completed tasks get completed_at set automatically, and verify history page shows results
expecting: History page should now show completed tasks for today's date range
next_action: Final verification of the fix

## Symptoms

expected: When tasks are marked as completed today and user navigates to history page, selects today's date (24/01/2026) in both date fields and clicks "הצג", those completed tasks should appear in the history list with statistics showing the count.

actual: History page shows "לא נמצאו משימות" (no tasks found) with 0 completed tasks in statistics. The "היום שלי" page shows completed tasks with green checkmarks (e.g., "נשאר 22 דקות", "נשאר 37 דקות" indicators), but these same tasks don't appear in history.

errors: No visible console errors. Page loads successfully but returns empty results.

reproduction:
1. Go to "היום שלי" page - see tasks listed
2. Complete some tasks by clicking through the approval flow
3. See tasks show as completed in "היום שלי" page
4. Navigate to history page (localhost:5177/history)
5. Select today's date (24/01/2026) in "מתאריך" field
6. Select today's date (24/01/2026) in "עד תאריך" field
7. Click "הצג" button
8. Result: "לא נמצאו משימות" appears

started: Issue persists after the previous fix (commit 2d8df1b) which added ' 23:59:59' to endDate. Server logs show database was cleared and reseeded multiple times recently. The date filtering fix was applied, but completed tasks still don't appear.

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:01:00Z
  checked: Task approval endpoint (/:id/approve) in server/routes/tasks.js
  found: Line 179 uses COALESCE(completed_at, CURRENT_TIMESTAMP) - sets completed_at to NOW if not already set
  implication: When manager approves task, completed_at should be set correctly

- timestamp: 2026-01-24T00:01:30Z
  checked: History API query in server/routes/history.js
  found: Line 40 checks 't.completed_at >= ?' and line 47 checks 't.completed_at <= ?' with endDate appended ' 23:59:59'
  implication: History query is filtering by completed_at timestamps correctly

- timestamp: 2026-01-24T00:02:00Z
  checked: Database schema in server/database/schema.js
  found: Line 98 adds completed_at column if it doesn't exist (migration)
  implication: Schema includes completed_at field, should survive reseeds

- timestamp: 2026-01-24T00:03:00Z
  checked: Database query for completed tasks
  found: Tasks with id=4 and id=5 have status='completed' but completed_at=null
  implication: CRITICAL - This is why history page shows no results! The query filters by completed_at but it's NULL

- timestamp: 2026-01-24T00:04:00Z
  checked: Task confirmation completion endpoint in server/routes/taskConfirmation.js
  found: Line 191 sets completed_at when status changes to 'pending_approval'
  implication: When employee completes task, completed_at IS set correctly

- timestamp: 2026-01-24T00:04:30Z
  checked: Task approval endpoint again (/:id/approve) in server/routes/tasks.js
  found: Line 179 uses COALESCE(completed_at, CURRENT_TIMESTAMP) - should preserve existing completed_at if set
  implication: COALESCE should preserve the timestamp set during employee completion

- timestamp: 2026-01-24T00:05:00Z
  checked: Database records for tasks 4 and 5
  found: Both tasks have status='completed' but completed_at=null, sent_at=null, acknowledged_at=null
  implication: These tasks were NOT completed through the normal employee->manager flow

- timestamp: 2026-01-24T00:05:30Z
  checked: PUT /:id/status endpoint in server/routes/tasks.js (line 528-640)
  found: Line 549 updates status but does NOT set completed_at when status='completed'
  implication: ROOT CAUSE FOUND - This endpoint is used to change task status but forgets to set completed_at

## Resolution

root_cause: The PUT /:id/status endpoint (server/routes/tasks.js, lines 528-640) sets task status to 'completed' but does NOT set the completed_at timestamp. The history API filters tasks by completed_at (server/routes/history.js, lines 40 and 47), so tasks completed via this endpoint have completed_at=NULL and are excluded from history results.

The employee->manager approval flow works correctly:
1. Employee completes task via taskConfirmation.js /:token/complete → sets completed_at + status='pending_approval'
2. Manager approves via tasks.js /:id/approve → preserves completed_at with COALESCE

But the direct status update flow is broken:
1. Status changed to 'completed' via tasks.js /:id/status → does NOT set completed_at
2. Result: completed_at remains NULL
3. History query excludes these tasks

fix:
1. Updated PUT /:id/status endpoint to set completed_at when status changes to 'completed' (using COALESCE to preserve existing timestamp if already set)
2. Fixed existing 2 completed tasks in database by setting their completed_at to their updated_at timestamp

Changes made:
- server/routes/tasks.js: Added else-if branch to handle status='completed' (lines 541-547)
- Database: Updated tasks 4 and 5 to set completed_at = updated_at

verification:
✓ Verified completed tasks now have completed_at timestamps (tasks 4 and 5)
✓ Tested history query with date range 2026-01-24 - returns 2 tasks correctly
✓ Both tasks appear with full details including system_name and employee_name
✓ Tested fix logic directly - when task status changes to 'completed', completed_at is set to current timestamp
✓ COALESCE logic verified - if completed_at already exists, it's preserved; if NULL, it's set to current timestamp

All verification passed. The fix is complete and working correctly.

files_changed:
- server/routes/tasks.js
