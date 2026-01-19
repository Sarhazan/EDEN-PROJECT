const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');
const { addDays, addWeeks, addMonths, format } = require('date-fns');

// Import io instance for broadcasting (may be undefined during initial module load)
let io;
try {
  io = require('../index').io;
} catch (e) {
  // io will be undefined if index.js hasn't finished loading yet
  io = undefined;
}

// Get all tasks
router.get('/', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      ORDER BY t.start_date DESC, t.start_time DESC
    `).all();

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's tasks (not completed)
router.get('/today', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const tasks = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.start_date = ? AND t.status != 'completed'
      ORDER BY t.priority DESC, t.start_time ASC
    `).all(today);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get overdue tasks (one-time only, not completed)
router.get('/overdue', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    const tasks = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
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
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', (req, res) => {
  try {
    const { title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, weekly_days } = req.body;

    if (!title || !start_date || !start_time) {
      return res.status(400).json({ error: 'שדות חובה חסרים' });
    }

    const weeklyDaysJson = weekly_days && weekly_days.length > 0 ? JSON.stringify(weekly_days) : null;

    // For recurring tasks, create instances for the next 30 days
    if (is_recurring) {
      const today = new Date();
      const createdTaskIds = [];

      if (frequency === 'daily' && weekly_days && weekly_days.length > 0) {
        // Daily tasks with specific days
        for (let i = 0; i < 30; i++) {
          const checkDate = addDays(today, i);
          const dayOfWeek = checkDate.getDay();

          if (weekly_days.includes(dayOfWeek)) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');

            const result = db.prepare(`
              INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, weekly_days)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, priority || 'normal', status || 'draft', 1, weeklyDaysJson);

            createdTaskIds.push(result.lastInsertRowid);
          }
        }
      } else if (frequency === 'daily') {
        // Daily tasks without specific days - every day
        for (let i = 0; i < 30; i++) {
          const checkDate = addDays(today, i);
          const dateStr = format(checkDate, 'yyyy-MM-dd');

          const result = db.prepare(`
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, weekly_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, priority || 'normal', status || 'draft', 1, weeklyDaysJson);

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
            INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, weekly_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(title, description, system_id || null, employee_id || null, frequency, dateStr, start_time, priority || 'normal', status || 'draft', 1, weeklyDaysJson);

          createdTaskIds.push(result.lastInsertRowid);
        }
      }

      // Return the first created task
      if (createdTaskIds.length > 0) {
        const firstTask = db.prepare(`
          SELECT t.*, s.name as system_name, e.name as employee_name
          FROM tasks t
          LEFT JOIN systems s ON t.system_id = s.id
          LEFT JOIN employees e ON t.employee_id = e.id
          WHERE t.id = ?
        `).get(createdTaskIds[0]);

        // Broadcast task creation event
        if (io) {
          io.emit('task:created', { task: firstTask });
        }

        return res.status(201).json(firstTask);
      } else {
        return res.status(400).json({ error: 'לא נוצרו משימות' });
      }
    }

    // For non-recurring tasks, create single instance
    const result = db.prepare(`
      INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, weekly_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, system_id || null, employee_id || null, frequency || 'one-time', start_date, start_time, priority || 'normal', status || 'draft', 0, weeklyDaysJson);

    const newTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    // Broadcast task creation event
    if (io) {
      io.emit('task:created', { task: newTask });
    }

    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', (req, res) => {
  try {
    const { title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, weekly_days } = req.body;

    const weeklyDaysJson = weekly_days && weekly_days.length > 0 ? JSON.stringify(weekly_days) : null;

    const result = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, system_id = ?, employee_id = ?, frequency = ?, start_date = ?, start_time = ?, priority = ?, status = ?, is_recurring = ?, weekly_days = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, system_id || null, employee_id || null, frequency, start_date, start_time, priority, status, is_recurring ? 1 : 0, weeklyDaysJson, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(req.params.id);

    // Broadcast task update event
    if (io) {
      io.emit('task:updated', { task: updatedTask });
    }

    res.json(updatedTask);
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
    if (status === 'sent') {
      db.prepare(`
        UPDATE tasks
        SET status = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, req.params.id);
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
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(req.params.id);

    // Broadcast task update event
    if (io) {
      io.emit('task:updated', { task: updatedTask });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', (req, res) => {
  try {
    const taskId = req.params.id;
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    // Broadcast task deletion event
    if (io) {
      io.emit('task:deleted', { taskId: parseInt(taskId) });
    }

    res.json({ message: 'המשימה נמחקה בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
