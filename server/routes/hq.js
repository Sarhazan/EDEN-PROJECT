const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get dispatch targets (employees/managers)
router.get('/dispatch/targets', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT id, name, phone, position, language
      FROM employees
      ORDER BY name ASC
    `).all();

    res.json({
      total: employees.length,
      employees
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk dispatch tasks from HQ
router.post('/dispatch', (req, res) => {
  try {
    const {
      title,
      description,
      start_date,
      start_time,
      priority = 'normal',
      targetMode = 'all', // all | specific
      managerIds = []
    } = req.body;

    if (!title || !start_date || !start_time) {
      return res.status(400).json({ error: 'שדות חובה חסרים (כותרת, תאריך, שעה)' });
    }

    let targets = [];

    if (targetMode === 'all') {
      targets = db.prepare(`SELECT id, name FROM employees ORDER BY name ASC`).all();
    } else if (targetMode === 'specific') {
      if (!Array.isArray(managerIds) || managerIds.length === 0) {
        return res.status(400).json({ error: 'נא לבחור לפחות מנהל אחד' });
      }

      const placeholders = managerIds.map(() => '?').join(',');
      targets = db.prepare(`
        SELECT id, name
        FROM employees
        WHERE id IN (${placeholders})
        ORDER BY name ASC
      `).all(...managerIds.map(Number));
    } else {
      return res.status(400).json({ error: 'targetMode לא חוקי' });
    }

    if (targets.length === 0) {
      return res.status(400).json({ error: 'לא נמצאו מנהלים לשליחה' });
    }

    const insertTask = db.prepare(`
      INSERT INTO tasks (
        title, description, employee_id, start_date, start_time,
        priority, status, is_recurring, estimated_duration_minutes
      )
      VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, 30)
    `);

    const transaction = db.transaction(() => {
      const created = [];
      for (const target of targets) {
        const result = insertTask.run(
          title,
          description || null,
          target.id,
          start_date,
          start_time,
          priority
        );

        created.push({
          taskId: result.lastInsertRowid,
          employeeId: target.id,
          employeeName: target.name
        });
      }
      return created;
    });

    const createdTasks = transaction();

    res.status(201).json({
      success: true,
      summary: {
        targetMode,
        requestedTargets: targetMode === 'all' ? 'all' : managerIds.length,
        actualTargets: targets.length,
        createdTasks: createdTasks.length,
        failed: 0
      },
      createdTasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
