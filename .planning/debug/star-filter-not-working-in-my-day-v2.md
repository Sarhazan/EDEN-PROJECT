---
status: verifying
trigger: "Continue debugging: star-filter-not-working-in-my-day. Previous fix was applied to lateTasks, but the star filter is STILL not working. When משימות מסומנות (starred tasks) button is clicked, non-starred tasks remain visible in My Day section."
created: 2026-01-25T10:00:00Z
updated: 2026-01-25T10:10:00Z
---

## Current Focus

hypothesis: Fix applied - Custom event 'starFilterChanged' dispatched from Sidebar and listened to by all pages
test: Verify that clicking the star filter button now updates all pages in same tab
expecting: When star filter is clicked, MyDayPage, AllTasksPage, and HistoryPage should immediately update their filtered task lists
next_action: Test the fix by running the application

## Symptoms

expected: When star filter button is clicked (משימות מסומנות), only starred tasks should be visible in both My Day section and main task list. When filter is removed, all tasks (starred and non-starred) should appear.

actual: Non-starred tasks remain visible in the My Day section even when the star filter is active. The button shows "נעלו כל המשימות" (Show all tasks) indicating the filter IS active, but non-starred tasks (without stars) are still visible in both left (recurring) and right (one-time + late) panels.

errors: None reported

reproduction:
1. Navigate to My Day page (היום שלי)
2. Click the star filter button (משימות מסומנות)
3. Button changes to "נעלו כל המשימות" indicating filter is active
4. Observe that non-starred tasks are still showing in both panels

started: Previous fix applied to lateTasks but issue persists

## Eliminated

## Evidence

- timestamp: 2026-01-25T10:01:00Z
  checked: Previous debug file resolution
  found: |
    - Previous fix added star filter to lateTasks (lines 374-377)
    - Pattern used: if (starFilter) { filtered = filtered.filter((t) => t.is_starred === 1); }
    - This was applied AFTER filtering by is_late and status !== 'completed'
  implication: The fix was applied, so either the pattern is wrong or there's something else going on

- timestamp: 2026-01-25T10:02:00Z
  checked: Current MyDayPage.jsx star filter implementations
  found: |
    - recurringTasks (lines 291-294): if (starFilter) { filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed'); }
    - oneTimeTasks (lines 344-347): if (starFilter) { filtered = filtered.filter((t) => t.is_starred === 1 && t.status !== 'completed'); }
    - lateTasks (lines 375-377): if (starFilter) { filtered = filtered.filter((t) => t.is_starred === 1); }
    - Note: recurringTasks and oneTimeTasks have redundant status !== 'completed' check in star filter
  implication: There's inconsistency - recurringTasks/oneTimeTasks check both conditions, lateTasks only checks is_starred

- timestamp: 2026-01-25T10:03:00Z
  checked: Database schema (server/database/schema.js line 296)
  found: |
    - is_starred column: `ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT 0`
    - SQLite BOOLEAN is stored as INTEGER (0 or 1)
    - Filter logic checks `is_starred === 1` which is correct
  implication: Data type is correct, filter logic should work

- timestamp: 2026-01-25T10:04:00Z
  checked: Star filter state synchronization in MyDayPage.jsx (lines 27-29, 46-54)
  found: |
    - Initial state: const [starFilter, setStarFilter] = useState(() => { return localStorage.getItem('starFilter') === 'true'; });
    - Cross-tab sync: useEffect listening to 'storage' event
    - CRITICAL: The 'storage' event ONLY fires for cross-tab changes, NOT same-tab changes!
    - Sidebar button (Sidebar.jsx lines 17-21) updates localStorage but doesn't trigger 'storage' event in same tab
  implication: THIS IS THE BUG - When user clicks star filter in Sidebar, localStorage updates but MyDayPage state doesn't update in the same tab!

- timestamp: 2026-01-25T10:05:00Z
  checked: Sidebar.jsx star filter button (lines 8-21)
  found: |
    - Button has its own local state: const [starFilter, setStarFilter] = useState(false);
    - Click handler: setStarFilter(newValue); localStorage.setItem('starFilter', newValue.toString());
    - Button visual state updates (showing filled/unfilled star)
    - But MyDayPage in the same tab has no way to know localStorage changed
  implication: Sidebar button's visual state changes, but pages don't re-filter because they don't detect the localStorage change

## Resolution

root_cause: The MyDayPage component initializes starFilter state from localStorage on mount, but never updates it when the Sidebar button is clicked in the same tab. The useEffect hook listens to the 'storage' event, which only fires for cross-tab changes, not same-tab localStorage updates. Therefore, when a user clicks the star filter button in the Sidebar, the button's visual state changes but the MyDayPage filters don't update because the starFilter state remains unchanged. This same issue affects AllTasksPage and HistoryPage.

fix: |
  1. Modified Sidebar.jsx handleStarFilterToggle function to dispatch a custom event:
     - Added: window.dispatchEvent(new CustomEvent('starFilterChanged', { detail: { value: newValue } }));
     - This fires immediately in the same tab when the button is clicked

  2. Modified MyDayPage.jsx to listen for the custom event:
     - Added handleStarFilterChanged listener that calls setStarFilter(e.detail.value)
     - Added event listener for 'starFilterChanged' custom event
     - Kept the 'storage' event listener for cross-tab synchronization

  3. Applied the same fix to AllTasksPage.jsx and HistoryPage.jsx
     - Both pages now listen to both 'storage' (cross-tab) and 'starFilterChanged' (same-tab) events

  This ensures that:
  - Same-tab updates: Custom event triggers immediate state update
  - Cross-tab updates: Storage event continues to work for multiple tabs
  - All pages (MyDay, AllTasks, History) stay synchronized with the star filter button

verification: |
  Code review verification:
  1. Sidebar.jsx now dispatches 'starFilterChanged' custom event when button is clicked
  2. MyDayPage.jsx, AllTasksPage.jsx, and HistoryPage.jsx all listen for this custom event
  3. Event handler correctly updates starFilter state: setStarFilter(e.detail.value)
  4. Custom event fires synchronously in same tab (unlike storage event)
  5. Cross-tab sync still works via storage event listener

  Manual testing required:
  1. Navigate to My Day page (היום שלי)
  2. Ensure there are both starred and non-starred tasks visible
  3. Click the star filter button in Sidebar (משימות מסומנות)
  4. Expected: Only starred tasks should remain visible immediately
  5. Click the star filter button again to turn it off
  6. Expected: All tasks (starred and non-starred) should appear again
  7. Repeat test on All Tasks page (משימות)
  8. Repeat test on History page (היסטוריה)

  The fix addresses the root cause by ensuring same-tab synchronization works via custom events.

files_changed:
  - c:/dev/projects/claude projects/eden claude/client/src/components/layout/Sidebar.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/MyDayPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/AllTasksPage.jsx
  - c:/dev/projects/claude projects/eden claude/client/src/pages/HistoryPage.jsx
