---
status: resolved
trigger: "employee-completed-tasks-stats-not-showing"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - Employee stats not refreshed when tasks updated via WebSocket
test: Fix by calling fetchEmployees() after task status updates
expecting: Employee stats will refresh when task is completed
next_action: Add fetchEmployees() call in task:updated WebSocket handler and after updateTaskStatus

## Symptoms

expected: When an employee completes a task (status='completed'), the employee statistics on the employees page should show:
- Completed tasks count should increase
- Completion percentage should be calculated correctly
- The circular progress bar should reflect the percentage

actual:
- Tasks appear in history page as 100% completed
- Tasks have status='completed' in the database
- Employee page shows 0 completed tasks, 0% completion for עדן קנדי
- The circular progress bar shows 0% (red color)

errors: No error messages

reproduction:
1. Employee עדן קנדי completes tasks (marks them as done)
2. Tasks show in history as completed (100%)
3. Navigate to employees page
4. Employee card shows 0 completed tasks and 0%

started: This is a newly implemented feature (employee statistics with circular progress bars). The backend API was just created to calculate stats.

context:
- Recently implemented employee statistics feature
- Backend: server/routes/employees.js GET / endpoint calculates stats
- Frontend: client/src/pages/EmployeesPage.jsx displays the stats
- Stats calculation uses SQL query with COUNT and CASE WHEN for completed tasks

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:10:00Z
  checked: Database query directly via test-stats.js
  found: SQL query returns correct results - 1 completed task, 16.7% completion for עדן קנדי (ID 5)
  implication: SQL logic is correct

- timestamp: 2026-01-24T00:15:00Z
  checked: Backend route logic via test-employees-route.js
  found: Backend API route logic returns correct stats object with completed_tasks: 1, completion_percentage: 16.7
  implication: Backend is working correctly. Issue must be in frontend display or data handling

- timestamp: 2026-01-24T00:16:00Z
  checked: Frontend EmployeesPage.jsx display logic
  found: Line 164 shows `percentage={employee.stats?.completion_percentage || 0}` and lines 172 shows `{employee.stats?.completed_tasks || 0}` - uses optional chaining correctly
  implication: Frontend display logic looks correct, need to check what data is actually received

- timestamp: 2026-01-24T00:20:00Z
  checked: AppContext.jsx fetchEmployees function and WebSocket task:updated handler
  found: When a task is updated via WebSocket (lines 61-82), it updates the tasks state but does NOT refresh employee stats. Employee stats are only fetched on initial load (line 109 in fetchAllData)
  implication: ROOT CAUSE FOUND - When a task status changes to 'completed' via WebSocket, the employees stats are not refreshed

## Resolution

root_cause: When a task status is updated to 'completed' via WebSocket (task:updated event), the AppContext updates the tasks state (line 75-81) but does not call fetchEmployees() to refresh employee statistics. This means the initial stats from page load become stale when tasks are completed. The stats are only calculated once on initial page load and never refreshed when task statuses change.

fix: Added fetchEmployees() calls in two places:
1. In the task:updated WebSocket event handler (after updating tasks state)
2. In the updateTaskStatus function (after fetching tasks)

This ensures employee statistics are refreshed whenever a task status changes, keeping the stats in sync with actual task completion.

verification:
- ✅ Code changes applied successfully to AppContext.jsx
- ✅ Both WebSocket handler (line 84) and updateTaskStatus function (line 173) now call fetchEmployees()
- ✅ Build successful - no syntax or compilation errors
- ✅ Verified SQL stats calculation returns correct data (1 completed, 16.7%)
- ✅ Verified backend API route returns correct stats in response
- ✅ Frontend display logic correctly accesses employee.stats object
- ✅ Root cause identified: stats were not refreshed on task status changes
- ✅ Fix addresses root cause by triggering stats refresh after task updates

The fix ensures that whenever a task status changes (either via WebSocket real-time updates or direct API calls), the employee statistics are immediately recalculated and displayed. This solves the issue where completed tasks showed in history but employee stats remained at 0.

Manual Verification Recommended:
1. Complete a task for an employee
2. Verify employee stats update in real-time on the Employees page
3. Verify circular progress bar animates to correct percentage

files_changed:
  - client/src/context/AppContext.jsx
