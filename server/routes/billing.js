const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

function normalizeTenantChargeStatuses(tenantId = null) {
  const sql = `
    UPDATE charges
    SET status = CASE
      WHEN paid_amount >= amount THEN 'paid'
      WHEN due_date < DATE('now') AND paid_amount < amount THEN 'overdue'
      WHEN paid_amount > 0 AND paid_amount < amount THEN 'partial'
      ELSE 'open'
    END,
    updated_at = CURRENT_TIMESTAMP
    ${tenantId ? 'WHERE tenant_id = ?' : ''}
  `;

  if (tenantId) {
    db.prepare(sql).run(tenantId);
  } else {
    db.prepare(sql).run();
  }
}

function getTenantScore(tenantId) {
  const row = db.prepare(`
    SELECT
      COUNT(c.id) AS total_charges,
      SUM(CASE WHEN c.status = 'overdue' THEN 1 ELSE 0 END) AS overdue_count,
      SUM(CASE WHEN c.status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
      SUM(c.amount) AS total_amount,
      SUM(c.paid_amount) AS total_paid
    FROM charges c
    WHERE c.tenant_id = ?
  `).get(tenantId);

  const totalCharges = Number(row?.total_charges || 0);
  if (totalCharges === 0) {
    return { score: 75, risk_level: 'normal' };
  }

  const overdueRatio = Number(row?.overdue_count || 0) / totalCharges;
  const paidRatio = Number(row?.paid_count || 0) / totalCharges;

  let score = 100;
  score -= Math.round(overdueRatio * 50);
  score += Math.round(paidRatio * 10);

  score = Math.max(0, Math.min(100, score));

  let riskLevel = 'normal';
  if (score < 40) riskLevel = 'high';
  else if (score < 70) riskLevel = 'medium';

  return { score, risk_level: riskLevel };
}

function upsertTenantCreditProfile(tenantId) {
  const { score, risk_level } = getTenantScore(tenantId);

  db.prepare(`
    INSERT INTO tenant_credit_profile (tenant_id, score, risk_level, last_calculated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(tenant_id) DO UPDATE SET
      score = excluded.score,
      risk_level = excluded.risk_level,
      last_calculated_at = CURRENT_TIMESTAMP
  `).run(tenantId, score, risk_level);

  return { score, risk_level };
}

