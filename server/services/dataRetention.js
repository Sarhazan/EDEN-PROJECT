const cron = require('node-cron');
const { db } = require('../database/schema');

/**
 * Delete completed tasks older than 2 years
 * Runs in transaction for safety (all-or-nothing)
 */
function cleanupOldTasks() {
  const startTime = new Date();
  console.log(`[Data Retention] Starting cleanup at ${startTime.toISOString()}`);

  try {
    // Get count before deletion for logging
    const beforeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-2 years')
    `).get();

    console.log(`[Data Retention] Found ${beforeCount.count} tasks to delete`);

    if (beforeCount.count === 0) {
      console.log('[Data Retention] No tasks to delete');
      return { deleted: 0, duration: 0 };
    }

    // Delete in transaction for atomicity
    const deleteStmt = db.prepare(`
      DELETE FROM tasks
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-2 years')
    `);

    const result = db.transaction(() => {
      return deleteStmt.run();
    })();

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(
      `[Data Retention] Cleanup complete: ${result.changes} tasks deleted in ${duration}ms`
    );

    return {
      deleted: result.changes,
      duration: duration,
      timestamp: endTime.toISOString()
    };

  } catch (error) {
    console.error('[Data Retention] Cleanup failed:', error);
    throw error; // Re-throw for caller to handle
  }
}

/**
 * Initialize scheduled cleanup job
 * Runs daily at 2:00 AM Israel time
 *
 * @returns {Object} Object with cleanupOldTasks function for manual testing
 */
function initializeDataRetention() {
  // Validate cron expression
  const cronExpression = '0 2 * * *';
  if (!cron.validate(cronExpression)) {
    console.error('[Data Retention] Invalid cron expression:', cronExpression);
    return { cleanupOldTasks };
  }

  // Schedule job - runs daily at 2:00 AM Israel time
  cron.schedule(cronExpression, () => {
    console.log('[Data Retention] Scheduled cleanup triggered');
    try {
      cleanupOldTasks();
    } catch (error) {
      console.error('[Data Retention] Scheduled cleanup failed:', error);
      // In production, could send alert email/notification here
    }
  }, {
    timezone: "Asia/Jerusalem",
    scheduled: true
  });

  console.log('[Data Retention] Cron job initialized (daily at 2:00 AM Israel time)');

  // Return for manual testing if needed
  return { cleanupOldTasks };
}

module.exports = { initializeDataRetention, cleanupOldTasks };
