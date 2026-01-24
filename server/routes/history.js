const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

/**
 * GET /api/history
 *
 * Query parameters:
 * - startDate: ISO date string (optional, defaults to 7 days ago)
 * - endDate: ISO date string (optional)
 * - employeeId: integer (optional)
 * - systemId: integer (optional)
 * - locationId: integer (optional)
 * - limit: integer (default 50)
 * - offset: integer (default 0)
 *
 * Returns:
 * - tasks: Array of completed tasks with enriched data
 * - pagination: { total, limit, offset, hasMore }
 * - stats: { total_completed, total_late, on_time_percentage }
 */
router.get('/', (req, res) => {
  try {
    const {
      startDate,
      endDate,
      employeeId,
      systemId,
      locationId,
      limit = 50,
      offset = 0
    } = req.query;

    // Build dynamic WHERE clause using parameterized queries
    const conditions = ['t.status = ?'];
    const params = ['completed'];

    // Default to last 7 days if no date range specified
    if (startDate) {
      conditions.push('t.completed_at >= ?');
      params.push(startDate);
    } else {
      conditions.push("t.completed_at >= datetime('now', '-7 days')");
    }

    if (endDate) {
      conditions.push('t.completed_at <= ?');
      params.push(endDate);
    }

    if (employeeId) {
      conditions.push('t.employee_id = ?');
      params.push(parseInt(employeeId));
    }

    if (systemId) {
      conditions.push('t.system_id = ?');
      params.push(parseInt(systemId));
    }

    if (locationId) {
      conditions.push('s.location_id = ?');
      params.push(parseInt(locationId));
    }

    const whereClause = conditions.join(' AND ');

    // Get filtered tasks with JOINs
    const tasksQuery = `
      SELECT t.*,
             s.name as system_name,
             e.name as employee_name,
             l.name as location_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE ${whereClause}
      ORDER BY t.completed_at DESC
      LIMIT ? OFFSET ?
    `;

    const tasks = db.prepare(tasksQuery).all(...params, parseInt(limit), parseInt(offset));

    // Get total count for pagination (same WHERE clause, no LIMIT/OFFSET)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      WHERE ${whereClause}
    `;

    const { total } = db.prepare(countQuery).get(...params);

    // Get statistics (using CASE aggregation for single query)
    // Handle NULL time_delta_minutes by treating as on-time (0 or NULL = on-time, > 0 = late)
    const statsQuery = `
      SELECT
        COUNT(*) as total_completed,
        SUM(CASE WHEN t.time_delta_minutes IS NOT NULL AND t.time_delta_minutes > 0 THEN 1 ELSE 0 END) as total_late,
        ROUND(
          100.0 * SUM(CASE WHEN t.time_delta_minutes IS NULL OR t.time_delta_minutes <= 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
          1
        ) as on_time_percentage
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      WHERE ${whereClause}
    `;

    const stats = db.prepare(statsQuery).get(...params);

    // Calculate hasMore for pagination
    const hasMore = (parseInt(offset) + parseInt(limit)) < total;

    res.json({
      tasks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore
      },
      stats: {
        total_completed: stats.total_completed || 0,
        total_late: stats.total_late || 0,
        on_time_percentage: stats.on_time_percentage || 0
      }
    });

  } catch (error) {
    console.error('History query failed:', error);
    res.status(500).json({ error: 'שגיאה בטעינת היסטוריה' });
  }
});

module.exports = router;
