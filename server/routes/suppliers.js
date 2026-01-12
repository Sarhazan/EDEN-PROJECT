const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');
const { addMonths, format } = require('date-fns');

// Get all suppliers
router.get('/', (req, res) => {
  try {
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single supplier
router.get('/:id', (req, res) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

    if (!supplier) {
      return res.status(404).json({ error: 'ספק לא נמצא' });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create supplier
router.post('/', (req, res) => {
  try {
    const { name, phone, email, payment_frequency, next_payment_date, payment_amount } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'שם הספק הוא שדה חובה' });
    }

    const result = db.prepare(`
      INSERT INTO suppliers (name, phone, email, payment_frequency, next_payment_date, payment_amount, is_paid)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(name, phone, email, payment_frequency, next_payment_date, payment_amount || 0);

    const newSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newSupplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update supplier
router.put('/:id', (req, res) => {
  try {
    const { name, phone, email, payment_frequency, next_payment_date, payment_amount } = req.body;

    const result = db.prepare(`
      UPDATE suppliers
      SET name = ?, phone = ?, email = ?, payment_frequency = ?, next_payment_date = ?, payment_amount = ?
      WHERE id = ?
    `).run(name, phone, email, payment_frequency, next_payment_date, payment_amount, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'ספק לא נמצא' });
    }

    const updatedSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    res.json(updatedSupplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as paid (and generate next payment date)
router.put('/:id/pay', (req, res) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

    if (!supplier) {
      return res.status(404).json({ error: 'ספק לא נמצא' });
    }

    let nextDate = null;

    // If recurring payment, calculate next date
    if (supplier.payment_frequency !== 'one-time' && supplier.next_payment_date) {
      const currentDate = new Date(supplier.next_payment_date);

      switch (supplier.payment_frequency) {
        case 'monthly':
          nextDate = addMonths(currentDate, 1);
          break;
        case 'quarterly':
          nextDate = addMonths(currentDate, 3);
          break;
        case 'semi-annual':
          nextDate = addMonths(currentDate, 6);
          break;
        case 'annual':
          nextDate = addMonths(currentDate, 12);
          break;
      }

      nextDate = format(nextDate, 'yyyy-MM-dd');
    }

    // Update supplier
    if (supplier.payment_frequency === 'one-time') {
      // One-time payment: mark as paid, no next date
      db.prepare(`
        UPDATE suppliers
        SET is_paid = 1, next_payment_date = NULL
        WHERE id = ?
      `).run(req.params.id);
    } else {
      // Recurring payment: update to next date, keep is_paid as 0
      db.prepare(`
        UPDATE suppliers
        SET is_paid = 0, next_payment_date = ?
        WHERE id = ?
      `).run(nextDate, req.params.id);
    }

    const updatedSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    res.json(updatedSupplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete supplier
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'ספק לא נמצא' });
    }

    res.json({ message: 'הספק נמחק בהצלחה' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
