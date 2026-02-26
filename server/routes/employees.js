const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get all employees
router.get('/', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM tasks WHERE employee_id = e.id AND status NOT IN ('completed', 'not_completed')) as active_tasks_count
      FROM employees e
      ORDER BY e.name ASC
    `).all();

    // Add statistics for each employee
    const employeesWithStats = employees.map(employee => {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE
            WHEN status = 'completed' AND completed_at IS NOT NULL THEN
              CASE
                WHEN datetime(completed_at) <= datetime(start_date || ' ' || start_time, '+' || COALESCE(estimated_duration_minutes, 30) || ' minutes')
                THEN 1 ELSE 0
              END
            ELSE 0
          END) as completed_on_time,
          SUM(CASE
            WHEN status = 'completed' AND completed_at IS NOT NULL THEN
              CASE
                WHEN datetime(completed_at) > datetime(start_date || ' ' || start_time, '+' || COALESCE(estimated_duration_minutes, 30) || ' minutes')
                THEN 1 ELSE 0
              END
            ELSE 0
          END) as completed_late,
          ROUND(
            SUM(CASE
              WHEN status = 'completed' AND completed_at IS NOT NULL THEN
                CASE
                  WHEN datetime(completed_at) <= datetime(start_date || ' ' || start_time, '+' || COALESCE(estimated_duration_minutes, 30) || ' minutes')
                  THEN 1 ELSE 0
                END
              ELSE 0
            END) * 100.0 / NULLIF(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0), 1
          ) as on_time_percentage
        FROM tasks
        WHERE employee_id = ?
      `).get(employee.id);

      return {
        ...employee,
        stats: {
          total_tasks: stats.total_tasks || 0,
          completed_tasks: stats.completed_tasks || 0,
          completed_on_time: stats.completed_on_time || 0,
          completed_late: stats.completed_late || 0,
          on_time_percentage: stats.on_time_percentage || 0
        }
      };
    });

    res.json(employeesWithStats);
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
      SELECT COUNT(*) as count FROM tasks WHERE employee_id = ? AND status NOT IN ('completed', 'not_completed')
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
    console.log('[DEBUG PUT /employees/:id] Received update for employee', req.params.id);
    console.log('[DEBUG PUT /employees/:id] Request body:', { name, phone, position, language });

    // Validate language if provided
    if (language && !['he', 'en', 'ru', 'ar'].includes(language)) {
      return res.status(400).json({ error: 'שפה לא חוקית. בחר: he, en, ru, ar' });
    }

    const finalLanguage = language || 'he';
    console.log('[DEBUG PUT /employees/:id] Final language value:', finalLanguage);

    const result = db.prepare(`
      UPDATE employees
      SET name = ?, phone = ?, position = ?, language = ?
      WHERE id = ?
    `).run(name, phone, position, finalLanguage, req.params.id);

    console.log('[DEBUG PUT /employees/:id] Update result:', result);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }

    const updatedEmployee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    console.log('[DEBUG PUT /employees/:id] Updated employee from DB:', updatedEmployee);
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
