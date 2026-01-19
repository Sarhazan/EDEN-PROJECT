const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../database/schema');

// Import io instance for broadcasting (may be undefined during initial module load)
let io;
try {
  io = require('../index').io;
} catch (e) {
  // io will be undefined if index.js hasn't finished loading yet
  io = undefined;
}

// Generate a unique token for employee task confirmation
router.post('/generate', async (req, res) => {
  try {
    const { employeeId, taskIds } = req.body;

    if (!employeeId || !taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'חסרים פרטים: מזהה עובד ורשימת משימות' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store token in database
    const stmt = db.prepare(`
      INSERT INTO task_confirmations (token, employee_id, task_ids, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(token, employeeId, JSON.stringify(taskIds), expiresAt.toISOString());

    res.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error generating confirmation token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for a confirmation token
router.get('/:token', (req, res) => {
  try {
    const { token } = req.params;

    // Get confirmation record
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קוד אימות לא נמצא' });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    // Parse task IDs
    const taskIds = JSON.parse(confirmation.task_ids);

    // Get tasks with related data
    const tasks = db.prepare(`
      SELECT
        t.*,
        s.name as system_name,
        e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id IN (${taskIds.map(() => '?').join(',')})
      ORDER BY t.start_time ASC
    `).all(...taskIds);

    // Get employee info
    const employee = db.prepare(`
      SELECT id, name, phone FROM employees WHERE id = ?
    `).get(confirmation.employee_id);

    res.json({
      success: true,
      employee,
      tasks,
      isAcknowledged: confirmation.is_acknowledged === 1,
      acknowledgedAt: confirmation.acknowledged_at
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a single task status
router.put('/:token/task/:taskId', (req, res) => {
  try {
    const { token, taskId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'sent', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'סטטוס לא חוקי' });
    }

    // Verify token exists and not expired
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קוד אימות לא נמצא' });
    }

    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    // Verify task belongs to this confirmation
    const taskIds = JSON.parse(confirmation.task_ids);
    if (!taskIds.includes(parseInt(taskId))) {
      return res.status(403).json({ error: 'משימה זו לא שייכת לקוד האימות' });
    }

    // Update task status
    const stmt = db.prepare(`
      UPDATE tasks
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, taskId);

    // Get updated task with related data for broadcasting
    const updatedTask = db.prepare(`
      SELECT t.*, s.name as system_name, e.name as employee_name
      FROM tasks t
      LEFT JOIN systems s ON t.system_id = s.id
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `).get(taskId);

    // Broadcast task update event
    if (io && updatedTask) {
      io.emit('task:updated', { task: updatedTask });
    }

    res.json({
      success: true,
      message: 'סטטוס המשימה עודכן בהצלחה'
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge receipt of all tasks
router.post('/:token/acknowledge', (req, res) => {
  try {
    const { token } = req.params;

    // Verify token exists and not expired
    const confirmation = db.prepare(`
      SELECT * FROM task_confirmations WHERE token = ?
    `).get(token);

    if (!confirmation) {
      return res.status(404).json({ error: 'קוד אימות לא נמצא' });
    }

    const now = new Date();
    const expiresAt = new Date(confirmation.expires_at);
    if (now > expiresAt) {
      return res.status(410).json({ error: 'קוד האימות פג תוקף' });
    }

    if (confirmation.is_acknowledged === 1) {
      return res.json({
        success: true,
        message: 'המשימות כבר אושרו קודם לכן',
        acknowledgedAt: confirmation.acknowledged_at
      });
    }

    // Mark as acknowledged
    const stmt = db.prepare(`
      UPDATE task_confirmations
      SET is_acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP
      WHERE token = ?
    `);

    stmt.run(token);

    // Update all tasks to 'received' status (we'll use 'in_progress' for now since 'received' is not in schema)
    const taskIds = JSON.parse(confirmation.task_ids);
    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    taskIds.forEach(taskId => {
      updateStmt.run(taskId);
    });

    // Broadcast task update events for all acknowledged tasks
    if (io) {
      const updatedTasks = db.prepare(`
        SELECT t.*, s.name as system_name, e.name as employee_name
        FROM tasks t
        LEFT JOIN systems s ON t.system_id = s.id
        LEFT JOIN employees e ON t.employee_id = e.id
        WHERE t.id IN (${taskIds.map(() => '?').join(',')})
      `).all(...taskIds);

      updatedTasks.forEach(task => {
        io.emit('task:updated', { task });
      });
    }

    res.json({
      success: true,
      message: 'קבלת המשימות אושרה בהצלחה'
    });
  } catch (error) {
    console.error('Error acknowledging tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
