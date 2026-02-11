const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../database/schema');

const router = express.Router();

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads', 'forms');
const logoDir = path.join(uploadsRoot, 'logos');
const contractsDir = path.join(uploadsRoot, 'contracts');

[uploadsRoot, logoDir, contractsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mode = req.query.mode || req.body.mode;
    cb(null, mode === 'logo' ? logoDir : contractsDir);
  },
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeBase}`);
  }
});

const upload = multer({ storage });

// HQ: view forms assets by building
router.get('/hq/buildings-assets', (req, res) => {
  try {
    const buildings = db.prepare('SELECT id, name FROM buildings ORDER BY name ASC').all();

    const rows = buildings.map((b) => {
      const branding = db.prepare('SELECT logo_path FROM building_branding WHERE building_id = ?').get(b.id);
      const contracts = db.prepare(`
        SELECT id, title, file_path, created_at
        FROM building_contracts
        WHERE building_id = ?
        ORDER BY created_at DESC
      `).all(b.id);

      return {
        buildingId: b.id,
        buildingName: b.name,
        logoPath: branding?.logo_path || null,
        contracts
      };
    });

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: upload/replace building logo
router.post('/hq/buildings/:buildingId/logo', upload.single('file'), (req, res) => {
  try {
    const buildingId = Number(req.params.buildingId);
    if (!buildingId) return res.status(400).json({ error: 'buildingId לא תקין' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ לוגו' });

    const relativePath = `/uploads/forms/logos/${req.file.filename}`;

    db.prepare(`
      INSERT INTO building_branding (building_id, logo_path, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(building_id) DO UPDATE SET logo_path = excluded.logo_path, updated_at = CURRENT_TIMESTAMP
    `).run(buildingId, relativePath);

    res.json({ success: true, logoPath: relativePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: upload contract file for a building
router.post('/hq/buildings/:buildingId/contracts', upload.single('file'), (req, res) => {
  try {
    const buildingId = Number(req.params.buildingId);
    const title = (req.body.title || '').trim();

    if (!buildingId) return res.status(400).json({ error: 'buildingId לא תקין' });
    if (!title) return res.status(400).json({ error: 'כותרת חוזה היא שדה חובה' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ חוזה' });

    const relativePath = `/uploads/forms/contracts/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO building_contracts (building_id, title, file_path)
      VALUES (?, ?, ?)
    `).run(buildingId, title, relativePath);

    res.status(201).json({ success: true, contractId: result.lastInsertRowid, filePath: relativePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: delete contract
router.delete('/hq/contracts/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM building_contracts WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'חוזה לא נמצא' });

    db.prepare('DELETE FROM building_contracts WHERE id = ?').run(id);

    // Best-effort file cleanup
    if (row.file_path) {
      const absolute = path.join(__dirname, '..', '..', row.file_path.replace(/^\//, ''));
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: interactive form templates
router.get('/site/templates', (req, res) => {
  res.json({
    templates: [
      { key: 'regulation_signature', label: 'טופס חתימה על תקנון' },
      { key: 'credit_card', label: 'טופס למילוי כרטיס אשראי' },
      { key: 'debt_payment', label: 'טופס לתשלום חוב' },
      { key: 'notice', label: 'טופס הודעה' }
    ]
  });
});

// Site manager: send interactive form
router.post('/site/send', (req, res) => {
  try {
    const {
      templateKey,
      recipientType, // supplier | tenant
      recipientName,
      recipientContact,
      title,
      message,
      amount
    } = req.body;

    if (!templateKey) return res.status(400).json({ error: 'סוג טופס הוא שדה חובה' });
    if (!recipientType) return res.status(400).json({ error: 'סוג נמען הוא שדה חובה' });
    if (!recipientName || !recipientName.trim()) return res.status(400).json({ error: 'שם נמען הוא שדה חובה' });

    const payload = JSON.stringify({ title: title || '', message: message || '', amount: amount || null });

    const result = db.prepare(`
      INSERT INTO form_dispatches (template_key, recipient_type, recipient_name, recipient_contact, payload_json, status)
      VALUES (?, ?, ?, ?, ?, 'sent')
    `).run(templateKey, recipientType, recipientName.trim(), (recipientContact || '').trim(), payload);

    const id = result.lastInsertRowid;

    res.status(201).json({
      success: true,
      dispatchId: id,
      formUrl: `/forms/fill/${id}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: sent forms history
router.get('/site/dispatches', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, template_key, recipient_type, recipient_name, recipient_contact, status, created_at
      FROM form_dispatches
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
