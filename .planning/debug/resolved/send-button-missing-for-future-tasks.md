---
status: resolved
trigger: "משימת \"ניקוי שירותים\" (08:00) מוצגת ללא אייקון שליחה למרות שהיא עתידית"
created: 2026-01-24T05:50:00Z
updated: 2026-01-24T05:55:00Z
---

## Current Focus

hypothesis: CONFIRMED - Task is seeded with wrong status
test: Verify that send button now appears after reseeding database
expecting: Send button (✈️) will appear alongside edit and delete buttons
next_action: Verify the fix by explaining test steps to user

## Symptoms

expected: משימה יומית עתידית (08:00, נשארו 2 שעות 38 דקות) צריכה להראות אייקון שליחה (✈️)
actual: המשימה מוצגת רק עם אייקוני מחיקה (🗑️) ועריכה (✏️), ללא אייקון שליחה
errors: אין הודעות שגיאה
reproduction:
  1. טען נתוני דמה (כפתור "טען נתוני דמה")
  2. צפה במשימת "ניקוי שירותים" ב-08:00
  3. שים לב שאין אייקון שליחה למרות שהמשימה עתידית
started: הבעיה התגלתה לאחר תיקון בקוד שמנע אייקון שליחה למשימות שכבר התחילו (commit e942acc)

## Eliminated

## Evidence

- timestamp: 2026-01-24T05:50:00Z
  checked: TaskCard.jsx line 227 - send button condition
  found: Condition is `task.status === 'draft' && task.employee_id && isTaskInFuture()`
  implication: Send button only shows when status is 'draft', but task might have different status

- timestamp: 2026-01-24T05:52:00Z
  checked: seed.js line 92 - "ניקוי שירותים" task data
  found: Task created with status 'in_progress' not 'draft': `insertTask.run('ניקוי שירותים', 'ניקוי יומי של כל השירותים במבנה', 2, 4, 'daily', today, '08:00', 'normal', 'in_progress', 1);`
  implication: Task status is 'in_progress' which fails the first condition check (task.status === 'draft')

## Resolution

root_cause: Task "ניקוי שירותים" in seed.js is created with status 'in_progress' instead of 'draft'. The send button condition requires status === 'draft', so it never shows even though the task is in the future (08:00, 2h38m away).

fix: Changed task status from 'in_progress' to 'draft' in server/database/seed.js line 92

verification: To verify, user needs to:
1. Click "טען נתוני דמה" button to reseed database with corrected data
2. Find "ניקוי שירותים" task scheduled for 08:00
3. Confirm send button (✈️) now appears alongside edit (✏️) and delete (🗑️) buttons

files_changed: ['server/database/seed.js']
