const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'location-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('רק קבצי תמונה מותרים (JPEG, PNG, GIF, WEBP)'));
    }
  }
});

// Upload image endpoint
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'לא הועלה קובץ' });
    }

    // Return the URL to the uploaded file
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all locations
router.get('/', (req, res) => {
  try {
    const locations = db.prepare('SELECT * FROM locations ORDER BY name ASC').all();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single location
router.get('/:id', (req, res) => {
  try {
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);

    if (!location) {
      return res.status(404).json({ error: 'מיקום לא נמצא' });
    }

    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create location
router.post('/', (req, res) => {
  try {
    const { name, image, latitude, longitude } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'שם המיקום הוא שדה חובה' });
    }

    const result = db.prepare(`
      INSERT INTO locations (name, image, latitude, longitude)
      VALUES (?, ?, ?, ?)
    `).run(name, image || null, latitude || null, longitude || null);

    const newLocation = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update location
router.put('/:id', (req, res) => {
  try {
    const { name, image, latitude, longitude } = req.body;

    const result = db.prepare(`
      UPDATE locations
      SET name = ?, image = ?, latitude = ?, longitude = ?
      WHERE id = ?
    `).run(name, image || null, latitude || null, longitude || null, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'מיקום לא נמצא' });
    }

    const updatedLocation = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
    res.json(updatedLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete location
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'מיקום לא נמצא' });
    }

    res.json({ message: 'המיקום נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
