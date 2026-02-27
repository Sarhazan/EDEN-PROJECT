const cron = require('node-cron');
const { db } = require('../database/schema');

const LAST_RUN_KEY = 'daily_schedule_last_run_date';
const START_TIME_KEY = 'workday_start_time';

// *** TEST MODE: Only send to this number, NOT to real employees ***
const TEST_PHONE = '+972587400300';
const TEST_MODE = true;

function getWorkdayStartTime() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(START_TIME_KEY);
  return row?.value || '08:00';
}

function getIsraelDateParts(now = new Date()) {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  return { dateStr, hhmm };
}

function isSundayToThursday(now = new Date()) {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short'
  }).format(now);

  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = map[dayName];
  return [0, 1, 2, 3, 4].includes(day);
}

function checkAndSendDailySchedule(now = new Date(), whatsappService) {
  const { dateStr, hhmm } = getIsraelDateParts(now);

  if (!isSundayToThursday(now)) return null;

  const startTime = getWorkdayStartTime();
  if (hhmm < startTime) return null;

  const lastRun = db.prepare('SELECT value FROM settings WHERE key = ?').get(LAST_RUN_KEY);
  if (lastRun?.value === dateStr) return null;

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(LAST_RUN_KEY, dateStr);

  const employees = db.prepare(`
    SELECT *
    FROM employees
    WHERE is_active = 1
      AND phone IS NOT NULL
      AND phone != ''
  `).all();

  for (const employee of employees) {
    const tasks = db.prepare(`
      SELECT *
      FROM tasks
      WHERE employee_id = ?
        AND start_date = ?
        AND status NOT IN ('not_completed', 'cancelled', 'completed')
      ORDER BY start_time ASC
    `).all(employee.id, dateStr);

    let message;
    if (tasks.length === 0) {
      message = `שלום ${employee.name}! אין לך משימות מיוחדות להיום. 😊`;
    } else {
      const taskLines = tasks.map((t) => {
        const time = t.start_time ? t.start_time.substring(0, 5) : '';
        return `• ${time} ${t.title || 'משימה'}`;
      }).join('\n');
      message = `שלום ${employee.name}! 👋\nהמשימות שלך להיום:\n${taskLines}\nבהצלחה! 🌟`;
    }

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
  const cronExpression = '* * * * *';
  if (!cron.validate(cronExpression)) {
    console.error('[DailySchedule] Invalid cron expression:', cronExpression);
    return { checkAndSendDailySchedule };
  }

  cron.schedule(cronExpression, () => {
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
