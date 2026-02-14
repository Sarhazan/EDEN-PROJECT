const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');
const { addDays, addWeeks, addMonths, format, addMinutes, differenceInMinutes } = require('date-fns');
const { getCurrentTimestampIsrael } = require('../utils/dateUtils');

// Store io instance reference
let io;

// Function to set io instance (called from index.js after initialization)
function setIo(ioInstance) {
  io = ioInstance;
  console.log('Socket.IO instance set in tasks route');
}

/**
 * Calculate estimated end time for a task
 * @param {Object} task - Task object with start_date, start_time, estimated_duration_minutes
 * @returns {Date} Estimated end time as Date object
 */
function calculateEstimatedEnd(task) {
  const isOneTime = task.is_recurring !== 1 || task.frequency === 'one-time';

  if (isOneTime) {
    const endTimeSetting = db.prepare(`SELECT value FROM settings WHERE key = 'workday_end_time'`).get();
    const workdayEnd = endTimeSetting?.value || '18:00';
    const dueDate = task.due_date || task.start_date;
    return new Date(`${dueDate}T${workdayEnd}:00`);
  }

  const taskStart = new Date(`${task.start_date}T${task.start_time}`);
  const durationMinutes = task.estimated_duration_minutes || 30;
  return addMinutes(taskStart, durationMinutes);
}

/**
 * Enrich task with timing information (late detection, time remaining, etc.)
 * @param {Object} task - Task object from database
 * @returns {Object} Task with added timing fields
 */
function enrichTaskWithTiming(task) {
  // Skip timing logic for completed tasks (calculate delta instead)
  if (task.status === 'completed') {
    return {
      ...task,
      ...calculateTimeDelta(task)
    };
  }

  const now = new Date();
  const estimatedEnd = calculateEstimatedEnd(task);
  const minutesRemaining = differenceInMinutes(estimatedEnd, now);

  const isLate = minutesRemaining < 0;
  const isNearDeadline = !isLate && minutesRemaining < 10;

  return {
    ...task,
    estimated_end_time: estimatedEnd.toTimeString().slice(0, 5), // "HH:MM"
    is_late: isLate,
    minutes_remaining: Math.abs(minutesRemaining), // Always positive for display
    minutes_remaining_text: formatMinutesToHebrew(Math.abs(minutesRemaining)), // Human-readable format
    timing_status: isLate ? 'late' : (isNearDeadline ? 'near-deadline' : 'on-time')
  };
}

/**
 * Format minutes into days, hours, minutes (Hebrew)
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted string like "2 ימים, 3 שעות, 40 דקות"
 */
function formatMinutesToHebrew(totalMinutes) {
  const absMinutes = Math.abs(totalMinutes);

  const days = Math.floor(absMinutes / (24 * 60));
  const hours = Math.floor((absMinutes % (24 * 60)) / 60);
  const minutes = absMinutes % 60;

  const parts = [];

  if (days > 0) {
    parts.push(days === 1 ? 'יום אחד' : `${days} ימים`);
  }

  if (hours > 0) {
    parts.push(hours === 1 ? 'שעה אחת' : `${hours} שעות`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(minutes === 1 ? 'דקה אחת' : `${minutes} דקות`);
  }

  return parts.join(', ');
}

/**
 * Calculate time delta for completed tasks (early/on-time/late)
 * @param {Object} task - Completed task with completed_at timestamp
 * @returns {Object} Object with delta fields
 */
function calculateTimeDelta(task) {
  if (!task.completed_at) {
    return {
      time_delta_minutes: null,
      time_delta_text: null
    };
  }

  const estimatedEnd = calculateEstimatedEnd(task);
  const actualEnd = new Date(task.completed_at);
  const deltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

  let deltaText;
  if (deltaMinutes < 0) {
    deltaText = `הושלם מוקדם ב-${formatMinutesToHebrew(deltaMinutes)}`;
  } else if (deltaMinutes > 0) {
    deltaText = `איחור של ${formatMinutesToHebrew(deltaMinutes)}`;
  } else {
    deltaText = 'הושלם בזמן';
  }

  return {
    time_delta_minutes: deltaMinutes,
    time_delta_text: deltaText
  };
}

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
    db.prepare(`
      UPDATE tasks
      SET status = 'completed',
          completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
          time_delta_minutes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(timeDeltaMinutes, id);

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
      WHERE t.start_date < ? AND t.status != 'completed' AND t.is_recurring = 0
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

    const weeklyDaysJson = weekly_days && weekly_days.length > 0 ? JSON.stringify(weekly_days) : null;

    // For recurring tasks, create instances for the next 30 days
    if (is_recurring) {
      const today = new Date();
      const createdTaskIds = [];

      if (frequency === 'daily' && weekly_days && weekly_days.length > 0) {
        // Daily tasks with specific days - start from tomorrow (i=1) to avoid creating past instances
        for (let i = 1; i <= 30; i++) {
          const checkDate = addDays(today, i);
          const dayOfWeek = checkDate.getDay();

          if (weekly_days.includes(dayOfWeek)) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');

            const result = db.prepare(`
              INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, null, priority || 'normal', status || 'draft', 1, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

            createdTaskIds.push(result.lastInsertRowid);
          }
        }
      } else if (frequency === 'daily') {
        // Daily tasks without specific days - every day, start from tomorrow (i=1)
        for (let i = 1; i <= 30; i++) {
          const checkDate = addDays(today, i);
          const dateStr = format(checkDate, 'yyyy-MM-dd');

          const result = db.prepare(`
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, null, priority || 'normal', status || 'draft', 1, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

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
          `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, null, priority || 'normal', status || 'draft', 1, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

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
    `).run(title, description, system_id || null, employee_id || null, frequency || 'one-time', start_date, normalizedStartTime || '', due_date || null, priority || 'normal', status || 'draft', 0, weeklyDaysJson, estimated_duration_minutes || 30, location_id || null, building_id || null);

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
    const { title, description, system_id, employee_id, frequency, start_date, start_time, due_date, priority, status, is_recurring, weekly_days, estimated_duration_minutes, location_id, building_id } = req.body;
    const normalizedStartTime = typeof start_time === 'string' ? start_time.trim() : '';

    const weeklyDaysJson = weekly_days && weekly_days.length > 0 ? JSON.stringify(weekly_days) : null;

    // Get current task to check if status is changing to 'sent'
    const currentTask = db.prepare('SELECT status, sent_at FROM tasks WHERE id = ?').get(req.params.id);

    // If status is changing to 'sent' and sent_at is not already set, set it now
    let result;
    if (status === 'sent' && currentTask && !currentTask.sent_at) {
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
    } else if (status === 'completed') {
      const timestamp = getCurrentTimestampIsrael();

      // Calculate time delta for statistics
      const estimatedEnd = calculateEstimatedEnd(task);
      const actualEnd = new Date(timestamp);
      const timeDeltaMinutes = differenceInMinutes(actualEnd, estimatedEnd);

      db.prepare(`
        UPDATE tasks
        SET status = ?, completed_at = COALESCE(completed_at, ?), time_delta_minutes = ?, updated_at = ?
        WHERE id = ?
      `).run(status, timestamp, timeDeltaMinutes, timestamp, req.params.id);
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
