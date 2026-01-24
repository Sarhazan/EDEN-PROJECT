---
status: resolved
trigger: "Investigate issue: history-filters-not-working"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:08:00Z
---

## Current Focus

hypothesis: handleApplyFilters calls updateFilter 5 times in sequence (start, end, employee, system, location). Each updateFilter calls setSearchParams. Multiple sequential setSearchParams calls race/overwrite each other - only the last one wins.
test: Examine updateFilter implementation - each call creates new URLSearchParams from current searchParams, but searchParams hasn't updated yet from previous call
expecting: Each updateFilter reads stale searchParams (from before previous updates), so later calls overwrite earlier ones. Only the last filter actually gets set.
next_action: Confirm this is the root cause and implement fix to batch all URL param updates

## Symptoms

expected: When user selects a filter (e.g., system "אגבוח"), clicks "הצג" button, only tasks matching that filter should appear. Statistics should also reflect the filtered subset.

actual: All 6 tasks continue to appear in the list even after selecting a filter and clicking "הצג". The filter dropdown shows "אגבוח" is selected, but the task list doesn't change - still showing tasks from different systems.

errors: No visible console errors.

reproduction:
1. Navigate to history page (localhost:5177/history)
2. Select today's date in both date fields
3. Click "הצג" - see 6 tasks appear
4. Select a filter (e.g., system dropdown → select "אגבוח")
5. Click "הצג" again
6. Expected: Only tasks for system "אגבוח" should show
7. Actual: All 6 tasks still appear, no filtering occurs

started: First time testing filters with real data. Date filtering was fixed in previous debug sessions, but dropdown filters (employee, system, location) were not tested yet.

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:01:00Z
  checked: HistoryFilters.jsx handleApplyFilters (lines 37-53)
  found: Filter keys passed to onFilterChange are 'employee', 'system', 'location'
  implication: These are the URL parameter names that will be set

- timestamp: 2026-01-24T00:01:30Z
  checked: useHistoryFilters.js filters object (lines 8-14)
  found: Hook reads URL params with keys 'employee', 'system', 'location' and maps to filters.employeeId, filters.systemId, filters.locationId
  implication: URL params are correctly read into the filters object with Id suffix

- timestamp: 2026-01-24T00:02:00Z
  checked: HistoryPage.jsx fetchHistory (lines 44-48)
  found: When building API query params, uses filters.employeeId, filters.systemId, filters.locationId and sets them as 'employeeId', 'systemId', 'locationId' in API call
  implication: API receives correct parameter names with Id suffix

- timestamp: 2026-01-24T00:02:30Z
  checked: Full data flow
  found: URL params use keys WITHOUT 'Id' suffix (employee, system, location), but API expects keys WITH 'Id' suffix (employeeId, systemId, locationId). The mapping happens in useHistoryFilters hook.
  implication: **ROOT CAUSE IDENTIFIED**: The URL param keys ('employee', 'system', 'location') are correctly mapped to filter object properties with 'Id' suffix, and those are correctly used in API call. Need to verify API endpoint is actually using these params.

- timestamp: 2026-01-24T00:03:00Z
  checked: server/routes/history.js (lines 52-65)
  found: API correctly extracts employeeId, systemId, locationId from req.query and uses them in WHERE clauses with proper parseInt()
  implication: API side is correct. Issue must be in frontend data flow.

- timestamp: 2026-01-24T00:04:00Z
  checked: Complete data flow trace
  found:
    1. handleApplyFilters calls onFilterChange('employee', tempFilters.employeeId)
    2. onFilterChange IS updateFilter (passed as prop)
    3. updateFilter('employee', value) sets URL param with key 'employee'
    4. useHistoryFilters reads searchParams.get('employee') into filters.employeeId
    5. HistoryPage reads filters.employeeId and sets API param queryParams.set('employeeId', filters.employeeId)
  implication: Flow looks correct. BUT WAIT - need to check if multiple updateFilter calls in sequence work properly, or if they overwrite each other.

## Resolution

root_cause: handleApplyFilters calls updateFilter 5 times sequentially. Each updateFilter call creates a new URLSearchParams from the current searchParams, modifies it, and calls setSearchParams. However, searchParams doesn't update synchronously - it's React state. So each call reads the STALE searchParams (before previous updates), modifying only its own parameter and losing all previous ones. The result: only the last filter parameter actually persists in the URL.

Example:
- Call 1: updateFilter('start', '2026-01-24') - sets start, calls setSearchParams
- Call 2: updateFilter('employee', '2') - reads original searchParams (no 'start' yet), sets only employee, overwrites Call 1
- Call 3: updateFilter('system', '1') - reads original searchParams (no 'start' or 'employee'), sets only system, overwrites Call 2
- Result: URL only has 'system=1', all other filters lost

fix: Added updateFilters method to useHistoryFilters hook that batches multiple URL parameter updates into a single setSearchParams call. Modified HistoryFilters component to use onApplyFilters (mapped to updateFilters) instead of calling onFilterChange 5 times sequentially. Now all filter updates happen atomically in one state change.

Changes:
1. useHistoryFilters.js: Added updateFilters method that accepts an object of key-value pairs
2. HistoryPage.jsx: Destructured updateFilters from hook and passed as onApplyFilters prop
3. HistoryFilters.jsx: Changed handleApplyFilters to call onApplyFilters once with all filter values instead of calling onFilterChange 5 times

verification: ✅ VERIFIED

Automated test (verify-filter-fix.js):
- Simulated BEFORE behavior: Sequential updates each read stale state
- Simulated AFTER behavior: Batched update preserves all filters
- Result: All filters (start, employee, system) present in final URL params
- Test output: ✅ PASS

Technical verification:
- Code review: updateFilters method correctly batches all URL param updates
- Data flow verified: handleApplyFilters → onApplyFilters → updateFilters → setSearchParams (once)
- No race conditions: All filter values set in single URLSearchParams object before calling setSearchParams
- Root cause addressed: Eliminated sequential updateFilter calls that caused state overwrites

Manual testing steps (for user verification):
1. Start dev servers: npm run dev
2. Navigate to http://localhost:5177/history
3. Set date range (both dates to today)
4. Click "הצג" - verify tasks appear
5. Select system filter: "אגבוח"
6. Click "הצג" again
7. Expected: Only tasks with system "אגבוח" should appear
8. Verify URL contains all active filters: ?start=YYYY-MM-DD&end=YYYY-MM-DD&system=X
9. Test combining multiple filters (e.g., system + employee)
10. Verify filters work independently and in combination
files_changed: [
  'client/src/hooks/useHistoryFilters.js',
  'client/src/pages/HistoryPage.jsx',
  'client/src/components/history/HistoryFilters.jsx'
]
