const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');
const { addDays, addWeeks, addMonths, format, differenceInMinutes } = require('date-fns');
const { getCurrentTimestampIsrael } = require('../utils/dateUtils');
const taskService = require('../services/taskService');

// Store io instance reference
let io;

// Function to set io instance (called from index.js after initialization)
function setIo(ioInstance) {
  io = ioInstance;
  console.log('Socket.IO instance set in tasks route');
}
const {
  calculateEstimatedEnd,
  enrichTaskWithTiming,
  getIsraelDateParts,
  resolveCreateStatusForDate
} = taskService;

const toMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return h * 60 + m;
};

const listRecurringDates = ({ frequency, start_date, weekly_days }) => {
  const today = new Date();
  const dates = [];

  if (frequency === 'daily' && Array.isArray(weekly_days) && weekly_days.length > 0) {
    const startDateObj = start_date ? new Date(start_date) : today;
    const startAnchor = startDateObj > today ? startDateObj : today;
    for (let i = 0; i <= 30; i++) {
      const checkDate = addDays(startAnchor, i);
      if (weekly_days.includes(checkDate.getDay())) {
        dates.push(format(checkDate, 'yyyy-MM-dd'));
      }
    }
    return dates;
  }

  if (frequency === 'daily') {
    const startDateObj = start_date ? new Date(start_date) : today;
    const startAnchor = startDateObj > today ? startDateObj : today;
    for (let i = 0; i <= 30; i++) {
      dates.push(format(addDays(startAnchor, i), 'yyyy-MM-dd'));
    }
    return dates;
  }

  const startDateObj = new Date(start_date);
  const maxInstances = {
    weekly: 12,
    biweekly: 6,
    monthly: 6,
    'semi-annual': 4,
    annual: 3
  }[frequency] || 1;

  for (let i = 0; i < maxInstances; i++) {
    let instanceDate;
    switch (frequency) {
      case 'weekly':
        instanceDate = addWeeks(startDateObj, i);
        break;
      case 'biweekly':
        instanceDate = addWeeks(startDateObj, i * 2);
        break;
      case 'monthly':
        instanceDate = addMonths(startDateObj, i);
        break;
      case 'semi-annual':
        instanceDate = addMonths(startDateObj, i * 6);
        break;
      case 'annual':
        instanceDate = addMonths(startDateObj, i * 12);
        break;
      default:
        instanceDate = startDateObj;
    }
    dates.push(format(instanceDate, 'yyyy-MM-dd'));
  }

  return dates;
};

const findOverlapForEmployee = ({ employeeId, dateStr, startTime, durationMinutes, excludeTaskId = null }) => {
  if (!employeeId || !dateStr || !startTime) return null;

  const startMin = toMinutes(startTime);
  if (startMin === null) return null;
  const endMin = startMin + (Number(durationMinutes) || 30);

  const excludeClause = excludeTaskId ? 'AND id != ?' : '';
  const params = excludeTaskId
    ? [employeeId, dateStr, excludeTaskId]
    : [employeeId, dateStr];

  const candidates = db.prepare(`
    SELECT id, title, start_date, start_time, estimated_duration_minutes, status
    FROM tasks
    WHERE employee_id = ?
      AND start_date = ?
      AND COALESCE(start_time, '') != ''
      AND status IN ('draft', 'sent', 'received', 'pending_approval')
      ${excludeClause}
  `).all(...params);

  for (const task of candidates) {
    const taskStart = toMinutes(task.start_time);
    if (taskStart === null) continue;
    const taskEnd = taskStart + (Number(task.estimated_duration_minutes) || 30);
    if (startMin < taskEnd && endMin > taskStart) {
      return task;
    }
  }

  return null;
};

const getRecurringConflicts = ({ title, employee_id, frequency, start_date, start_time, estimated_duration_minutes, weekly_days, is_recurring }) => {
  if (!is_recurring || !employee_id || !start_time) return [];

  const recurrenceDates = listRecurringDates({ frequency, start_date, weekly_days });
  const conflicts = [];

  for (const dateStr of recurrenceDates) {
    const existing = findOverlapForEmployee({
      employeeId: employee_id,
      dateStr,
      startTime: start_time,
      durationMinutes: estimated_duration_minutes || 30,
    });

    if (existing) {
      conflicts.push({
        existing,
        incoming: {
          title,
          start_date: dateStr,
          start_time,
          estimated_duration_minutes: estimated_duration_minutes || 30,
          frequency,
          is_recurring: true,
          employee_id,
        }
      });
    }
  }

  return conflicts;
};

