const cron = require('node-cron');
const axios = require('axios');
const { db } = require('../database/schema');

const LAST_RUN_KEY = 'daily_schedule_last_run_date';
const AUTO_SEND_TIME_KEY = 'auto_send_workday_time';
const MANAGER_EMPLOYEE_KEY = 'manager_employee_id';

function getAutoSendTime() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(AUTO_SEND_TIME_KEY);
  return row?.value || '';
}

function getManagerEmployeeId() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(MANAGER_EMPLOYEE_KEY);
  return row?.value ? Number(row.value) : null;
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

function getLastRunDate() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(LAST_RUN_KEY);
  return row?.value || null;
}

function setLastRunDate(dateStr) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(LAST_RUN_KEY, dateStr);
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

async function checkAndSendDailySchedule(now = new Date(), whatsappService) {
  const { dateStr, hhmm } = getIsraelDateParts(now);

  const autoSendTime = getAutoSendTime();
  if (!autoSendTime) return null; // Feature disabled
  if (hhmm < autoSendTime) return null;

  const lastRunDate = getLastRunDate();
  if (lastRunDate === dateStr) return null;

  // If WhatsApp is not connected at send-time, skip for today (no retries today).
  if (!whatsappService?.isReady) {
    setLastRunDate(dateStr);
    console.log(`[DailySchedule] ${dateStr} ${autoSendTime} -> skipped (whatsapp not ready)`);
    return { dateStr, skipped: 'whatsapp_not_ready' };
  }

  const managerEmployeeId = getManagerEmployeeId();

  const employees = db.prepare(`
    SELECT id, name, phone, language
    FROM employees
    WHERE phone IS NOT NULL
      AND phone != ''
      AND (? IS NULL OR id != ?)
    ORDER BY id ASC
  `).all(managerEmployeeId, managerEmployeeId);

  const tasksByEmployee = {};
  for (const employee of employees) {
    const tasks = db.prepare(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.start_time,
        t.priority,
        t.estimated_duration_minutes,
        t.status,
        s.name AS system_name
      FROM tasks t
      LEFT JOIN systems s ON s.id = t.system_id
      WHERE t.employee_id = ?
        AND t.start_date = ?
        AND t.status IN ('draft', 'sent', 'received')
      ORDER BY
        CASE WHEN t.start_time IS NULL OR t.start_time = '' THEN 1 ELSE 0 END,
        t.start_time ASC,
        t.id ASC
    `).all(employee.id, dateStr);

    if (tasks.length === 0) continue;

    tasksByEmployee[String(employee.id)] = {
      phone: employee.phone,
      name: employee.name,
      language: employee.language || 'he',
      date: formatDisplayDate(dateStr),
      tasks
    };
  }

  if (Object.keys(tasksByEmployee).length === 0) {
    setLastRunDate(dateStr);
    console.log(`[DailySchedule] ${dateStr} ${autoSendTime} -> nothing to send`);
    return { dateStr, skipped: 'no_tasks' };
  }

  const serverPort = process.env.PORT || 3002;
  const baseUrl = `http://127.0.0.1:${serverPort}`;

  try {
    // Use the exact same flow as clicking "Send Day" (same endpoint + interactive link logic)
    const response = await axios.post(`${baseUrl}/api/whatsapp/send-bulk`, { tasksByEmployee }, { timeout: 120000 });
    const sent = response?.data?.results?.filter((r) => r.success).length || 0;
    setLastRunDate(dateStr);
    console.log(`[DailySchedule] ${dateStr} ${autoSendTime} -> send-bulk success (${sent}/${Object.keys(tasksByEmployee).length})`);
    return { dateStr, employees: Object.keys(tasksByEmployee).length, sent };
  } catch (err) {
    setLastRunDate(dateStr);
    console.error('[DailySchedule] send-bulk failed:', err?.response?.data || err?.message || err);
    return { dateStr, skipped: 'send_failed', error: err?.message };
  }
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
