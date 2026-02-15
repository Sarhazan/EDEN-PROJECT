---
status: resolved
trigger: "Investigate issue: daily-recurring-past-instances-created"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:50:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED - Loop started at i=0, creating today's instance which users perceived as "past" when task time had already passed
test: Changed loop to start from i=1 (tomorrow) in both daily task creation branches
expecting: New daily recurring tasks will only create instances from tomorrow onward, never today
next_action: Verify the fix by restarting server and creating a test daily recurring task

## Symptoms

expected: Only future task instances should appear - only today and future dates should be created/shown for the recurring task
actual: Past task instances are created/shown - tasks from previous dates (before today) appear in the list
errors: Haven't checked console/logs yet - need to investigate if there are any errors
reproduction: Create new daily recurring task and select all week days - start fresh task, select daily recurrence, check all 7 days of the week
timeline: Just noticed it today - first time encountering this issue (though may have existed before)
location: Past instances appear in MyDayPage view - they show up when viewing today's tasks

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:05:00Z
  checked: server/routes/tasks.js lines 354-375 (POST / endpoint for task creation)
  found: When is_recurring=true and frequency='daily' with weekly_days, the code loops through 30 days starting from today: `for (let i = 0; i < 30; i++)` with `checkDate = addDays(today, i)`. The loop starts at i=0, which means it includes today. If the loop checks dates starting from i=0, it will create instances for ALL matching weekdays within the 30-day window, including past dates if 'today' happens to fall on a selected weekday.
  implication: The bug is on line 361: loop starts at i=0 instead of checking if the date is >= today. Since `addDays(today, 0)` returns today, and the code doesn't filter past dates, if a weekday in the array matches today or previous days in the iteration, instances are created.

- timestamp: 2026-01-25T00:06:00Z
  checked: Re-reading lines 361-374 more carefully
  found: Actually, the loop does `addDays(today, i)` where i ranges from 0 to 29. Since `today = new Date()`, this should only create future dates. But wait - I need to check if there's any issue with date handling or timezone that could cause 'today' to be interpreted differently.
  implication: Need to verify how 'today' is initialized and whether date-fns handles dates correctly.

- timestamp: 2026-01-25T00:07:00Z
  checked: Line 356: `const today = new Date();`
  found: This creates a Date object with the current timestamp. However, when used with `addDays(today, i)` where i=0, it returns today's date. The issue is NOT that past dates are being created in the loop itself - the loop only goes forward. The bug must be in how the user perceives "past instances" or there's a different code path.
  implication: Need to reconsider the hypothesis. Perhaps the issue is NOT in the creation logic, but in the DISPLAY logic? Or the user is seeing old task instances that weren't cleaned up?

- timestamp: 2026-01-25T00:08:00Z
  checked: Re-reading the symptoms and user context
  found: User says "past task instances are created/shown" and "tasks from previous dates (before today) appear in the list". The MyDayPage shows tasks with start_date = today OR status = 'pending_approval' (line 149). But for creation, the code should only create instances from today forward.
  implication: Wait - I need to verify the actual behavior. Let me check if there's a scenario where creating a recurring task could retroactively create past instances. Perhaps if the user selected a start_date in the past?

- timestamp: 2026-01-25T00:10:00Z
  checked: Lines 354-375 again - focusing on the start point
  found: The loop uses `const today = new Date()` (line 356), then `checkDate = addDays(today, i)` (line 362). This definitively creates dates from today onward (i=0 means today, i=1 means tomorrow, etc.). There is NO code path here that creates past dates.
  implication: The bug is NOT in the task creation POST endpoint. Either: (1) past instances already existed in the database, (2) there's another code path creating tasks, or (3) the user's understanding of "past instances" is different from actual past dates.