// Get all tasks
router.get('/', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      ORDER BY t.start_date DESC, t.start_time DESC
    `).all();

    // Fetch attachments for all tasks
    const attachments = db.prepare(`
      SELECT * FROM task_attachments
    `).all();

    // Group attachments by task_id
    const attachmentsByTaskId = attachments.reduce((acc, att) => {
      if (!acc[att.task_id]) acc[att.task_id] = [];
      acc[att.task_id].push(att);
      return acc;
    }, {});

    // Add attachments to each task
    const tasksWithAttachments = tasks.map(task => ({
      ...task,
      attachments: attachmentsByTaskId[task.id] || []
    }));

    const enrichedTasks = tasksWithAttachments.map(enrichTaskWithTiming);
    res.json(enrichedTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's tasks (not completed, including pending_approval)
router.get('/today', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const tasks = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE (t.start_date = ? OR t.status = 'pending_approval') AND t.status != 'completed'
      ORDER BY t.priority DESC, t.start_time ASC
    `).all(today);

    // Fetch attachments for today's tasks
    const taskIds = tasks.map(t => t.id);
    let attachmentsByTaskId = {};
    if (taskIds.length > 0) {
      const attachments = db.prepare(`
        SELECT * FROM task_attachments WHERE task_id IN (${taskIds.map(() => '?').join(',')})
      `).all(...taskIds);
      attachmentsByTaskId = attachments.reduce((acc, att) => {
        if (!acc[att.task_id]) acc[att.task_id] = [];
        acc[att.task_id].push(att);
        return acc;
      }, {});
    }

    // Add attachments to each task
    const tasksWithAttachments = tasks.map(task => ({
      ...task,
      attachments: attachmentsByTaskId[task.id] || []
    }));

    const enrichedTasks = tasksWithAttachments.map(enrichTaskWithTiming);
    res.json(enrichedTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager approves a task (changes status from pending_approval to completed)
router.post('/:id/approve', (req, res) => {
  try {
    const { id } = req.params;

    // Get current task
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    if (task.status !== 'pending_approval') {
      return res.status(400).json({ error: 'ניתן לאשר רק משימות הממתינות לאישור' });
    }

    // Calculate time delta for statistics
    const estimatedEnd = calculateEstimatedEnd(task);
    const actualEnd = task.completed_at ? new Date(task.completed_at) : new Date();
    const timeDeltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

    // Update task status to completed with time_delta_minutes
    // If completed_at is not already set (old tasks), set it to now
    const approvalTs = getCurrentTimestampIsrael();
    db.prepare(`
      UPDATE tasks
      SET status = 'completed',
          completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
          approved_at = COALESCE(approved_at, ?),
          time_delta_minutes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(approvalTs, timeDeltaMinutes, id);

    // If task is recurring, create next instance
    if (task.is_recurring) {
      if (task.frequency === 'daily' && task.weekly_days) {
        const weeklyDays = JSON.parse(task.weekly_days);
        const currentDate = new Date(task.start_date);
        let nextDate = addDays(currentDate, 1);
        let foundNextDay = false;

        for (let i = 1; i <= 30 && !foundNextDay; i++) {
          const checkDate = addDays(currentDate, i);
          const dayOfWeek = checkDate.getDay();

          if (weeklyDays.includes(dayOfWeek)) {
            nextDate = checkDate;
            foundNextDay = true;
          }
        }

        if (foundNextDay) {
          const nextDateStr = format(nextDate, 'yyyy-MM-dd');
          db.prepare(`
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, parent_task_id, weekly_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
          `).run(task.title, task.description, task.system_id, task.employee_id, task.frequency, nextDateStr, task.start_time, task.priority, task.id, task.weekly_days);
        }
      } else {
        const currentDate = new Date(task.start_date);
        let nextDate;

        switch (task.frequency) {
          case 'daily':
            nextDate = addDays(currentDate, 1);
            break;
          case 'weekly':
            nextDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            nextDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            nextDate = addMonths(currentDate, 1);
            break;
          case 'semi-annual':
            nextDate = addMonths(currentDate, 6);
            break;
          case 'annual':
            nextDate = addMonths(currentDate, 12);
            break;
          default:
            nextDate = currentDate;
        }

        const nextDateStr = format(nextDate, 'yyyy-MM-dd');
        db.prepare(`
          INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, parent_task_id, weekly_days)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
        `).run(task.title, task.description, task.system_id, task.employee_id, task.frequency, nextDateStr, task.start_time, task.priority, task.id, task.weekly_days);
      }
    }

    // Get updated task with JOINs
    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(id);

    const enrichedTask = enrichTaskWithTiming(updatedTask);

    // Broadcast enriched task
    if (io) {
      io.emit('task:updated', { task: enrichedTask });
    }

    res.json({
      success: true,
      message: 'המשימה אושרה בהצלחה',
      task: enrichedTask
    });
  } catch (error) {
    console.error('Error approving task:', error);
    res.status(500).json({ error: 'שגיאה באישור המשימה' });
  }
});

// Get overdue tasks (one-time only, not completed)
router.get('/overdue', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const tasks = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.start_date < ? AND t.status NOT IN ('completed', 'not_completed') AND t.is_recurring = 0
      ORDER BY t.start_date ASC, t.start_time ASC
    `).all(today);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    const enrichedTask = enrichTaskWithTiming(task);
    res.json(enrichedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recurring overlap preview (visual resolver support)
router.post('/overlap-check', (req, res) => {
  try {
    const {
      title,
      employee_id,
      frequency,
      start_date,
      start_time,
      estimated_duration_minutes,
      weekly_days,
      is_recurring
    } = req.body || {};

    const conflicts = getRecurringConflicts({
      title,
      employee_id,
      frequency,
      start_date,
      start_time,
      estimated_duration_minutes,
      weekly_days,
      is_recurring
    });

    res.json({
      hasConflicts: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflicts: conflicts.slice(0, 8)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get attachments for a task
router.get('/:id/attachments', (req, res) => {
  try {
    const { id } = req.params;

    const attachments = db.prepare(`
      SELECT id, task_id, file_path, file_type, uploaded_at
      FROM task_attachments
      WHERE task_id = ?
      ORDER BY uploaded_at DESC
    `).all(id);

    res.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'שגיאה בטעינת קבצים מצורפים' });
  }
});

// Create task
router.post('/', (req, res) => {
  try {
    const { title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id } = req.body;

    const normalizedStartTime = typeof start_time === 'string' ? start_time.trim() : '';
    const isOneTimeTask = !is_recurring || frequency === 'one-time';

    if (!title || !start_date || (!isOneTimeTask && !normalizedStartTime)) {
      return res.status(400).json({ error: 'שדות חובה חסרים' });
    }

    // Server-side guard: recurring tasks can start only today (Israel) or later
    if (!isOneTimeTask) {
      const { dateStr: todayIsrael } = getIsraelDateParts(new Date());
      if (start_date < todayIsrael) {
        return res.status(400).json({ error: 'במשימה חוזרת ניתן לבחור תאריך התחלה מהיום והלאה בלבד' });
      }
    }

    const weeklyDaysJson = weekly_days && weekly_days.length > 0 ? JSON.stringify(weekly_days) : null;

    // For recurring tasks, create instances for the next 30 days
    if (is_recurring) {
      const today = new Date();
      const createdTaskIds = [];

      if (frequency === 'daily' && weekly_days && weekly_days.length > 0) {
        // Daily tasks with specific days
        // Start from the later of today and the provided start_date,
        // and include the start date itself when it matches selected weekdays.
        const startDateObj = start_date ? new Date(start_date) : today;
        const startAnchor = startDateObj > today ? startDateObj : today;

        for (let i = 0; i <= 30; i++) {
          const checkDate = addDays(startAnchor, i);
          const dayOfWeek = checkDate.getDay();

          if (weekly_days.includes(dayOfWeek)) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');

            const result = db.prepare(`
              INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, null, priority || 'normal', resolveCreateStatusForDate(dateStr, status), 1, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

            createdTaskIds.push(result.lastInsertRowid);
          }
        }
      } else if (frequency === 'daily') {
        // Daily tasks without specific days - every day
        // Start from the later of today and the provided start_date, and include that day.
        const startDateObj = start_date ? new Date(start_date) : today;
        const startAnchor = startDateObj > today ? startDateObj : today;

        for (let i = 0; i <= 30; i++) {
          const checkDate = addDays(startAnchor, i);
          const dateStr = format(checkDate, 'yyyy-MM-dd');

          const result = db.prepare(`
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, null, priority || 'normal', resolveCreateStatusForDate(dateStr, status), 1, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

          createdTaskIds.push(result.lastInsertRowid);
        }
      } else {
        // Weekly, biweekly, monthly, semi-annual, annual tasks
        const startDateObj = new Date(start_date);
        let instanceCount = 0;
        let maxInstances = 0;

        // Determine how many instances to create based on frequency
        switch (frequency) {
          case 'weekly':
            maxInstances = 12; // ~3 months
            break;
          case 'biweekly':
            maxInstances = 6; // ~3 months
            break;
          case 'monthly':
            maxInstances = 6; // 6 months
            break;
          case 'semi-annual':
            maxInstances = 4; // 2 years
            break;
          case 'annual':
            maxInstances = 3; // 3 years
            break;
          default:
            maxInstances = 1;
        }

        for (let i = 0; i < maxInstances; i++) {
          let instanceDate;

          switch (frequency) {
            case 'weekly':
              instanceDate = addWeeks(startDateObj, i);
              break;
            case 'biweekly':
              instanceDate = addWeeks(startDateObj, i * 2);
              break;
            case 'monthly':
              instanceDate = addMonths(startDateObj, i);
              break;
            case 'semi-annual':
              instanceDate = addMonths(startDateObj, i * 6);
              break;
            case 'annual':
              instanceDate = addMonths(startDateObj, i * 12);
              break;
            default:
              instanceDate = startDateObj;
          }

          const dateStr = format(instanceDate, 'yyyy-MM-dd');

          const result = db.prepare(`
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, null, priority || 'normal', resolveCreateStatusForDate(dateStr, status), 1, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

          createdTaskIds.push(result.lastInsertRowid);
        }
      }

      // Return the first created task
      if (createdTaskIds.length > 0) {
        const firstTask = db.prepare(`
          SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
          FROM tasks t
          LEFT JOIN systems s ON t.system_id = s.id
          LEFT JOIN employees e ON t.employee_id = e.id
          LEFT JOIN locations l ON t.location_id = l.id
          LEFT JOIN buildings b ON t.building_id = b.id
          WHERE t.id = ?
        `).get(createdTaskIds[0]);

        const enrichedTask = enrichTaskWithTiming(firstTask);

        // Broadcast enriched task creation event
        if (io) {
          io.emit('task:created', { task: enrichedTask });
        }

        return res.status(201).json(enrichedTask);
      } else {
        return res.status(400).json({ error: 'לא נוצרו משימות' });
      }
    }

    // For non-recurring tasks, create single instance
    const result = db.prepare(`
      INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, system_id || null, employee_id || null, frequency || 'one-time', start_date, normalizedStartTime || '', due_date || null, priority || 'normal', resolveCreateStatusForDate(start_date, status), 0, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

    const newTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    const enrichedTask = enrichTaskWithTiming(newTask);

    // Broadcast enriched task creation event
    if (io) {
      io.emit('task:created', { task: enrichedTask });
    }

    res.status(201).json(enrichedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', (req, res) => {
  try {
    const { title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id, update_scope } = req.body;
    const normalizedStartTime = typeof start_time === 'string' ? start_time.trim() : '';

    const weeklyDaysJson = weekly_days && weekly_days.length > 0 ? JSON.stringify(weekly_days) : null;

    // Get current task to check if status is changing to 'sent' or if recurrence changed
    const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!currentTask) return res.status(404).json({ error: 'משימה לא נמצאה' });

    const wasRecurring = currentTask.is_recurring === 1;
    const nowRecurring = !!is_recurring;

    // Detect frequency change BEFORE running the regular UPDATE — critical for delete+recreate logic
    const frequencyChanged = wasRecurring && nowRecurring && currentTask.frequency !== frequency;

    // Skip the regular UPDATE when doing a full frequency change (delete+recreate handles persistence)
    let result = { changes: 1 }; // default: assume success for frequency-change path
    if (!(update_scope === 'all' && frequencyChanged)) {
      // If status is changing to 'sent' and sent_at is not already set, set it now
      if (status === 'sent' && !currentTask.sent_at) {
        const timestamp = getCurrentTimestampIsrael();
        result = db.prepare(`
          UPDATE tasks
          SET title = ?, description = ?, system_id = ?, employee_id = ?, frequency = ?, start_date = ?, start_time = ?, due_date = ?, priority = ?, status = ?, is_recurring = ?, weekly_days = ?, estimated_duration_minutes = ?, location_id = ?, building_id = ?, sent_at = ?, updated_at = ?
          WHERE id = ?
        `).run(title, description, system_id || null, employee_id || null, frequency, start_date, normalizedStartTime || '', due_date || null, priority, status, is_recurring ? 1 : 0, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null, timestamp, timestamp, req.params.id);
      } else {
        result = db.prepare(`
          UPDATE tasks
          SET title = ?, description = ?, system_id = ?, employee_id = ?, frequency = ?, start_date = ?, start_time = ?, due_date = ?, priority = ?, status = ?, is_recurring = ?, weekly_days = ?, estimated_duration_minutes = ?, location_id = ?, building_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(title, description, system_id || null, employee_id || null, frequency, start_date, normalizedStartTime || '', due_date || null, priority, status, is_recurring ? 1 : 0, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null, req.params.id);
      }
      if (result.changes === 0) {
        return res.status(404).json({ error: 'משימה לא נמצאה' });
      }
    }
    const { dateStr: todayStr } = getIsraelDateParts(new Date());

    // Compute day delta for recurring scope updates (used by drag across days)
    const toUtcMs = (isoDate) => {
      if (!isoDate || typeof isoDate !== 'string') return null;
      const [y, m, d] = isoDate.split('-').map(Number);
      if (!y || !m || !d) return null;
      return Date.UTC(y, m - 1, d);
    };
    const newStartMs = toUtcMs(start_date);
    const currentStartMs = toUtcMs(currentTask?.start_date);
    const dayDelta = (newStartMs != null && currentStartMs != null)
      ? Math.round((newStartMs - currentStartMs) / 86400000)
      : 0;
    const dayShiftModifier = dayDelta === 0 ? null : `${dayDelta >= 0 ? '+' : ''}${dayDelta} day`;

    // ── update_scope='all': update all future sibling recurring instances ─────
    // (only when frequency did NOT change — if it changed, see block below)
    if (update_scope === 'all' && wasRecurring && nowRecurring && !frequencyChanged) {
      db.prepare(`
        UPDATE tasks
        SET title = ?, description = ?, system_id = ?, employee_id = ?,
            frequency = ?, start_time = ?,
            start_date = CASE WHEN ? IS NULL THEN start_date ELSE date(start_date, ?) END,
            priority = ?,
            weekly_days = ?, estimated_duration_minutes = ?,
            location_id = ?, building_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id != ?
          AND is_recurring = 1
          AND status IN ('draft', 'sent', 'received')
          AND start_date >= ?
          AND COALESCE(employee_id, -1) = COALESCE(?, -1)
          AND COALESCE(system_id, -1) = COALESCE(?, -1)
          AND frequency = ?
          AND start_time = ?
      `).run(
        title,
        description || null,
        system_id || null,
        employee_id || null,
        frequency,
        normalizedStartTime || '',
        dayShiftModifier,
        dayShiftModifier,
        priority,
        weeklyDaysJson,
        estimated_duration_minutes || 30,
        location_id || null,
        building_id || null,
        req.params.id,
        currentTask.start_date,
        currentTask.employee_id,
        currentTask.system_id,
        currentTask.frequency,
        currentTask.start_time
      );
    }

    // ── recurring frequency changed (scope=all): replace future instances ────
    // Delete old series instances (future, not completed) + create new ones
    if (update_scope === 'all' && frequencyChanged) {
      // 1. Delete ALL future undone instances of OLD series (including current task)
      db.prepare(`
        DELETE FROM tasks
        WHERE is_recurring = 1
          AND status IN ('draft', 'sent', 'received')
          AND start_date >= ?
          AND COALESCE(employee_id, -1) = COALESCE(?, -1)
          AND COALESCE(system_id, -1) = COALESCE(?, -1)
          AND frequency = ?
          AND start_time = ?
      `).run(
        todayStr,
        currentTask.employee_id,
        currentTask.system_id,
        currentTask.frequency,
        currentTask.start_time
      );


      // 2. Create new instances with NEW frequency from start_date
      const startDateObj = new Date(start_date);
      const insertInstance = db.prepare(`
        INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `);

      if (frequency === 'daily' && weekly_days && weekly_days.length > 0) {
        for (let i = 1; i <= 30; i++) {
          const checkDate = addDays(startDateObj, i);
          if (weekly_days.includes(checkDate.getDay())) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            insertInstance.run(title, description, system_id || null, employee_id || null, frequency, dateStr, normalizedStartTime, null, priority || 'normal', resolveCreateStatusForDate(dateStr, 'draft'), weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);
          }
        }
      } else if (frequency !== 'one-time') {
        const maxInstances = { weekly: 12, biweekly: 6, monthly: 6, 'semi-annual': 4, annual: 3 }[frequency] || 1;
        for (let i = 1; i <= maxInstances; i++) {
          let instanceDate;
          switch (frequency) {
            case 'weekly':      instanceDate = addWeeks(startDateObj, i); break;
            case 'biweekly':    instanceDate = addWeeks(startDateObj, i * 2); break;
            case 'monthly':     instanceDate = addMonths(startDateObj, i); break;
            case 'semi-annual': instanceDate = addMonths(startDateObj, i * 6); break;
            case 'annual':      instanceDate = addMonths(startDateObj, i * 12); break;
            default:            instanceDate = addDays(startDateObj, i);
          }
          const dateStr = format(instanceDate, 'yyyy-MM-dd');
          insertInstance.run(title, description, system_id || null, employee_id || null, frequency, dateStr, normalizedStartTime, null, priority || 'normal', resolveCreateStatusForDate(dateStr, 'draft'), weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);
        }
      }
    }

    // ── frequency changed: early return after delete+recreate ────────────────
    if (update_scope === 'all' && frequencyChanged) {
      if (io) io.emit('tasks:bulk_updated', { source: 'frequency_change' });
      return res.json({ success: true, message: 'סדרת המשימות עודכנה בהצלחה' });
    }

    // ── recurring → one-time: delete future sibling instances ────────────────
    if (wasRecurring && !nowRecurring) {
      db.prepare(`
        DELETE FROM tasks
        WHERE id != ?
          AND is_recurring = 1
          AND status IN ('draft', 'sent', 'received')
          AND start_date > ?
          AND COALESCE(employee_id, -1) = COALESCE(?, -1)
          AND COALESCE(system_id, -1) = COALESCE(?, -1)
          AND frequency = ?
          AND start_time = ?
      `).run(
        req.params.id,
        todayStr,
        currentTask.employee_id,
        currentTask.system_id,
        currentTask.frequency,
        currentTask.start_time
      );
    }

    // ── one-time → recurring: create future instances ─────────────────────────
    if (!wasRecurring && nowRecurring && frequency && frequency !== 'one-time') {
      const startDateObj = new Date(start_date);
      const insertInstance = db.prepare(`
        INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `);

      if (frequency === 'daily' && weekly_days && weekly_days.length > 0) {
        for (let i = 1; i <= 30; i++) {
          const checkDate = addDays(startDateObj, i);
          if (weekly_days.includes(checkDate.getDay())) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            insertInstance.run(title, description, system_id || null, employee_id || null, frequency, dateStr, normalizedStartTime, null, priority || 'normal', resolveCreateStatusForDate(dateStr, 'draft'), weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);
          }
        }
      } else if (frequency === 'daily') {
        for (let i = 1; i <= 30; i++) {
          const dateStr = format(addDays(startDateObj, i), 'yyyy-MM-dd');
          insertInstance.run(title, description, system_id || null, employee_id || null, frequency, dateStr, normalizedStartTime, null, priority || 'normal', resolveCreateStatusForDate(dateStr, 'draft'), weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);
        }
      } else {
        const maxInstances = { weekly: 12, biweekly: 6, monthly: 6, 'semi-annual': 4, annual: 3 }[frequency] || 1;
        for (let i = 1; i <= maxInstances; i++) {
          let instanceDate;
          switch (frequency) {
            case 'weekly':    instanceDate = addWeeks(startDateObj, i); break;
            case 'biweekly':  instanceDate = addWeeks(startDateObj, i * 2); break;
            case 'monthly':   instanceDate = addMonths(startDateObj, i); break;
            case 'semi-annual': instanceDate = addMonths(startDateObj, i * 6); break;
            case 'annual':    instanceDate = addMonths(startDateObj, i * 12); break;
            default:          instanceDate = addDays(startDateObj, i);
          }
          const dateStr = format(instanceDate, 'yyyy-MM-dd');
          insertInstance.run(title, description, system_id || null, employee_id || null, frequency, dateStr, normalizedStartTime, null, priority || 'normal', resolveCreateStatusForDate(dateStr, 'draft'), weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);
        }
      }
    }

    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(req.params.id);

    const enrichedTask = enrichTaskWithTiming(updatedTask);

    // Broadcast enriched task update event
    if (io) {
      io.emit('task:updated', { task: enrichedTask });
      // Also broadcast bulk update so clients refresh the full task list
      if (wasRecurring !== nowRecurring || frequencyChanged) {
        io.emit('tasks:bulk_updated', { source: 'recurrence_change' });
      }
    }

    res.json(enrichedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status (with recurring logic)
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    // Update current task status
    // If status is 'sent', also update sent_at timestamp
    // If status is 'completed', also update completed_at and time_delta_minutes
    if (status === 'sent') {
      const timestamp = getCurrentTimestampIsrael();
      db.prepare(`
        UPDATE tasks
        SET status = ?, sent_at = ?, updated_at = ?
        WHERE id = ?
      `).run(status, timestamp, timestamp, req.params.id);
    } else if (status === 'received') {
      const timestamp = getCurrentTimestampIsrael();
      db.prepare(`
        UPDATE tasks
        SET status = ?, acknowledged_at = COALESCE(acknowledged_at, ?), updated_at = ?
        WHERE id = ?
      `).run(status, timestamp, timestamp, req.params.id);
    } else if (status === 'pending_approval') {
      const timestamp = getCurrentTimestampIsrael();

      // Worker marked done and sent to manager approval
      const estimatedEnd = calculateEstimatedEnd(task);
      const actualEnd = new Date(timestamp);
      const timeDeltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

      db.prepare(`
        UPDATE tasks
        SET status = ?,
            approval_requested_at = COALESCE(approval_requested_at, ?),
            completed_at = COALESCE(completed_at, ?),
            time_delta_minutes = ?,
            updated_at = ?
        WHERE id = ?
      `).run(status, timestamp, timestamp, timeDeltaMinutes, timestamp, req.params.id);
    } else if (status === 'completed') {
      const timestamp = getCurrentTimestampIsrael();

      // Calculate time delta for statistics
      const estimatedEnd = calculateEstimatedEnd(task);
      const actualEnd = new Date(timestamp);
      const timeDeltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

      // If task came from pending_approval, this completion is manager approval
      const approvedAt = task.status === 'pending_approval' ? timestamp : null;

      db.prepare(`
        UPDATE tasks
        SET status = ?,
            completed_at = COALESCE(completed_at, ?),
            approved_at = CASE
              WHEN ? IS NOT NULL THEN COALESCE(approved_at, ?)
              ELSE approved_at
            END,
            time_delta_minutes = ?,
            updated_at = ?
        WHERE id = ?
      `).run(status, timestamp, approvedAt, approvedAt, timeDeltaMinutes, timestamp, req.params.id);
    } else {
      db.prepare(`
        UPDATE tasks
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, req.params.id);
    }

    // If task is completed and recurring, create next instance
    if (status === 'completed' && task.is_recurring) {
      // For daily tasks with specific weekly days, create next instance based on weekly_days
      if (task.frequency === 'daily' && task.weekly_days) {
        const weeklyDays = JSON.parse(task.weekly_days);
        const currentDate = new Date(task.start_date);
        let nextDate = addDays(currentDate, 1);
        let foundNextDay = false;

        // Look for the next occurrence within the next 30 days
        for (let i = 1; i <= 30 && !foundNextDay; i++) {
          const checkDate = addDays(currentDate, i);
          const dayOfWeek = checkDate.getDay();

          if (weeklyDays.includes(dayOfWeek)) {
            nextDate = checkDate;
            foundNextDay = true;
          }
        }

        if (foundNextDay) {
          const nextDateStr = format(nextDate, 'yyyy-MM-dd');

          // Create new task instance
          db.prepare(`
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, parent_task_id, weekly_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
          `).run(task.title, task.description, task.system_id, task.employee_id, task.frequency, nextDateStr, task.start_time, task.priority, task.id, task.weekly_days);
        }
      } else {
        // For other recurring tasks (weekly, monthly, etc.)
        const currentDate = new Date(task.start_date);
        let nextDate;

        switch (task.frequency) {
          case 'daily':
            nextDate = addDays(currentDate, 1);
            break;
          case 'weekly':
            nextDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            nextDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            nextDate = addMonths(currentDate, 1);
            break;
          case 'semi-annual':
            nextDate = addMonths(currentDate, 6);
            break;
          case 'annual':
            nextDate = addMonths(currentDate, 12);
            break;
          default:
            nextDate = currentDate;
        }

        const nextDateStr = format(nextDate, 'yyyy-MM-dd');

        // Create new task instance
        db.prepare(`
          INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, parent_task_id, weekly_days)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
        `).run(task.title, task.description, task.system_id, task.employee_id, task.frequency, nextDateStr, task.start_time, task.priority, task.id, task.weekly_days);
      }
    }

    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(req.params.id);

    const enrichedTask = enrichTaskWithTiming(updatedTask);

    // Broadcast enriched task update event
    if (io) {
      io.emit('task:updated', { task: enrichedTask });
    }

    res.json(enrichedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
// Delete entire recurring series (all instances with same title+employee+frequency)
router.delete('/:id/series', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });

    // Match all instances of this series
    const result = db.prepare(`
      DELETE FROM tasks
      WHERE title = ?
        AND COALESCE(employee_id, 0) = COALESCE(?, 0)
        AND frequency = ?
        AND is_recurring = 1
    `).run(task.title, task.employee_id, task.frequency);

    if (io) {
      io.emit('tasks:series_deleted', { title: task.title, frequency: task.frequency, deleted: result.changes });
    }

    res.json({ deleted: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const taskId = req.params.id;

    // Get task before deleting (for broadcasting)
    const task = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    // Broadcast task deletion event with full task object
    if (io) {
      io.emit('task:deleted', { task });
    }

    res.json({ message: 'המשימה נמחקה בהצלחה' });
  } catch (error) {
    console.error('[DELETE /tasks/:id] Error:', error.message, error.stack?.split('\n')[1]);
    res.status(500).json({ error: error.message });
  }
});

// Toggle task star status
router.put('/:id/star', (req, res) => {
  try {
    const taskId = req.params.id;

    // Toggle is_starred using SQL CASE statement (avoids race conditions)
    const result = db.prepare(`
      UPDATE tasks
      SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(taskId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    // Get updated task with JOINs
    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name, l.name as location_name, b.name as building_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN locations l ON t.location_id = l.id
      LEFT JOIN buildings b ON t.building_id = b.id
      WHERE t.id = ?
    `).get(taskId);

    const enrichedTask = enrichTaskWithTiming(updatedTask);

    // Broadcast task update event
    if (io) {
      io.emit('task:updated', { task: enrichedTask });
    }

    res.json(enrichedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.setIo = setIo;
