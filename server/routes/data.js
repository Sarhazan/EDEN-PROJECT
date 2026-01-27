const express = require('express');
const router = express.Router();
const { seedDatabase, clearDatabase } = require('../database/seed');

// Middleware to block dangerous operations in production
const blockInProduction = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
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

module.exports = router;
