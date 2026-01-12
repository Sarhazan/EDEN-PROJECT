const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get all systems
router.get('/', (req, res) => {
  try {
    const systems = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM tasks WHERE system_id = s.id AND status != 'completed') as active_tasks_count
      FROM systems s
      ORDER BY s.name ASC
    `).all();

    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single system with tasks
router.get('/:id', (req, res) => {
  try {
    const system = db.prepare('SELECT * FROM systems WHERE id = ?').get(req.params.id);

    if (!system) {
      return res.status(404).json({ error: 'מערכת לא נמצאה' });
    }

    const tasks = db.prepare(`
      SELECT t.*, e.name as employee_name
      FROM tasks t
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.system_id = ?
      ORDER BY t.start_date DESC, t.start_time DESC
    `).all(req.params.id);

    res.json({ ...system, tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create system
router.post('/', (req, res) => {
  try {
    const { name, description, contact_person, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'שם המערכת הוא שדה חובה' });
    }

    const result = db.prepare(`
      INSERT INTO systems (name, description, contact_person, phone, email)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description, contact_person, phone, email);

    const newSystem = db.prepare('SELECT * FROM systems WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newSystem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update system
router.put('/:id', (req, res) => {
  try {
    const { name, description, contact_person, phone, email } = req.body;

    const result = db.prepare(`
      UPDATE systems
      SET name = ?, description = ?, contact_person = ?, phone = ?, email = ?
      WHERE id = ?
    `).run(name, description, contact_person, phone, email, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'מערכת לא נמצאה' });
    }

    const updatedSystem = db.prepare('SELECT * FROM systems WHERE id = ?').get(req.params.id);
    res.json(updatedSystem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete system
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM systems WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'מערכת לא נמצאה' });
    }

    res.json({ message: 'המערכת נמחקה בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
