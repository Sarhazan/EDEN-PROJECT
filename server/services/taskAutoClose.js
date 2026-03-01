const cron = require('node-cron');
const { db } = require('../database/schema');

let io;
function setIo(ioInstance) { io = ioInstance; }

const LAST_RUN_KEY = 'task_autoclose_last_run_date';
const END_TIME_KEY = 'workday_end_time';

function getWorkdayEndTime() {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(END_TIME_KEY);
  return row?.value || '18:00';
}

function getLastRunDate() {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(LAST_RUN_KEY);
  return row?.value || null;
}

function setLastRunDate(dateStr) {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(LAST_RUN_KEY, dateStr);
}

function autoCloseOpenTasksForDate(dateStr) {
  const result = db.prepare(`
    UPDATE tasks
    SET status = 'not_completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('draft', 'sent', 'received')
      AND (
        -- Tasks without due_date: close on start_date
        (due_date IS NULL AND start_date = ?)
        OR
        -- Tasks with due_date: close only on due_date (not start_date)
        (due_date IS NOT NULL AND due_date = ?)
      )
  `).run(dateStr, dateStr);

  return result.changes || 0;
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

function checkAndRunAutoClose(now = new Date()) {
  const { dateStr, hhmm } = getIsraelDateParts(now);

  const configuredEndTime = getWorkdayEndTime();
  // Run as soon as we've reached (or passed) the configured end time.
  // This makes the job resilient if the server restarts or misses the exact minute.
  if (hhmm < configuredEndTime) return null;

  const lastRunDate = getLastRunDate();
  if (lastRunDate === dateStr) return null;

  const changed = autoCloseOpenTasksForDate(dateStr);
  setLastRunDate(dateStr);

  console.log(`[TaskAutoClose] ${dateStr} ${configuredEndTime} -> marked ${changed} tasks as not_completed`);

  // Notify all connected clients to refresh their task list
  if (io && changed > 0) {
    io.emit('tasks:bulk_updated', { changed, date: dateStr, source: 'autoclose' });
  }

  return { dateStr, configuredEndTime, changed };
}

function initializeTaskAutoClose() {
  const cronExpression = '* * * * *';
  if (!cron.validate(cronExpression)) {
    console.error('[TaskAutoClose] Invalid cron expression:', cronExpression);
    return { checkAndRunAutoClose, autoCloseOpenTasksForDate };
  }

  cron.schedule(
    cronExpression,
    () => {
      try {
        checkAndRunAutoClose(new Date());
      } catch (error) {
        console.error('[TaskAutoClose] Scheduled run failed:', error);
      }
    },
    { timezone: 'Asia/Jerusalem', scheduled: true }
  );

  console.log('[TaskAutoClose] Cron job initialized (checks every minute, Asia/Jerusalem)');
  return { checkAndRunAutoClose, autoCloseOpenTasksForDate };
}

module.exports = {
  initializeTaskAutoClose,
  checkAndRunAutoClose,
  autoCloseOpenTasksForDate,
  setIo
};
