const express = require('express');
const router = express.Router();
const { seedDatabase, clearDatabase } = require('../database/seed');

// Middleware to block dangerous operations in production
// Allows operations if ALLOW_DEMO_SEED=true (for test environments like EDEN-TEST)
const blockInProduction = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';

  if (isProduction && !allowDemoSeed) {
    return res.status(403).json({
      error: 'פעולה זו מושבתת בסביבת הפרודקשן',
      message: 'Data management operations are disabled in production environment'
    });
  }
  next();
};

// Seed database with sample data
router.post('/seed', blockInProduction, (req, res) => {
  try {
    seedDatabase();
    res.json({ message: 'נתוני דמה נטענו בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data
router.delete('/clear', blockInProduction, (req, res) => {
  try {
    clearDatabase();
    res.json({ message: 'כל הנתונים נמחקו בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger task autoclose for a specific date (test/dev only)
router.post('/trigger-autoclose', blockInProduction, (req, res) => {
  try {
    const { autoCloseOpenTasksForDate } = require('../services/taskAutoClose');
    const { db } = require('../database/schema');
    // Reset the last-run flag so it can be triggered again today
    db.prepare(`DELETE FROM settings WHERE key = 'task_autoclose_last_run_date'`).run();
    const date = req.body.date || new Date().toISOString().slice(0, 10);
    const changed = autoCloseOpenTasksForDate(date);
    res.json({ ok: true, date, changed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
