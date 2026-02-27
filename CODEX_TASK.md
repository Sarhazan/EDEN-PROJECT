# Codex Task: workday_start_time Feature

## Project location
C:\dev\projects\claude projects\eden claude

## Files to read first:
- server/routes/accounts.js (settings API, see workday_end_time pattern)
- server/services/taskAutoClose.js (cron pattern to copy)
- server/database/schema.js (DB schema and default settings)
- client/src/pages/SettingsPage.jsx (see workdayEndTime UI pattern)
- client/src/components/employees/EmployeeCalendarModal.jsx (calendar component, see HOURS constant)

## What to implement:

### STEP 1: DB default
In server/database/schema.js, find where settings defaults are inserted (look for workday_end_time INSERT) and add:
  INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('workday_start_time', '08:00', datetime('now'));

### STEP 2: API - allow saving workday_start_time
In server/routes/accounts.js, PUT /settings/:key handler:
The handler already uses INSERT OR REPLACE for any key. Just make sure 'workday_start_time' is not blocked.
When key === 'workday_start_time': reset the daily schedule marker similar to how workday_end_time resets task_autoclose_last_run_date.
Add: db.prepare("DELETE FROM settings WHERE key = 'daily_schedule_last_run_date'").run();

### STEP 3: New service - server/services/dailyScheduleSender.js
Create this file. Model it after taskAutoClose.js.

```javascript
const cron = require('node-cron');
const { db } = require('../database/schema');

const LAST_RUN_KEY = 'daily_schedule_last_run_date';
const START_TIME_KEY = 'workday_start_time';

// *** TEST MODE: Only send to this number, NOT to real employees ***
const TEST_PHONE = '+972587400300';
const TEST_MODE = true;

function getWorkdayStartTime() {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(START_TIME_KEY);
  return row?.value || '08:00';
}

function getIsraelDateParts(now = new Date()) {
  // Same pattern as taskAutoClose.js
}

function isSundayToThursday(now) {
  // Get day of week in Israel timezone (0=Sun, 1=Mon, ..., 6=Sat)
  // Return true if day is 0,1,2,3,4
}

function checkAndSendDailySchedule(now = new Date(), whatsappService) {
  const { dateStr, hhmm } = getIsraelDateParts(now);
  
  // Only Sun-Thu
  if (!isSundayToThursday(now)) return null;
  
  const startTime = getWorkdayStartTime();
  if (hhmm < startTime) return null;
  
  const lastRun = db.prepare("SELECT value FROM settings WHERE key = ?").get(LAST_RUN_KEY);
  if (lastRun?.value === dateStr) return null;
  
  // Mark as run first (prevent double-send)
  db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").run(LAST_RUN_KEY, dateStr);
  
  // Get all active employees with phone numbers
  const employees = db.prepare("SELECT * FROM employees WHERE is_active = 1 AND phone IS NOT NULL AND phone != ''").all();
  
  // Get today's tasks for each employee
  for (const employee of employees) {
    const tasks = db.prepare("SELECT * FROM tasks WHERE employee_id = ? AND start_date = ? AND status NOT IN ('not_completed', 'cancelled', 'completed') ORDER BY start_time ASC").all(employee.id, dateStr);
    
    // Build message
    let message;
    if (tasks.length === 0) {
      message = `שלום ${employee.name}! אין לך משימות מיוחדות להיום. 😊`;
    } else {
      const taskLines = tasks.map(t => {
        const time = t.start_time ? t.start_time.substring(0, 5) : '';
        return `• ${time} ${t.title || 'משימה'}`;
      }).join('\n');
      message = `שלום ${employee.name}! 👋\nהמשימות שלך להיום:\n${taskLines}\nבהצלחה! 🌟`;
    }
    
    // *** TEST MODE: Only send to test number ***
    const targetPhone = TEST_MODE ? TEST_PHONE : employee.phone;
    
    try {
      if (whatsappService && typeof whatsappService.sendMessage === 'function') {
        whatsappService.sendMessage(targetPhone, message);
      }
    } catch (err) {
      console.error('[DailySchedule] Failed to send to', targetPhone, err?.message);
    }
  }
  
  console.log(`[DailySchedule] ${dateStr} ${startTime} -> sent schedules for ${employees.length} employees (TEST_MODE=${TEST_MODE})`);
  return { dateStr, employees: employees.length };
}

function initializeDailyScheduleSender(whatsappService) {
  cron.schedule('* * * * *', () => {
    try {
      checkAndSendDailySchedule(new Date(), whatsappService);
    } catch (err) {
      console.error('[DailySchedule] Scheduled run failed:', err);
    }
  }, { timezone: 'Asia/Jerusalem', scheduled: true });
  
  console.log('[DailySchedule] Cron job initialized (checks every minute, Asia/Jerusalem)');
  return { checkAndSendDailySchedule };
}

module.exports = { initializeDailyScheduleSender, checkAndSendDailySchedule };
```

### STEP 4: Register in server/index.js
Find where initializeTaskAutoClose is imported and called.
Add alongside it:
```javascript
const { initializeDailyScheduleSender } = require('./services/dailyScheduleSender');
// ... pass the whatsapp service/client if available
initializeDailyScheduleSender(whatsappClient); // check how whatsappClient is available in index.js
```

### STEP 5: UI - SettingsPage.jsx client/src/pages/SettingsPage.jsx
Add workday_start_time state alongside workday_end_time:
- Add state: const [workdayStartTime, setWorkdayStartTime] = useState('08:00');
- Add saving/saved state for it
- In the useEffect that loads settings, also fetch workday_start_time
- Add a save handler identical to the workday_end_time one
- In JSX, in the "הגדרות יום עבודה" section, ADD a new field ABOVE the existing שעת סיום יום:
  - Label: שעת תחילת יום
  - Description: בשעה זו ישלחו לעובדים משימות היום דרך WhatsApp (א׳-ה׳)
  - Input: same time input as end time
  - Default: 08:00

### STEP 6: Employee Calendar - dynamic HOURS range
In client/src/components/employees/EmployeeCalendarModal.jsx:
Currently: const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00–21:00

Change to fetch workday_start_time and workday_end_time from API on mount.
Calculate: startHour = max(0, parseInt(startTime) - 2), endHour = min(23, parseInt(endTime) + 2)
Generate HOURS dynamically from startHour to endHour.
Use useState for hours array, fetch from /api/accounts/settings/workday_start_time and /api/accounts/settings/workday_end_time

## Important constraints:
- Server API: USE PUT not PATCH for task updates  
- TEST_MODE is CRITICAL - dailyScheduleSender must ONLY send to +972587400300
- Do NOT touch Windows system files
- Follow existing code patterns exactly

## When completely finished:
Run this exact command:
openclaw system event --text "Done: Eden workday_start_time complete" --mode now
