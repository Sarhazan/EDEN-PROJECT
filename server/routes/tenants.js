const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get all tenants (optionally filter by building)
router.get('/', (req, res) => {
  try {
    const { buildingId } = req.query;

    let query = `
      SELECT t.*, b.name AS building_name
      FROM tenants t
      LEFT JOIN buildings b ON b.id = t.building_id
    `;
    const params = [];

    if (buildingId) {
      query += ' WHERE t.building_id = ?';
      params.push(buildingId);
    }

    query += ' ORDER BY b.name ASC, CAST(t.floor AS INTEGER) ASC, CAST(t.apartment_number AS INTEGER) ASC, t.name ASC';

    const tenants = db.prepare(query).all(...params);
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tenant
router.get('/:id', (req, res) => {
  try {
    const tenant = db.prepare(`
      SELECT t.*, b.name AS building_name
      FROM tenants t
      LEFT JOIN buildings b ON b.id = t.building_id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!tenant) {
      return res.status(404).json({ error: 'דייר לא נמצא' });
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tenant
router.post('/', (req, res) => {
  try {
    const { name, phone, email, apartment_number, floor, building_id, notes } = req.body;

    if (!name || !building_id || !apartment_number || floor === undefined || floor === null || floor === '') {
      return res.status(400).json({ error: 'שם, מבנה, מספר דירה וקומה הם שדות חובה' });
    }

    const building = db.prepare('SELECT id FROM buildings WHERE id = ?').get(building_id);
    if (!building) {
      return res.status(400).json({ error: 'המבנה שנבחר לא קיים' });
    }

    const result = db.prepare(`
      INSERT INTO tenants (name, phone, email, apartment_number, floor, building_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      phone || null,
      email || null,
      String(apartment_number).trim(),
      String(floor).trim(),
      building_id,
      notes || null
    );

    const newTenant = db.prepare(`
      SELECT t.*, b.name AS building_name
      FROM tenants t
      LEFT JOIN buildings b ON b.id = t.building_id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newTenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tenant
router.put('/:id', (req, res) => {
  try {
    const { name, phone, email, apartment_number, floor, building_id, notes } = req.body;

    if (!name || !building_id || !apartment_number || floor === undefined || floor === null || floor === '') {
      return res.status(400).json({ error: 'שם, מבנה, מספר דירה וקומה הם שדות חובה' });
    }

    const building = db.prepare('SELECT id FROM buildings WHERE id = ?').get(building_id);
    if (!building) {
      return res.status(400).json({ error: 'המבנה שנבחר לא קיים' });
    }

    const result = db.prepare(`
      UPDATE tenants
      SET name = ?, phone = ?, email = ?, apartment_number = ?, floor = ?, building_id = ?, notes = ?
      WHERE id = ?
    `).run(
      name.trim(),
      phone || null,
      email || null,
      String(apartment_number).trim(),
      String(floor).trim(),
      building_id,
      notes || null,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'דייר לא נמצא' });
    }

    const updatedTenant = db.prepare(`
      SELECT t.*, b.name AS building_name
      FROM tenants t
      LEFT JOIN buildings b ON b.id = t.building_id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json(updatedTenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tenant
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'דייר לא נמצא' });
    }

    res.json({ message: 'הדייר נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
