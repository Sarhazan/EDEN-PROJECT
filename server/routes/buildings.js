const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get all buildings
router.get('/', (req, res) => {
  try {
    const buildings = db.prepare('SELECT * FROM buildings ORDER BY name ASC').all();
    res.json(buildings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single building
router.get('/:id', (req, res) => {
  try {
    const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(req.params.id);

    if (!building) {
      return res.status(404).json({ error: 'מבנה לא נמצא' });
    }

    res.json(building);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create building
router.post('/', (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'שם המבנה הוא שדה חובה' });
    }

    const result = db.prepare(`
      INSERT INTO buildings (name)
      VALUES (?)
    `).run(name);

    const newBuilding = db.prepare('SELECT * FROM buildings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newBuilding);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update building
router.put('/:id', (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'שם המבנה הוא שדה חובה' });
    }

    const result = db.prepare(`
      UPDATE buildings SET name = ? WHERE id = ?
    `).run(name, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'מבנה לא נמצא' });
    }

    const updatedBuilding = db.prepare('SELECT * FROM buildings WHERE id = ?').get(req.params.id);
    res.json(updatedBuilding);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete building
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM buildings WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'מבנה לא נמצא' });
    }

    res.json({ message: 'המבנה נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
