const { db } = require('../database/schema');

let io;
function setIo(ioInstance) { io = ioInstance; }

/**
 * Returns tomorrow's date string (YYYY-MM-DD) given today's date string.
 */
function getTomorrow(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Rolls over all unfinished one-time tasks whose start_date <= dateStr
 * to the next day (dateStr + 1), and increments rollover_days.
 *
 * Statuses that roll over: draft, sent, received, not_completed
 * Statuses that do NOT roll over: completed, cancelled
 */
function rolloverOneTimeTasks(dateStr) {
  const tomorrow = getTomorrow(dateStr);

  const result = db.prepare(`
    UPDATE tasks
    SET start_date     = ?,
        start_time     = '',
        rollover_days  = COALESCE(rollover_days, 0) + 1,
        updated_at     = CURRENT_TIMESTAMP
    WHERE is_recurring = 0
      AND status IN ('draft', 'sent', 'received', 'not_completed')
      AND start_date <= ?
      AND start_date != ?
  `).run(tomorrow, dateStr, tomorrow);

  const changed = result.changes || 0;

  if (changed > 0) {
    console.log(`[TaskRollover] ${dateStr} -> rolled over ${changed} one-time tasks to ${tomorrow}`);
    if (io) {
      io.emit('tasks:bulk_updated', { changed, date: dateStr, source: 'rollover' });
    }
  }

  return { changed, tomorrow };
}

module.exports = { rolloverOneTimeTasks, setIo };
