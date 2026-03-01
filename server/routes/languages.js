const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// GET /api/languages - return all available languages
router.get('/', (req, res) => {
  try {
    const languages = db.prepare(`SELECT code, name, is_default FROM languages ORDER BY is_default DESC, name ASC`).all();
    res.json(languages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/languages - add a new custom language
router.post('/', (req, res) => {
  try {
    let { code, name } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'יש לספק קוד שפה ושם שפה' });
    }

    code = code.trim().toLowerCase();
    name = name.trim();

    if (code.length > 10) {
      return res.status(400).json({ error: 'קוד השפה ארוך מדי (מקסימום 10 תווים)' });
    }

    if (!/^[a-z]{2,10}$/.test(code)) {
      return res.status(400).json({ error: 'קוד השפה חייב להכיל רק אותיות לועזיות (לדוגמה: hi, fil, de)' });
    }

    // Check uniqueness
    const existing = db.prepare(`SELECT code FROM languages WHERE code = ?`).get(code);
    if (existing) {
      return res.status(409).json({ error: `שפה עם קוד "${code}" כבר קיימת ברשימה` });
    }

    db.prepare(`INSERT INTO languages (code, name, is_default) VALUES (?, ?, 0)`).run(code, name);
    const newLang = db.prepare(`SELECT code, name, is_default FROM languages WHERE code = ?`).get(code);
    res.status(201).json(newLang);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
