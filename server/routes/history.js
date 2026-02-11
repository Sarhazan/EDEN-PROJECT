const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

function toPositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed;
}

function buildCommonFilters(query = {}, options = {}) {
  const { includeCompletedOnly = false, tableAlias = 't' } = options;
  const {
    managerId,
    employeeId,
    buildingId,
    startDate,
    endDate
  } = query;

  const conditions = [];
  const params = [];

  const effectiveEmployeeId = managerId || employeeId;

  if (effectiveEmployeeId !== undefined) {
    const parsedEmployeeId = toPositiveInt(effectiveEmployeeId, null);
    if (parsedEmployeeId !== null) {
      conditions.push(`${tableAlias}.employee_id = ?`);
      params.push(parsedEmployeeId);
    }
  }

  if (buildingId !== undefined) {
    const parsedBuildingId = toPositiveInt(buildingId, null);
    if (parsedBuildingId !== null) {
      conditions.push(`${tableAlias}.building_id = ?`);
      params.push(parsedBuildingId);
    }
  }

  if (startDate) {
    if (includeCompletedOnly) {
      conditions.push(`${tableAlias}.completed_at >= ?`);
      params.push(startDate);
    } else {
      conditions.push(`${tableAlias}.start_date >= ?`);
      params.push(startDate);
    }
  }

  if (endDate) {
    if (includeCompletedOnly) {
      conditions.push(`${tableAlias}.completed_at <= ?`);
      params.push(`${endDate} 23:59:59`);
    } else {
      conditions.push(`${tableAlias}.start_date <= ?`);
      params.push(endDate);
    }
  }

  return { conditions, params };
}

/**
 * GET /api/history/hq-summary
 * HQ dashboard monitoring summary endpoint.
 */
