const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get all employees
router.get('/', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM tasks WHERE employee_id = e.id AND status != 'completed') as active_tasks_count
      FROM employees e
      ORDER BY e.name ASC
    `).all();

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single employee
router.get('/:id', (req, res) => {
  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }

    const activeTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE employee_id = ? AND status != 'completed'
    `).get(req.params.id);

    res.json({ ...employee, active_tasks_count: activeTasks.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee
router.post('/', (req, res) => {
  try {
    const { name, phone, position, language } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'שם העובד הוא שדה חובה' });
    }

    // Validate language if provided
    if (language && !['he', 'en', 'ru', 'ar'].includes(language)) {
      return res.status(400).json({ error: 'שפה לא חוקית. בחר: he, en, ru, ar' });
    }

    const result = db.prepare(`
      INSERT INTO employees (name, phone, position, language)
      VALUES (?, ?, ?, ?)
    `).run(name, phone, position, language || 'he');

    const newEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.put('/:id', (req, res) => {
  try {
    const { name, phone, position, language } = req.body;

    // Validate language if provided
    if (language && !['he', 'en', 'ru', 'ar'].includes(language)) {
      return res.status(400).json({ error: 'שפה לא חוקית. בחר: he, en, ru, ar' });
    }

    const result = db.prepare(`
      UPDATE employees
      SET name = ?, phone = ?, position = ?, language = ?
      WHERE id = ?
    `).run(name, phone, position, language || 'he', req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }

    const updatedEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }

    res.json({ message: 'העובד נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
