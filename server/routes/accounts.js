const express = require('express');
const router = express.Router();
const translationService = require('../services/translation');
const { db } = require('../database/schema');

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

    res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error setting value:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
