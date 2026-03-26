const express = require('express');
const router = express.Router();
const translationService = require('../services/translation');
const { db } = require('../database/schema');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Company logo upload storage
const companyLogoDir = path.join(__dirname, '..', '..', 'uploads', 'company');
if (!fs.existsSync(companyLogoDir)) fs.mkdirSync(companyLogoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, companyLogoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo${ext}`);
  }
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
    cb(null, true);
  }
});

/**
 * Accounts/Settings Routes
 * Manages external service integrations (Google Translate, Gmail, etc.)
 */

// GET /api/accounts/status - Get status of all connected accounts
router.get('/status', (req, res) => {
  try {
    const stats = translationService.getProviderStats();

    // Get stored API key status from database (masked)
    const settings = db.prepare(`
      SELECT key, value FROM settings WHERE key IN ('google_translate_api_key')
    `).all();

    const settingsMap = {};
    settings.forEach(s => {
      // Mask API keys for security (show only last 4 chars)
      if (s.value && s.value.length > 4) {
        settingsMap[s.key] = '****' + s.value.slice(-4);
      } else {
        settingsMap[s.key] = s.value ? '****' : null;
      }
    });

    res.json({
      googleTranslate: {
        connected: stats.googleTranslateAvailable,
        apiKeyConfigured: !!settingsMap.google_translate_api_key,
        apiKeyMasked: settingsMap.google_translate_api_key,
        usage: stats.googleTranslate
      },
      gemini: {
        connected: stats.geminiAvailable,
        usage: stats.gemini
      },
      totalTranslations: stats.totalTranslations
    });
  } catch (error) {
    console.error('Error getting accounts status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/accounts/google-translate/connect - Set Google Translate API Key
router.post('/google-translate/connect', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'API Key is required' });
    }

    // Test the API key first
    translationService.setGoogleTranslateApiKey(apiKey.trim());
    const testResult = await translationService.testGoogleTranslate();

    if (!testResult.success) {
      // Revert if test failed
      translationService.setGoogleTranslateApiKey(null);
      return res.status(400).json({
        error: 'API Key validation failed',
        details: testResult.error
      });
    }

    // Save to database for persistence
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('google_translate_api_key', ?, datetime('now'))
    `).run(apiKey.trim());

    console.log('✓ Google Translate API Key saved and validated');

    res.json({
      success: true,
      message: 'Google Translate connected successfully',
      testTranslation: testResult.testResult
    });
  } catch (error) {
    console.error('Error connecting Google Translate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/accounts/google-translate/disconnect - Remove Google Translate API Key
router.post('/google-translate/disconnect', (req, res) => {
  try {
    // Remove from service
    translationService.setGoogleTranslateApiKey(null);

    // Remove from database
    db.prepare(`DELETE FROM settings WHERE key = 'google_translate_api_key'`).run();

    console.log('✓ Google Translate disconnected');

    res.json({ success: true, message: 'Google Translate disconnected' });
  } catch (error) {
    console.error('Error disconnecting Google Translate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/accounts/google-translate/test - Test current connection
router.post('/google-translate/test', async (req, res) => {
  try {
    const testResult = await translationService.testGoogleTranslate();
    res.json(testResult);
  } catch (error) {
    console.error('Error testing Google Translate:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/accounts/gemini/test - Test Gemini translation directly (debug)
router.get('/gemini/test', async (req, res) => {
  try {
    const result = await translationService.testGemini();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// General Settings Routes
// ============================================

// GET /api/accounts/settings/:key - Get a specific setting
router.get('/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const setting = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    res.json({ key, value: setting?.value || null });
  } catch (error) {
    console.error('Error getting setting:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/accounts/settings/:key - Set a specific setting
router.put('/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(key, value);

    // If workday end time changes, reset today's auto-close marker so scheduler can re-evaluate.
    if (key === 'workday_end_time') {
      db.prepare(`DELETE FROM settings WHERE key = 'task_autoclose_last_run_date'`).run();

      // Try immediate re-check so user sees effect without waiting for next minute tick.
      try {
        const { checkAndRunAutoClose } = require('../services/taskAutoClose');
        checkAndRunAutoClose(new Date());
      } catch (e) {
        console.warn('[Accounts] Immediate task auto-close check failed:', e?.message || e);
      }
    }

    if (key === 'workday_start_time' || key === 'auto_send_workday_time') {
      db.prepare(`DELETE FROM settings WHERE key = 'daily_schedule_last_run_date'`).run();
    }

    res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error setting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/accounts/company/logo — upload company logo
router.post('/company/logo', logoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const logoPath = `/uploads/company/${req.file.filename}`;
    db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('company_logo_path', ?, datetime('now'))`).run(logoPath);
    res.json({ success: true, path: logoPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/company/logo — remove company logo
router.delete('/company/logo', (req, res) => {
  try {
    const setting = db.prepare(`SELECT value FROM settings WHERE key = 'company_logo_path'`).get();
    if (setting?.value) {
      const abs = path.join(__dirname, '..', '..', setting.value.replace(/^\//, ''));
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
    db.prepare(`DELETE FROM settings WHERE key = 'company_logo_path'`).run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/company — get all company settings at once
router.get('/company', (req, res) => {
  try {
    const keys = ['company_name', 'company_email', 'company_phone', 'company_logo_path'];
    const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`).all(...keys);
    const result = {};
    rows.forEach(r => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
