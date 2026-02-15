---
status: resolved
trigger: "Investigate issue: star-filter-not-working-in-my-day"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:06:00Z
---

## Current Focus

hypothesis: Fix applied - lateTasks now filters by starFilter
test: Verify that the fix works by checking the code changes
expecting: lateTasks now has star filter logic and starFilter in dependencies
next_action: Document verification and complete debugging

## Symptoms

expected: When star filter button is clicked, only starred tasks should be visible in both "My Day" section and main task list. When filter is removed, all tasks (starred and non-starred) should appear.

actual: Non-starred tasks remain visible in the "My Day" section even when the star filter is active. The filter may be working in the main list but not in "My Day".

errors: None reported

reproduction:
1. Navigate to the task view with "My Day" (היום שלי) section visible
2. Click the star filter button (המשימות המסומנות)
3. Observe that non-starred tasks are still showing in "My Day" section

started: Unsure if this ever worked correctly

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:01:00Z
  checked: MyDayPage.jsx component structure and filter implementation
  found: |
    - Star filter state is correctly initialized from localStorage (lines 27-29)
    - Star filter is listened to for cross-tab sync (lines 46-54)
    - recurringTasks applies star filter correctly (lines 291-294)
    - oneTimeTasks applies star filter correctly (lines 344-347)
    - lateTasks section exists (lines 367-383) but does NOT include starFilter in filtering
  implication: The lateTasks section is likely showing non-starred tasks when star filter is active

- timestamp: 2026-01-25T00:02:00Z
  checked: Sidebar.jsx star filter button implementation
  found: |
    - Star filter button correctly toggles localStorage value (lines 17-21)
    - Uses 'starFilter' key in localStorage
  implication: The star filter toggle mechanism is working correctly globally

- timestamp: 2026-01-25T00:03:00Z
  checked: AllTasksPage.jsx star filter implementation
  found: |
    - Star filter correctly applied at lines 38-40
    - Pattern: if (starFilter) { filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed'); }
    - This is the same pattern used in recurringTasks and oneTimeTasks in MyDayPage
  implication: Confirms the correct pattern to apply to lateTasks

- timestamp: 2026-01-25T00:04:00Z
  checked: MyDayPage lateTasks useMemo (lines 367-383)
  found: |
    - lateTasks filters by is_late === true and status !== 'completed'
    - Does NOT check starFilter at all
    - starFilter is NOT in the dependency array (line 383 only has [tasks])
  implication: This is the bug - lateTasks ignores the star filter entirely

## Resolution

root_cause: The lateTasks useMemo hook in MyDayPage.jsx (lines 367-383) does not apply the star filter. While recurringTasks and oneTimeTasks correctly filter by is_starred when starFilter is active, lateTasks only filters by is_late and status, ignoring the starFilter state. Additionally, starFilter is missing from the lateTasks dependency array.

fix: |
  Modified lateTasks useMemo in MyDayPage.jsx:
  1. Changed from inline return to use a filtered variable
  2. Added star filter logic: if (starFilter) { filtered = filtered.filter((t) => t.is_starred === 1); }
  3. Added starFilter to dependency array: [tasks, starFilter]

  This matches the pattern used in recurringTasks and oneTimeTasks, ensuring consistent behavior across all task sections.

verification: |
  Code review verification:
  - lateTasks now filters by is_starred === 1 when starFilter is true (matches recurringTasks/oneTimeTasks pattern)
  - starFilter is now in the dependency array so lateTasks will re-compute when star filter toggles
  - The fix maintains the existing sort logic and doesn't affect other filtering
  - Pattern is consistent with AllTasksPage.jsx implementation (lines 38-40)

  The fix ensures that when the star filter button is clicked:
  1. Recurring tasks show only starred tasks
  2. One-time tasks show only starred tasks
  3. Late tasks show only starred tasks (FIXED)

files_changed:
  - c:/dev/projects/claude projects/eden claude/client/src/pages/MyDayPage.jsx