router.get('/dashboard', (req, res) => {
  try {
    normalizeTenantChargeStatuses();

    const kpi = db.prepare(`
      SELECT
        COUNT(*) AS total_charges,
        SUM(amount) AS total_billed,
        SUM(paid_amount) AS total_paid,
        SUM(amount - paid_amount) AS total_open,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue_charges
      FROM charges
    `).get();

    const overdueTenants = db.prepare(`
      SELECT
        t.id,
        t.name,
        t.phone,
        t.apartment_number,
        t.floor,
        b.name AS building_name,
        SUM(c.amount - c.paid_amount) AS open_balance,
        COUNT(c.id) AS overdue_items
      FROM charges c
      JOIN tenants t ON t.id = c.tenant_id
      LEFT JOIN buildings b ON b.id = t.building_id
      WHERE c.status = 'overdue'
      GROUP BY t.id
      ORDER BY open_balance DESC
    `).all();

    const recentPayments = db.prepare(`
      SELECT p.*, t.name AS tenant_name
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
      ORDER BY p.paid_at DESC
      LIMIT 10
    `).all();

    res.json({
      kpi: {
        total_charges: Number(kpi?.total_charges || 0),
        total_billed: Number(kpi?.total_billed || 0),
        total_paid: Number(kpi?.total_paid || 0),
        total_open: Number(kpi?.total_open || 0),
        overdue_charges: Number(kpi?.overdue_charges || 0)
      },
      overdue_tenants: overdueTenants,
      recent_payments: recentPayments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tenant-summaries', (req, res) => {
  try {
    normalizeTenantChargeStatuses();

    const tenants = db.prepare(`
      SELECT t.id
      FROM tenants t
      ORDER BY t.id ASC
    `).all();

    for (const tenant of tenants) {
      upsertTenantCreditProfile(tenant.id);
    }

    const summaries = db.prepare(`
      SELECT
        t.id,
        t.name,
        t.phone,
        b.name AS building_name,
        COALESCE(SUM(CASE WHEN c.status != 'paid' THEN c.amount - c.paid_amount ELSE 0 END), 0) AS open_balance,
        COALESCE(SUM(CASE WHEN c.status = 'overdue' THEN 1 ELSE 0 END), 0) AS overdue_items,
        COALESCE(p.score, 75) AS credit_score,
        COALESCE(p.risk_level, 'normal') AS risk_level
      FROM tenants t
      LEFT JOIN buildings b ON b.id = t.building_id
      LEFT JOIN charges c ON c.tenant_id = t.id
      LEFT JOIN tenant_credit_profile p ON p.tenant_id = t.id
      GROUP BY t.id
      ORDER BY open_balance DESC, t.name ASC
    `).all();

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tenants/:tenantId', (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    normalizeTenantChargeStatuses(tenantId);

    const tenant = db.prepare(`
      SELECT t.*, b.name AS building_name
      FROM tenants t
      LEFT JOIN buildings b ON b.id = t.building_id
      WHERE t.id = ?
    `).get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'דייר לא נמצא' });
    }

    const charges = db.prepare(`
      SELECT * FROM charges
      WHERE tenant_id = ?
      ORDER BY due_date DESC
    `).all(tenantId);

    const payments = db.prepare(`
      SELECT * FROM payments
      WHERE tenant_id = ?
      ORDER BY paid_at DESC
    `).all(tenantId);

    const profile = upsertTenantCreditProfile(tenantId);

    const openBalance = charges.reduce((sum, c) => sum + (Number(c.amount) - Number(c.paid_amount)), 0);

    res.json({
      tenant,
      profile,
      open_balance: openBalance,
      charges,
      payments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/charges', (req, res) => {
  try {
    const { tenant_id, amount, due_date, period, notes } = req.body;

    if (!tenant_id || !amount || !due_date) {
      return res.status(400).json({ error: 'tenant_id, amount, due_date הם שדות חובה' });
    }

    const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenant_id);
    if (!tenant) {
      return res.status(400).json({ error: 'דייר לא קיים' });
    }

    const initialStatus = new Date(due_date) < new Date() ? 'overdue' : 'open';

    const result = db.prepare(`
      INSERT INTO charges (tenant_id, amount, paid_amount, due_date, period, notes, status)
      VALUES (?, ?, 0, ?, ?, ?, ?)
    `).run(tenant_id, amount, due_date, period || null, notes || null, initialStatus);

    const charge = db.prepare('SELECT * FROM charges WHERE id = ?').get(result.lastInsertRowid);
    upsertTenantCreditProfile(Number(tenant_id));

    res.status(201).json(charge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payments', (req, res) => {
  try {
    const { tenant_id, charge_id, amount, paid_at, method, reference, notes } = req.body;

    if (!tenant_id || !amount) {
      return res.status(400).json({ error: 'tenant_id ו-amount הם שדות חובה' });
    }

    const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenant_id);
    if (!tenant) {
      return res.status(400).json({ error: 'דייר לא קיים' });
    }

    const paidAt = paid_at || new Date().toISOString();

    const tx = db.transaction(() => {
      const paymentResult = db.prepare(`
        INSERT INTO payments (tenant_id, charge_id, amount, paid_at, method, reference, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tenant_id, charge_id || null, amount, paidAt, method || null, reference || null, notes || null);

      if (charge_id) {
        const charge = db.prepare('SELECT * FROM charges WHERE id = ?').get(charge_id);
        if (!charge) {
          throw new Error('חיוב לא נמצא');
        }
        if (Number(charge.tenant_id) !== Number(tenant_id)) {
          throw new Error('החיוב אינו שייך לדייר המבוקש');
        }

        const newPaidAmount = Number(charge.paid_amount) + Number(amount);
        const totalAmount = Number(charge.amount);

        let status = 'partial';
        if (newPaidAmount <= 0) status = 'open';
        else if (newPaidAmount >= totalAmount) status = 'paid';

        db.prepare(`
          UPDATE charges
          SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newPaidAmount, status, charge_id);
      }

      // Update overdue/open automatically by due date for all non-paid charges
      db.prepare(`
        UPDATE charges
        SET status = CASE
          WHEN paid_amount >= amount THEN 'paid'
          WHEN due_date < DATE('now') AND paid_amount < amount THEN 'overdue'
          WHEN paid_amount > 0 AND paid_amount < amount THEN 'partial'
          ELSE 'open'
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ?
      `).run(tenant_id);

      return paymentResult.lastInsertRowid;
    });

    const paymentId = tx();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    upsertTenantCreditProfile(Number(tenant_id));

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tenants/:tenantId/request-payment', (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'דייר לא נמצא' });
    }

    const balance = db.prepare(`
      SELECT SUM(amount - paid_amount) AS open_balance
      FROM charges
      WHERE tenant_id = ? AND status != 'paid'
    `).get(tenantId);

    const openBalance = Number(balance?.open_balance || 0);

    const message = `שלום ${tenant.name},\nתזכורת לתשלום יתרה פתוחה בסך ${openBalance.toFixed(2)} ₪.\nנשמח להסדיר את התשלום בהקדם. תודה.`;

    res.json({
      tenant_id: tenantId,
      phone: tenant.phone,
      message,
      open_balance: openBalance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
