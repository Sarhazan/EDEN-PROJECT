const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../database/schema');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'units');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeBase}`);
  }
});

const upload = multer({ storage });

// Compute status from inspection_date and alert_days
function computeStatus(inspectionDate, alertDays) {
  if (!inspectionDate) return 'ok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inspection = new Date(inspectionDate);
  inspection.setHours(0, 0, 0, 0);
  const diffMs = inspection - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= (alertDays || 30)) return 'needs_inspection';
  return 'ok';
}

// GET /api/units?system_id=X — return units with computed status field
router.get('/', (req, res) => {
  try {
    const systemId = req.query.system_id;
    let units;
    if (systemId) {
      units = db.prepare(`
        SELECT u.*,
          s.name AS supplier_name,
          b.name AS building_name,
          sys.name AS system_name
        FROM units u
        LEFT JOIN suppliers s ON u.supplier_id = s.id
        LEFT JOIN buildings b ON u.building_id = b.id
        LEFT JOIN systems sys ON u.system_id = sys.id
        WHERE u.system_id = ?
        ORDER BY u.created_at DESC
      `).all(systemId);
    } else {
      units = db.prepare(`
        SELECT u.*,
          s.name AS supplier_name,
          b.name AS building_name,
          sys.name AS system_name
        FROM units u
        LEFT JOIN suppliers s ON u.supplier_id = s.id
        LEFT JOIN buildings b ON u.building_id = b.id
        LEFT JOIN systems sys ON u.system_id = sys.id
        ORDER BY u.created_at DESC
      `).all();
    }

    // Attach files and compute status
    const fileStmt = db.prepare('SELECT * FROM unit_files WHERE unit_id = ? ORDER BY created_at DESC');
    const result = units.map(unit => ({
      ...unit,
      status: computeStatus(unit.inspection_date, unit.alert_days),
      files: fileStmt.all(unit.id)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/units/needs-attention — units where status=overdue or needs_inspection
router.get('/needs-attention', (req, res) => {
  try {
    const units = db.prepare(`
      SELECT u.*,
        s.name AS supplier_name,
        b.name AS building_name,
        sys.name AS system_name
      FROM units u
      LEFT JOIN suppliers s ON u.supplier_id = s.id
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN systems sys ON u.system_id = sys.id
      WHERE u.inspection_date IS NOT NULL
      ORDER BY u.inspection_date ASC
    `).all();

    const result = units
      .map(unit => ({
        ...unit,
        status: computeStatus(unit.inspection_date, unit.alert_days)
      }))
      .filter(unit => unit.status === 'overdue' || unit.status === 'needs_inspection');

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/units — create
router.post('/', (req, res) => {
  try {
    const { name, system_id, inspection_date, alert_days, notes, supplier_id, building_id, serial_number } = req.body;

    if (!name || !system_id) {
      return res.status(400).json({ error: 'שם ומערכת הם שדות חובה' });
    }

    const result = db.prepare(`
      INSERT INTO units (name, system_id, inspection_date, alert_days, notes, supplier_id, building_id, serial_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, system_id, inspection_date || null, alert_days || 30, notes || null, supplier_id || null, building_id || null, serial_number || null);

    const newUnit = db.prepare(`
      SELECT u.*,
        s.name AS supplier_name,
        b.name AS building_name,
        sys.name AS system_name
      FROM units u
      LEFT JOIN suppliers s ON u.supplier_id = s.id
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN systems sys ON u.system_id = sys.id
      WHERE u.id = ?
    `).get(result.lastInsertRowid);

    newUnit.status = computeStatus(newUnit.inspection_date, newUnit.alert_days);
    newUnit.files = [];

    res.status(201).json(newUnit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/units/:id — update
router.put('/:id', (req, res) => {
  try {
    const { name, inspection_date, alert_days, notes, supplier_id, building_id, serial_number } = req.body;

    const result = db.prepare(`
      UPDATE units
      SET name = ?, inspection_date = ?, alert_days = ?, notes = ?, supplier_id = ?, building_id = ?, serial_number = ?
      WHERE id = ?
    `).run(name, inspection_date || null, alert_days || 30, notes || null, supplier_id || null, building_id || null, serial_number || null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'יחידה לא נמצאה' });
    }

    const updated = db.prepare(`
      SELECT u.*,
        s.name AS supplier_name,
        b.name AS building_name,
        sys.name AS system_name
      FROM units u
      LEFT JOIN suppliers s ON u.supplier_id = s.id
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN systems sys ON u.system_id = sys.id
      WHERE u.id = ?
    `).get(req.params.id);

    updated.status = computeStatus(updated.inspection_date, updated.alert_days);
    updated.files = db.prepare('SELECT * FROM unit_files WHERE unit_id = ? ORDER BY created_at DESC').all(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/units/:id — delete + delete files from disk
router.delete('/:id', (req, res) => {
  try {
    // Get files to delete from disk
    const files = db.prepare('SELECT * FROM unit_files WHERE unit_id = ?').all(req.params.id);

    const result = db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'יחידה לא נמצאה' });
    }

    // Delete files from disk
    for (const file of files) {
      const absolute = path.join(__dirname, '..', '..', file.file_path.replace(/^\//, ''));
      if (fs.existsSync(absolute)) {
        try { fs.unlinkSync(absolute); } catch (e) { /* best effort */ }
      }
    }

    res.json({ message: 'היחידה נמחקה בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/units/:id/files — upload file
router.post('/:id/files', upload.single('file'), (req, res) => {
  try {
    const unitId = Number(req.params.id);
    if (!unitId) return res.status(400).json({ error: 'id לא תקין' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

    const unit = db.prepare('SELECT id FROM units WHERE id = ?').get(unitId);
    if (!unit) return res.status(404).json({ error: 'יחידה לא נמצאה' });

    const filename = (req.body.filename || '').trim() || req.file.originalname;
    const relativePath = `/uploads/units/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO unit_files (unit_id, filename, file_path, original_name)
      VALUES (?, ?, ?, ?)
    `).run(unitId, filename, relativePath, req.file.originalname);

    res.status(201).json({
      id: result.lastInsertRowid,
      unit_id: unitId,
      filename,
      file_path: relativePath,
      original_name: req.file.originalname,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/units/:id/files/:fileId — delete file from DB + disk
router.delete('/:id/files/:fileId', (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM unit_files WHERE id = ? AND unit_id = ?').get(req.params.fileId, req.params.id);
    if (!file) return res.status(404).json({ error: 'קובץ לא נמצא' });

    db.prepare('DELETE FROM unit_files WHERE id = ?').run(req.params.fileId);

    // Delete from disk
    const absolute = path.join(__dirname, '..', '..', file.file_path.replace(/^\//, ''));
    if (fs.existsSync(absolute)) {
      try { fs.unlinkSync(absolute); } catch (e) { /* best effort */ }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
