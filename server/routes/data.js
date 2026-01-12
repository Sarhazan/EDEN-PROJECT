const express = require('express');
const router = express.Router();
const { seedDatabase, clearDatabase } = require('../database/seed');

// Seed database with sample data
router.post('/seed', (req, res) => {
  try {
    seedDatabase();
    res.json({ message: 'נתוני דמה נטענו בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data
router.delete('/clear', (req, res) => {
  try {
    clearDatabase();
    res.json({ message: 'כל הנתונים נמחקו בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