router.get('/hq-summary', (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 50);
    const offset = toPositiveInt(req.query.offset, 0);

    const baseFilters = buildCommonFilters(req.query, { includeCompletedOnly: false, tableAlias: 't' });
    const completedFilters = buildCommonFilters(req.query, { includeCompletedOnly: true, tableAlias: 't' });

    const activeWhereParts = [...baseFilters.conditions, "t.status != 'completed'"];
    const activeWhere = activeWhereParts.length ? `WHERE ${activeWhereParts.join(' AND ')}` : '';

    const overdueWhereParts = [...activeWhereParts,
      `datetime(t.start_date || ' ' || t.start_time, '+' || COALESCE(t.estimated_duration_minutes, 30) || ' minutes') < datetime('now')`
    ];
    const overdueWhere = `WHERE ${overdueWhereParts.join(' AND ')}`;

    const baseWhere = baseFilters.conditions.length ? `WHERE ${baseFilters.conditions.join(' AND ')}` : '';

    const completedWhereParts = [...completedFilters.conditions, "t.status = 'completed'"];
    const completedWhere = `WHERE ${completedWhereParts.join(' AND ')}`;

    const kpiQuery = `
      SELECT
        (SELECT COUNT(*) FROM tasks t ${activeWhere}) AS total_active_tasks,
        (SELECT COUNT(*) FROM tasks t ${overdueWhere}) AS overdue_tasks,
        (
          SELECT ROUND(
            100.0 * SUM(
              CASE
                WHEN t.time_delta_minutes IS NOT NULL THEN CASE WHEN t.time_delta_minutes <= 0 THEN 1 ELSE 0 END
                WHEN t.completed_at IS NOT NULL THEN CASE
                  WHEN datetime(t.completed_at) <= datetime(t.start_date || ' ' || t.start_time, '+' || COALESCE(t.estimated_duration_minutes, 30) || ' minutes') THEN 1
                  ELSE 0
                END
                ELSE 0
              END
            ) / NULLIF(COUNT(*), 0),
            1
          )
          FROM tasks t
          ${completedWhere}
        ) AS on_time_percentage,
        (
          SELECT ROUND(AVG(
            CASE
              WHEN t.completed_at IS NOT NULL THEN
                (strftime('%s', t.completed_at) - strftime('%s', t.start_date || ' ' || t.start_time)) / 60.0
              WHEN t.time_delta_minutes IS NOT NULL THEN
                COALESCE(t.estimated_duration_minutes, 30) + t.time_delta_minutes
              ELSE NULL
            END
          ), 1)
          FROM tasks t
          ${completedWhere}
        ) AS avg_work_duration_minutes
    `;

    const kpiParams = [
      ...baseFilters.params,
      ...baseFilters.params,
      ...completedFilters.params,
      ...completedFilters.params
    ];
    const kpis = db.prepare(kpiQuery).get(...kpiParams);

    const managerTableQuery = `
      SELECT
        e.id AS employee_id,
        e.name AS employee_name,
        COALESCE(e.position, 'N/A') AS manager_name,
        COUNT(t.id) AS total_tasks,
        SUM(CASE WHEN t.status != 'completed' THEN 1 ELSE 0 END) AS active_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(
          CASE
            WHEN t.status != 'completed'
              AND datetime(t.start_date || ' ' || t.start_time, '+' || COALESCE(t.estimated_duration_minutes, 30) || ' minutes') < datetime('now')
            THEN 1 ELSE 0
          END
        ) AS overdue_tasks,
        ROUND(
          100.0 * SUM(
            CASE
              WHEN t.status = 'completed' AND t.time_delta_minutes IS NOT NULL THEN CASE WHEN t.time_delta_minutes <= 0 THEN 1 ELSE 0 END
              WHEN t.status = 'completed' AND t.completed_at IS NOT NULL THEN CASE
                WHEN datetime(t.completed_at) <= datetime(t.start_date || ' ' || t.start_time, '+' || COALESCE(t.estimated_duration_minutes, 30) || ' minutes') THEN 1
                ELSE 0
              END
              ELSE 0
            END
          ) / NULLIF(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END), 0),
          1
        ) AS on_time_percentage,
        ROUND(AVG(
          CASE
            WHEN t.status = 'completed' AND t.completed_at IS NOT NULL THEN
              (strftime('%s', t.completed_at) - strftime('%s', t.start_date || ' ' || t.start_time)) / 60.0
            WHEN t.status = 'completed' AND t.time_delta_minutes IS NOT NULL THEN
              COALESCE(t.estimated_duration_minutes, 30) + t.time_delta_minutes
            ELSE NULL
          END
        ), 1) AS avg_work_duration_minutes
      FROM tasks t
      LEFT JOIN employees e ON e.id = t.employee_id
      ${baseWhere}
      GROUP BY e.id, e.name, e.position
      ORDER BY overdue_tasks DESC, active_tasks DESC, employee_name ASC
    `;

    const managerTable = db.prepare(managerTableQuery).all(...baseFilters.params);

    const drilldownWhere = baseWhere;
    const drilldownQuery = `
      SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.start_date,
        t.start_time,
        t.completed_at,
        t.time_delta_minutes,
        t.estimated_duration_minutes,
        e.id AS employee_id,
        e.name AS employee_name,
        COALESCE(e.position, 'N/A') AS manager_name,
        b.id AS building_id,
        b.name AS building_name,
        CASE
          WHEN t.completed_at IS NOT NULL THEN ROUND((strftime('%s', t.completed_at) - strftime('%s', t.start_date || ' ' || t.start_time)) / 60.0, 1)
          WHEN t.time_delta_minutes IS NOT NULL THEN ROUND(COALESCE(t.estimated_duration_minutes, 30) + t.time_delta_minutes, 1)
          ELSE NULL
        END AS work_duration_minutes
      FROM tasks t
      LEFT JOIN employees e ON e.id = t.employee_id
      LEFT JOIN buildings b ON b.id = t.building_id
      ${drilldownWhere}
      ORDER BY
        CASE WHEN t.status != 'completed' THEN 0 ELSE 1 END ASC,
        t.start_date DESC,
        t.start_time DESC
      LIMIT ? OFFSET ?
    `;

    const drilldown = db.prepare(drilldownQuery).all(...baseFilters.params, limit, offset);

    const drilldownCountQuery = `
      SELECT COUNT(*) AS total
      FROM tasks t
      ${drilldownWhere}
    `;
    const drilldownCount = db.prepare(drilldownCountQuery).get(...baseFilters.params);

    res.json({
      kpis: {
        total_active_tasks: kpis?.total_active_tasks || 0,
        overdue_tasks: kpis?.overdue_tasks || 0,
        on_time_percentage: kpis?.on_time_percentage || 0,
        avg_work_duration_minutes: kpis?.avg_work_duration_minutes || 0
      },
      manager_table: managerTable,
      drilldown: {
        items: drilldown,
        pagination: {
          total: drilldownCount?.total || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (drilldownCount?.total || 0)
        },
        filters: {
          managerId: req.query.managerId || null,
          buildingId: req.query.buildingId || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null
        }
      }
    });
  } catch (error) {
    console.error('HQ summary query failed:', error);
    res.status(500).json({ error: 'Failed to load HQ dashboard summary' });
  }
});

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
      // Append time to make the date inclusive (end of day)
      params.push(`${endDate} 23:59:59`);
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