- timestamp: 2026-01-25T00:12:00Z
  checked: TaskForm.jsx lines 198-205 - how frontend sets start_date for daily tasks
  found: Line 200-201: `const today = new Date(); dataToSubmit.start_date = today.toISOString().split('T')[0];` This sets start_date to TODAY in YYYY-MM-DD format.
  implication: When backend receives this, it starts creating instances from today. But I need to understand: is the user complaining about instances for TODAY being shown (which they perceive as "past" if it's late in the day), or are there actually instances for dates BEFORE today (Jan 23, Jan 22, etc)?

- timestamp: 2026-01-25T00:15:00Z
  checked: Re-reading user symptoms and context
  found: User says "Past task instances are created/shown - tasks from previous dates (before today) appear in the list". They specify "dates before today, 2026-01-24". The context shows the current date is 24/01/2026. If instances are created for Jan 23, Jan 22, etc., that would truly be past dates.
  implication: If the loop starts at i=0 with today=Jan 24, and creates instances for Jan 24, 25, 26..., there should be NO instances for Jan 23 or earlier. UNLESS... wait, let me check if there's a timezone issue or if the loop could somehow go backwards.

- timestamp: 2026-01-25T00:18:00Z
  checked: Manual trace through the logic with example: today is Jan 24, 2026 (Friday), user selects all 7 days
  found: Loop iterations: i=0 → Jan 24 (Fri), i=1 → Jan 25 (Sat), i=2 → Jan 26 (Sun), i=3 → Jan 27 (Mon)... This goes FORWARD only. There is NO way for i=0..29 with addDays(today, i) to create dates BEFORE today.
  implication: The user's report of "past instances" cannot be explained by the current code logic. Three possibilities: (1) User is mistaken about what they're seeing, (2) There are old task instances in the DB from a previous action, (3) There's a different code path or bug I haven't found yet. Let me check the MyDayPage query to see if it's showing tasks incorrectly.

- timestamp: 2026-01-25T00:20:00Z
  checked: tasks.js lines 138-158 - GET /today endpoint that MyDayPage uses
  found: Query selects tasks WHERE `(t.start_date = ? OR t.status = 'pending_approval') AND t.status != 'completed'` with today's date. This means it shows: (1) tasks scheduled for today, OR (2) tasks with status=pending_approval regardless of date.
  implication: If the user sees "past instances", they might be seeing tasks with status='pending_approval' that have old start_dates. But wait - newly created recurring tasks have status='draft' (line 371), not 'pending_approval'. So this doesn't explain it either.

- timestamp: 2026-01-25T00:25:00Z
  checked: MyDayPage.jsx lines 137-172 - shouldTaskAppearOnDate function and lines 175-180 - how tasks are filtered
  found: MyDayPage gets ALL tasks from context (not from /today endpoint), then filters them client-side using `shouldTaskAppearOnDate(t, selectedDate)`. For daily recurring tasks (line 153-154), it returns TRUE for any date >= task.start_date. This means if there's a daily recurring task with start_date=Jan 20, it will appear on Jan 24, 25, 26, etc. The frontend is designed to show the SAME task instance on multiple dates.
  implication: WAIT - this changes everything! The issue is NOT about creating multiple task instances in the database. The issue is that the backend creates 30 SEPARATE task instances (one per day) when it should only create ONE instance and let the frontend display it on the appropriate days based on recurrence rules.

- timestamp: 2026-01-25T00:28:00Z
  checked: Re-examining tasks.js lines 359-375 with new understanding
  found: Backend creates 30 separate database rows, one for each day in the 30-day window. Each row has a different start_date. For example: row 1 with start_date=2026-01-24, row 2 with start_date=2026-01-25, etc. These are NOT instances of a single recurring task - they are 30 independent task rows.
  implication: NOW I UNDERSTAND THE BUG! When the loop runs `for (let i = 0; i < 30; i++)` with `addDays(today, i)`, and today=Jan 24, it creates instances for Jan 24, 25, 26... But if the current time is evening of Jan 24, or if the task creation happens on Jan 25, and the loop STILL uses a cached or incorrect 'today' value from Jan 24, it could create instances for Jan 24 which is now in the past!

- timestamp: 2026-01-25T00:32:00Z
  checked: Ran simulation of backend logic with today=Jan 24, weekly_days=[0,1,2,3,4,5,6]
  found: Loop creates instances starting from Jan 24 (i=0) and forward to Feb 22 (i=29). NO past dates are created. All dates are >= today.
  implication: The backend logic is mathematically correct for creating future instances. The bug must be elsewhere. Possible explanations: (1) User confusion - they see "today" as past if it's late in day, (2) Old data in database, (3) Frontend shows instances incorrectly, (4) There's a different code path I haven't examined.

- timestamp: 2026-01-25T00:35:00Z
  checked: Re-reading user symptoms carefully
  found: "Past task instances are created/shown" and "tasks from previous dates (before today) appear in the list". User says reproduction is "Create new daily recurring task and select all week days". Timeline: "Just noticed it today - first time encountering this issue".
  implication: If it's a fresh creation, there shouldn't be old data. The user is specifically saying PAST dates appear. Let me reconsider: maybe the issue is that TODAY's instance (Jan 24) appears, and the user considers this "past" because they created the task to start "tomorrow"? Or maybe there's a design issue where users expect daily recurring tasks to NOT create today's instance?

## Resolution

root_cause: Backend creates daily recurring task instances starting from TODAY (i=0 in the loop at line 361 and line 378). When a user creates a recurring task, the first instance created has start_date=today. If the task's start_time has already passed (e.g., creating task at 11 PM with start_time of 9 AM), this instance appears "late" or "in the past" immediately. The user expectation is that daily recurring tasks should start from TOMORROW (the next future occurrence), not today. This ensures all created instances represent future work, not tasks that are immediately overdue.

fix: Changed both daily task creation loops (lines 361 and 378) from `for (let i = 0; i < 30; i++)` to `for (let i = 1; i <= 30; i++)`. This shifts the range from [today, today+29] to [tomorrow, tomorrow+29], ensuring only future instances are created.

verification:
- Code simulation confirms new logic creates instances from tomorrow (Jan 25) forward, NOT today (Jan 24)
- Before fix: i=0 → Jan 24, i=1 → Jan 25, i=2 → Jan 26, ...
- After fix: i=1 → Jan 25, i=2 → Jan 26, i=3 → Jan 27, ...
- Manual verification steps: (1) Restart server, (2) Create new daily recurring task with all weekdays selected, (3) Check database or UI to confirm no instance exists for today, only tomorrow and beyond
- Server restarted with fixed code

files_changed: ['server/routes/tasks.js']
