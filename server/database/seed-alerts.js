/**
 * seed-alerts.js — מוסיף נתוני דמה להתראות
 * משימות לאישור + מערכות (units) שדורשות טיפול
 * הרץ: node server/database/seed-alerts.js
 */
const path = require('path');
const Database = require(path.join(__dirname, '..', '..', 'node_modules', 'better-sqlite3'));

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'maintenance.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

const today = new Date().toISOString().slice(0, 10);
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ─── 1. pending_approval tasks ───────────────────────────────────────────────
// מוצא משימות קיימות ומעדכן חלק ל-pending_approval
const existingTasks = db.prepare("SELECT id, title FROM tasks WHERE status IN ('sent','received','draft') LIMIT 10").all();

if (existingTasks.length >= 5) {
  const toApprove = existingTasks.slice(0, 5);
  const notes = [
    'ביצעתי את הבדיקה, הכל תקין',
    'טופל ומחכה לאישורך',
    'בוצע בהצלחה, יש תמונות',
    'הושלם, נא לאשר',
    'טיפלתי בבעיה, ממתין לאישור'
  ];
  toApprove.forEach((t, i) => {
    db.prepare(`UPDATE tasks SET status='pending_approval', completion_note=? WHERE id=?`)
      .run(notes[i], t.id);
  });
  console.log(`✅ עודכנו ${toApprove.length} משימות ל-pending_approval`);
} else {
  // אם אין מספיק משימות קיימות — יוצר חדשות
  const empId = db.prepare("SELECT id FROM employees LIMIT 1").get()?.id || null;
  const pendingData = [
    { title: 'בדיקת מערכת כיבוי אש — קומה 3', note: 'ביצעתי את הבדיקה, הכל תקין' },
    { title: 'ניקוי מאגר מים גג', note: 'טופל ומחכה לאישורך' },
    { title: 'תיקון דלת כניסה ראשית', note: 'הוחלף הגלגלת, עובד' },
    { title: 'בדיקת מערכת אינטרקום', note: 'הוחלפו 3 יחידות תקולות' },
    { title: 'ריסוס מניעתי חצר', note: 'בוצע בהצלחה' },
  ];
  pendingData.forEach(p => {
    db.prepare(`
      INSERT INTO tasks (title, description, start_date, frequency, is_recurring, status, priority, completion_note, employee_id, created_at, updated_at)
      VALUES (?, ?, ?, 'one-time', 0, 'pending_approval', 'normal', ?, ?, datetime('now'), datetime('now'))
    `).run(p.title, '', today, p.note, empId);
  });
  console.log(`✅ נוצרו 5 משימות pending_approval`);
}

// ─── 2. Units (מערכות) שדורשות טיפול ─────────────────────────────────────────
// מחק units קיימות ריקות ויצור חדשות עם תאריכי בדיקה ישנים
db.prepare("DELETE FROM units").run();

const systems = db.prepare("SELECT id FROM systems LIMIT 8").all();
const getSystemId = (i) => systems[i % systems.length]?.id || 1;

const unitsData = [
  { name: 'מעלית 1 — כניסה ראשית',    sysIdx: 0, daysAgo: 45, alertDays: 30, freq: 'monthly',    note: 'בדיקה חודשית נדרשת' },
  { name: 'מעלית 2 — כניסה צדדית',    sysIdx: 0, daysAgo: 38, alertDays: 30, freq: 'monthly',    note: 'רעש חריג נשמע' },
  { name: 'גנראטור גיבוי',             sysIdx: 1, daysAgo: 95, alertDays: 60, freq: 'monthly',    note: 'בדיקת שמן ומצבר' },
  { name: 'מערכת ספרינקלרים קומה 1',   sysIdx: 2, daysAgo: 20, alertDays: 14, freq: 'monthly',    note: 'בדיקת לחץ נדרשת' },
  { name: 'מצלמות אבטחה — חניון',      sysIdx: 3, daysAgo: 200,alertDays: 90, freq: 'semi-annual',note: 'ניקוי עדשות וכיוון' },
  { name: 'מד גז — מרתף',              sysIdx: 4, daysAgo: 40, alertDays: 30, freq: 'monthly',    note: 'בדיקת תקינות' },
  { name: 'משאבת מים — גג',            sysIdx: 1, daysAgo: 35, alertDays: 30, freq: 'monthly',    note: 'רמת שמן נמוכה' },
  { name: 'לוח חשמל ראשי',             sysIdx: 1, daysAgo: 180,alertDays: 90, freq: 'semi-annual',note: 'בדיקת חיבורים' },
];

const insUnit = db.prepare(`
  INSERT INTO units (name, system_id, inspection_date, alert_days, recurring_enabled, recurring_frequency, recurring_interval, notes, created_at)
  VALUES (?, ?, ?, ?, 1, ?, 1, ?, datetime('now'))
`);

unitsData.forEach(u => {
  insUnit.run(
    u.name,
    getSystemId(u.sysIdx),
    dateOffset(-u.daysAgo),
    u.alertDays,
    u.freq,
    u.note
  );
});
console.log(`✅ נוצרו ${unitsData.length} units שדורשות טיפול`);

// ─── 3. not_completed tasks ────────────────────────────────────────────────────
const notCompleted = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='not_completed'").get();
if (notCompleted.c < 3) {
  const empId = db.prepare("SELECT id FROM employees LIMIT 1").get()?.id || null;
  const lateData = [
    'ניקוי מסנני מיזוג — לא בוצע',
    'בדיקת גדר חשמלית',
    'החלפת נורות חדר מדרגות',
  ];
  lateData.forEach(title => {
    db.prepare(`
      INSERT INTO tasks (title, start_date, start_time, frequency, is_recurring, status, priority, employee_id, created_at, updated_at)
      VALUES (?, ?, '', 'one-time', 0, 'not_completed', 'urgent', ?, datetime('now'), datetime('now'))
    `).run(title, dateOffset(-2), empId);
  });
  console.log(`✅ נוצרו 3 משימות not_completed`);
}

// ─── סיכום ──────────────────────────────────────────────────────────────────
const counts = {
  pending: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='pending_approval'").get().c,
  notCompleted: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='not_completed'").get().c,
  units: db.prepare("SELECT COUNT(*) as c FROM units").get().c,
  unitsOverdue: db.prepare(`
    SELECT COUNT(*) as c FROM units
    WHERE inspection_date IS NOT NULL
      AND date(inspection_date, '+' || (recurring_interval * CASE recurring_frequency WHEN 'monthly' THEN 30 WHEN 'semi-annual' THEN 180 WHEN 'annual' THEN 365 ELSE 30 END || ' days')) < date('now', '-' || alert_days || ' days')
  `).get().c,
};

db.pragma('foreign_keys = ON');
db.close();

console.log('\n── סיכום ──────────────────────');
console.log(`  ⏳ pending_approval:  ${counts.pending}`);
console.log(`  ❌ not_completed:      ${counts.notCompleted}`);
console.log(`  🔧 units סה"כ:         ${counts.units}`);
console.log('────────────────────────────────');
