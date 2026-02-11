const express = require('express');
const router = express.Router();
const { db } = require('../database/schema');

// Get dispatch targets (employees/managers + distribution lists)
router.get('/dispatch/targets', (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT id, name, phone, position, language
      FROM employees
      ORDER BY name ASC
    `).all();

    const lists = db.prepare(`
      SELECT l.id, l.name, COUNT(m.employee_id) AS members_count
      FROM distribution_lists l
      LEFT JOIN distribution_list_members m ON m.list_id = l.id
      GROUP BY l.id, l.name
      ORDER BY l.name ASC
    `).all();

    res.json({
      total: employees.length,
      employees,
      lists
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distribution Lists - list all
router.get('/lists', (req, res) => {
  try {
    const lists = db.prepare(`
      SELECT l.id, l.name, l.created_at, COUNT(m.employee_id) AS members_count
      FROM distribution_lists l
      LEFT JOIN distribution_list_members m ON m.list_id = l.id
      GROUP BY l.id, l.name, l.created_at
      ORDER BY l.name ASC
    `).all();

    const listDetails = lists.map((list) => {
      const members = db.prepare(`
        SELECT e.id, e.name
        FROM distribution_list_members m
        INNER JOIN employees e ON e.id = m.employee_id
        WHERE m.list_id = ?
        ORDER BY e.name ASC
      `).all(list.id);

      return { ...list, members };
    });

    res.json({ lists: listDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distribution Lists - create/update members
router.post('/lists', (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'שם רשימה הוא שדה חובה' });
    }

    const insert = db.prepare(`INSERT INTO distribution_lists (name) VALUES (?)`);
    const result = insert.run(name.trim());
    const listId = result.lastInsertRowid;

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const insertMember = db.prepare(`
        INSERT OR IGNORE INTO distribution_list_members (list_id, employee_id)
        VALUES (?, ?)
      `);

      const tx = db.transaction((ids) => {
        ids.forEach((id) => insertMember.run(listId, Number(id)));
      });
      tx(memberIds);
    }

    res.status(201).json({ success: true, listId });
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'שם הרשימה כבר קיים' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Distribution Lists - replace members
router.put('/lists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, memberIds = [] } = req.body;

    const existing = db.prepare(`SELECT id FROM distribution_lists WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: 'רשימה לא נמצאה' });

    if (name && name.trim()) {
      db.prepare(`UPDATE distribution_lists SET name = ? WHERE id = ?`).run(name.trim(), id);
    }

    const clearMembers = db.prepare(`DELETE FROM distribution_list_members WHERE list_id = ?`);
    const insertMember = db.prepare(`
      INSERT OR IGNORE INTO distribution_list_members (list_id, employee_id)
      VALUES (?, ?)
    `);

    const tx = db.transaction(() => {
      clearMembers.run(id);
      memberIds.forEach((memberId) => insertMember.run(id, Number(memberId)));
    });
    tx();

    res.json({ success: true });
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'שם הרשימה כבר קיים' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Distribution Lists - delete
router.delete('/lists/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare(`DELETE FROM distribution_lists WHERE id = ?`).run(id);
    if (result.changes === 0) return res.status(404).json({ error: 'רשימה לא נמצאה' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk dispatch tasks from HQ
router.post('/dispatch', (req, res) => {
  try {
    const {
      title,
      description,
      start_date,
      start_time,
      priority = 'normal',
      targetMode = 'all', // all | specific | list
      managerIds = [],
      listId = null
    } = req.body;

    if (!title || !start_date || !start_time) {
      return res.status(400).json({ error: 'שדות חובה חסרים (כותרת, תאריך, שעה)' });
    }

    let targets = [];

    if (targetMode === 'all') {
      targets = db.prepare(`SELECT id, name FROM employees ORDER BY name ASC`).all();
    } else if (targetMode === 'specific') {
      if (!Array.isArray(managerIds) || managerIds.length === 0) {
        return res.status(400).json({ error: 'נא לבחור לפחות מנהל אחד' });
      }

      const placeholders = managerIds.map(() => '?').join(',');
      targets = db.prepare(`
        SELECT id, name
        FROM employees
        WHERE id IN (${placeholders})
        ORDER BY name ASC
      `).all(...managerIds.map(Number));
    } else if (targetMode === 'list') {
      if (!listId) {
        return res.status(400).json({ error: 'נא לבחור רשימת תפוצה' });
      }

      targets = db.prepare(`
        SELECT e.id, e.name
        FROM distribution_list_members m
        INNER JOIN employees e ON e.id = m.employee_id
        WHERE m.list_id = ?
        ORDER BY e.name ASC
      `).all(Number(listId));
    } else {
      return res.status(400).json({ error: 'targetMode לא חוקי' });
    }

    if (targets.length === 0) {
      return res.status(400).json({ error: 'לא נמצאו מנהלים לשליחה' });
    }

    const insertTask = db.prepare(`
      INSERT INTO tasks (
        title, description, employee_id, start_date, start_time,
        priority, status, sent_at, is_recurring, estimated_duration_minutes
      )
      VALUES (?, ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP, 0, 30)
    `);

    const transaction = db.transaction(() => {
      const created = [];
      for (const target of targets) {
        const result = insertTask.run(
          title,
          description || null,
          target.id,
          start_date,
          start_time,
          priority
        );

        created.push({
          taskId: result.lastInsertRowid,
          employeeId: target.id,
          employeeName: target.name
        });
      }
      return created;
    });

    const createdTasks = transaction();

    res.status(201).json({
      success: true,
      summary: {
        targetMode,
        requestedTargets:
          targetMode === 'all'
            ? 'all'
            : targetMode === 'specific'
              ? managerIds.length
              : `list:${listId}`,
        actualTargets: targets.length,
        createdTasks: createdTasks.length,
        failed: 0
      },
      createdTasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
