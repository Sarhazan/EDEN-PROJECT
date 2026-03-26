/**
 * Rich demo seed — simulates a real full workday with 4 employees
 * Run: node server/database/seed-rich.js
 */
const path = require('path');
process.chdir(path.join(__dirname, '..', '..'));

const Database = require('better-sqlite3');
const { addDays, addMonths, addWeeks, format, subDays } = require('date-fns');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'maintenance.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

const today     = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const twoDaysAgo= format(subDays(new Date(), 2), 'yyyy-MM-dd');
const tomorrow  = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const in2Days   = format(addDays(new Date(), 2), 'yyyy-MM-dd');
const in3Days   = format(addDays(new Date(), 3), 'yyyy-MM-dd');
const in5Days   = format(addDays(new Date(), 5), 'yyyy-MM-dd');
const nextWeek  = format(addWeeks(new Date(), 1), 'yyyy-MM-dd');
const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

// ─── CLEAR ───────────────────────────────────────────────────────────────────
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'settings'`).all().map(r => r.name);
db.exec('BEGIN');
for (const t of tables) db.exec(`DELETE FROM ${t}`);
try { db.exec(`DELETE FROM sqlite_sequence`); } catch(e){}
db.exec('COMMIT');

// ─── LANGUAGES ───────────────────────────────────────────────────────────────
for (const [code, name] of [['he','Hebrew'],['en','English'],['ru','Russian'],['ar','Arabic'],['hi','Hindi']]) {
  db.prepare(`INSERT OR IGNORE INTO languages (code, name) VALUES (?, ?)`).run(code, name);
}

// ─── SYSTEMS ─────────────────────────────────────────────────────────────────
const sys = db.prepare(`INSERT INTO systems (name, description, contact_person, phone, email) VALUES (?, ?, ?, ?, ?)`);
sys.run('ניקיון', 'שירותי ניקיון יומיים לכל מבנה', 'ענת שירות', '03-1234500', 'clean@property.co.il');
sys.run('מיזוג אוויר', 'תחזוקת מערכות מיזוג', 'משה כהן', '050-1234567', 'ac@property.co.il');
sys.run('חשמל', 'מערכות חשמל ותאורה', 'שרה אברהם', '054-9876543', 'electric@property.co.il');
sys.run('אינסטלציה', 'מערכות אינסטלציה ושירותים', 'דוד לוי', '052-7654321', 'plumb@property.co.il');
sys.run('מעליות', 'תחזוקת מעליות', 'יוסי הנדלמן', '03-9876543', 'elev@property.co.il');
sys.run('אבטחה', 'מצלמות ומנעולים', 'אבי שומר', '050-9998887', 'sec@property.co.il');
sys.run('כיבוי אש', 'גלאים וספרינקלרים', 'משה אש', '052-5554443', 'fire@property.co.il');
sys.run('גינון', 'תחזוקת גינה ושטחים ירוקים', 'רחל גרין', '054-1112223', 'garden@property.co.il');
// IDs: 1=ניקיון, 2=מיזוג, 3=חשמל, 4=אינסטלציה, 5=מעליות, 6=אבטחה, 7=כיבוי אש, 8=גינון

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────
const emp = db.prepare(`INSERT INTO employees (name, phone, position, language) VALUES (?, ?, ?, ?)`);
emp.run('אדם לוי',    '050-1111111', 'עובד ניקיון',       'he'); // 1 — manager's worker shown in image
emp.run('נואה כץ',   '052-2222222', 'עובד ניקיון',       'he'); // 2
emp.run('אליהו ביטון','054-3333333', 'טכנאי תחזוקה',      'he'); // 3
emp.run('מירה שלום', '050-4444444', 'עובדת ניקיון',      'he'); // 4
emp.run('ז׳ורז׳ פטרוב','052-5555555', 'טכנאי חשמל',        'ru'); // 5
emp.run('ענת כהן',   '054-6666666', 'מנקה ראשית',        'he'); // 6 — manager

// ─── BUILDINGS ───────────────────────────────────────────────────────────────
const bld = db.prepare(`INSERT INTO buildings (name) VALUES (?)`);
bld.run('מגדל הרצל 27');  // 1
bld.run('בית הים 4');     // 2
bld.run('קניון הצפון');   // 3

// ─── TENANTS ─────────────────────────────────────────────────────────────────
const ten = db.prepare(`INSERT INTO tenants (name, phone, email, apartment_number, floor, building_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
ten.run('עדן קנדי',     '0539441903', 'eden@test.com',   '2',  '1', 1, 'דיירת בדיקות');
ten.run('נועה כהן',     '0501111111', 'noa@test.com',    '12', '3', 1, 'מעדיפה ווצאפ');
ten.run('אמיר חדד',     '0538899002', 'amir@test.com',   '23', '6', 1, 'רגיש לרעש בוקר');
ten.run('שירה דגן',     '0526773210', 'shira@test.com',  '8',  '2', 1, 'מבקשת תיעוד');
ten.run('יואב לוי',     '0502222222', 'yoav@test.com',   '21', '7', 2, 'תיאום מראש');
ten.run('רוני מזרחי',   '0523004455', 'roni@test.com',   '5',  '1', 2, 'חדש, קוד 4505');
ten.run('ליאת פרץ',     '0546677881', 'liat@test.com',   '18', '4', 2, 'משמרות, אחרי 16');
ten.run('גיא נבון',     '0509094433', 'guy@test.com',    '14', '5', 3, 'ווצאפ בלבד');
ten.run('דנה אביב',     '0501234567', 'dana@test.com',   '33', '8', 3, 'פנסיונרית');
ten.run('BorisIvanov',  '0529876543', 'boris@test.com',  '6',  '2', 3, 'דובר רוסית בלבד');

// ─── LOCATIONS ───────────────────────────────────────────────────────────────
const loc = db.prepare(`INSERT INTO locations (name) VALUES (?)`);
loc.run('לובי ראשי');         // 1
loc.run('קומות 1-5');         // 2
loc.run('קומות 6-13');        // 3
loc.run('גג המבנה');          // 4
loc.run('חניון מפלס -1 אזור A'); // 5
loc.run('חניון מפלס -1 אזור B'); // 6
loc.run('חדרי מדרגות');       // 7
loc.run('גינה קדמית');        // 8
loc.run('חדר מכונות');        // 9

// ─── SUPPLIERS ───────────────────────────────────────────────────────────────
const sup = db.prepare(`INSERT INTO suppliers (name, phone, email, payment_frequency, next_payment_date, payment_amount, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?)`);
sup.run('ניקיון הצפון בע"מ', '03-1234567', 'clean@north.co.il', 'monthly', nextMonth, 8500, 0);
sup.run('חברת המיזוג', '050-2345678', 'ac@cool.co.il', 'quarterly', format(addMonths(new Date(),3),'yyyy-MM-dd'), 12000, 0);
sup.run('חשמל ישראל', '1-800-000-001', 'billing@electric.co.il', 'monthly', nextMonth, 5200, 0);
sup.run('מעליות ישראל', '03-9876543', 'service@elevators.co.il', 'quarterly', format(addMonths(new Date(),3),'yyyy-MM-dd'), 9000, 1);
sup.run('אבטחה 24/7', '03-5556667', 'sec@247.co.il', 'monthly', nextMonth, 6800, 0);

// ─── TASKS helper ────────────────────────────────────────────────────────────
const insTask = db.prepare(`
  INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring, completion_note, approval_requested_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const t = (title, desc, sysId, empId, freq, date, time, prio, status, recur, note='', approvalAt=null) =>
  insTask.run(title, desc, sysId, empId, freq, date, time, prio, status, recur ? 1 : 0, note, approvalAt);

// ════════════════════════════════════════════════════════════════════════════
// TODAY — אדם (עובד 1) — יום עבודה מלא
// ════════════════════════════════════════════════════════════════════════════
// 07:00 - ניקיון קומות 1-5 (recurring)
t('ניקיון קומה -1', 'ניקיון מפלס חניון תחתון, פינוי פסולת', 1, 1, 'daily', today, '07:00', 'normal', 'sent', true);
t('ניקיון לובי ראשי', 'ניקיון לובי, ליטוש רצפה, ניקוי כניסה', 1, 1, 'daily', today, '07:30', 'normal', 'sent', true);
t('ניקיון קומות 1-5 — מעברים', 'ניקוי מעברים וחדרי מדרגות קומות 1-5', 1, 1, 'daily', today, '08:00', 'normal', 'draft', true);
t('מעליות — בדיקה יומית', 'בדיקת תקינות מעליות 1 ו-2, ניקוי תא', 5, 1, 'daily', today, '08:30', 'urgent', 'draft', true);
t('סריקה היקפית + החלפת פחי אשפה', 'סיבוב בכל קומות הבניין, החלפת שקיות', 1, 1, 'daily', today, '09:00', 'normal', 'draft', true);
t('ניקיון קומות 6-13 — גלריה', 'ניקוי מעברים ומרפסות קומות 6-13', 1, 1, 'daily', today, '10:15', 'normal', 'draft', true);
t('הפסקת אוכל', 'הפסקה מוסדרת', null, 1, 'daily', today, '12:00', 'optional', 'draft', true);
t('ניקיון קומות 6-13 — חדרי שירות', 'ניקוי חדרי שרת ושירות בקומות 6-13', 1, 1, 'daily', today, '12:30', 'normal', 'draft', true);
t('ניקיון הדרים משותפים', 'ניקוי חדרי ישיבות ומשרדים משותפים', 1, 1, 'daily', today, '14:00', 'normal', 'draft', true);
t('ניקיון מעברי חניון', 'ניקוי מעברים בחניון, הסרת כתמי שמן', 1, 1, 'daily', today, '14:00', 'normal', 'draft', true);
t('ניקיון חניון מפלס -1 אזור A', 'שטיפת רצפת חניון אזור A', 1, 1, 'daily', today, '15:00', 'normal', 'draft', true);
t('ניקיון חניון מפלס -1 אזור B', 'שטיפת רצפת חניון אזור B', 1, 1, 'daily', today, '16:00', 'normal', 'draft', true);

// TODAY — נואה (עובד 2) — יום עבודה מלא
t('ניקיון קומה -1 B', 'ניקיון מפלס חניון — צד B', 1, 2, 'daily', today, '07:00', 'normal', 'sent', true);
t('ניקיון שירותים קומה 1-3', 'ניקוי וחיטוי שירותים, מילוי מוצרים', 1, 2, 'daily', today, '08:00', 'normal', 'sent', true);
t('השקיה גינה קדמית', 'בדיקת ממטרות + השקיה ידנית', 8, 2, 'daily', today, '09:00', 'normal', 'draft', true);
t('ניקיון שירותים קומות 4-8', 'ניקוי חיטוי שירותים קומות 4-8', 1, 2, 'daily', today, '10:00', 'normal', 'draft', true);
t('הפסקת אוכל', 'הפסקה מוסדרת', null, 2, 'daily', today, '12:00', 'optional', 'draft', true);
t('ניקיון שירותים קומות 9-13', 'ניקוי חיטוי שירותים קומות 9-13', 1, 2, 'daily', today, '13:00', 'normal', 'draft', true);
t('ניקיון חדר כביסה', 'ניקוי מכונות כביסה ורצפה', 1, 2, 'daily', today, '14:30', 'optional', 'draft', true);
t('ריסוס חרקים — מרתף', 'ריסוס תחתי מרתף ותעלות', 1, 2, 'one-time', today, '15:30', 'normal', 'draft', false);

// TODAY — אליהו (עובד 3, טכנאי)
t('בדיקת מיזוג קומות 1-5', 'בדיקת פילטרים, טמפרטורה, ניקוי', 2, 3, 'weekly', today, '08:00', 'urgent', 'draft', true);
t('החלפת נורות קומה 6-8', 'החלפת נורות לד שרופות', 3, 3, 'one-time', today, '09:30', 'normal', 'draft', false);
t('בדיקת לוח חשמל ראשי', 'בדיקה חזותית + בדיקת מתח', 3, 3, 'monthly', today, '10:30', 'urgent', 'draft', true);
t('תיקון ברז דולף שירותי קומה 4', 'תיקון ברז דולף — דחוף, תלונת דייר', 4, 3, 'one-time', today, '11:30', 'urgent', 'draft', false);
t('הפסקת אוכל', 'הפסקה', null, 3, 'daily', today, '13:00', 'optional', 'draft', true);
t('בדיקת מיזוג קומות 6-13', 'בדיקת פילטרים, טמפרטורה', 2, 3, 'weekly', today, '14:00', 'urgent', 'draft', true);
t('בדיקת גנרטור', 'הרצת גנרטור 15 דקות, רישום תוצאות', 3, 3, 'monthly', today, '15:30', 'urgent', 'draft', true);

// TODAY — מירה (עובד 4, ניקיון)
t('ניקיון משרדי הנהלה', 'ניקיון יסודי, אבק, ריצוף, חלונות', 1, 4, 'daily', today, '07:30', 'normal', 'draft', true);
t('ניקיון חדרי ישיבות', 'ניקוי שולחנות, לוחות, כיסאות', 1, 4, 'daily', today, '09:00', 'normal', 'draft', true);
t('ניקיון מטבחון קומה 5', 'שטיפת כלים, ניקוי מיקרוגל, אזור קפה', 1, 4, 'daily', today, '10:30', 'normal', 'draft', true);
t('הפסקת אוכל', 'הפסקה', null, 4, 'daily', today, '12:30', 'optional', 'draft', true);
t('ניקיון לובי + כניסה', 'ניקוי לובי אחה"צ', 1, 4, 'daily', today, '13:30', 'normal', 'draft', true);
t('ניקיון מדרגות חירום', 'כל קומות — ניקוי מדרגות חירום', 1, 4, 'daily', today, '14:30', 'normal', 'draft', true);
t('בדיקת מצלמות + ניגוב עדשות', 'ניגוב עדשות מצלמות אבטחה', 6, 4, 'weekly', today, '16:00', 'normal', 'draft', true);

// ════════════════════════════════════════════════════════════════════════════
// PENDING APPROVAL — tasks from yesterday that workers completed
// ════════════════════════════════════════════════════════════════════════════
const approvalAt = new Date().toISOString();
t('ניקיון קומות 1-5 — מעברים', 'בוצע ניקוי מלא', 1, 1, 'daily', yesterday, '08:00', 'normal', 'pending_approval', true, 'הכל נקי, החלפתי גם את מטרייה בכניסה', approvalAt);
t('בדיקת מיזוג קומות 1-5', 'בדיקה בוצעה', 2, 3, 'weekly', yesterday, '08:00', 'urgent', 'pending_approval', true, 'פילטרים הוחלפו בקומות 3 ו-5, שאר תקין', approvalAt);
t('תיקון ברז דולף שירותי קומה 2', 'תיקון בוצע', 4, 3, 'one-time', yesterday, '11:00', 'urgent', 'pending_approval', false, 'הוחלף הגומי, לחץ תקין', approvalAt);

// ════════════════════════════════════════════════════════════════════════════
// HISTORY — completed tasks (yesterday + 2 days ago)
// ════════════════════════════════════════════════════════════════════════════
const completedAt = new Date(new Date().setHours(17, 0, 0, 0) - 86400000).toISOString();
for (const [title, emp, time] of [
  ['ניקיון לובי ראשי', 1, '07:30'],
  ['מעליות — בדיקה יומית', 1, '08:30'],
  ['ניקיון שירותים קומה 1-3', 2, '08:00'],
  ['השקיה גינה קדמית', 2, '09:00'],
  ['החלפת נורות קומה 3', 3, '09:30'],
  ['ניקיון משרדי הנהלה', 4, '07:30'],
  ['ניקיון חדרי ישיבות', 4, '09:00'],
]) {
  insTask.run(title, 'בוצע בהצלחה', 1, emp, 'daily', yesterday, time, 'normal', 'completed', 1, '', null);
}

// 2 days ago
for (const [title, emp, time] of [
  ['ניקיון לובי ראשי', 1, '07:30'],
  ['ניקיון קומות 1-5 — מעברים', 1, '08:00'],
  ['ניקיון שירותים קומה 1-3', 2, '08:00'],
  ['בדיקת מיזוג קומות 1-5', 3, '08:00'],
  ['ניקיון משרדי הנהלה', 4, '07:30'],
]) {
  insTask.run(title, 'בוצע', 1, emp, 'daily', twoDaysAgo, time, 'normal', 'completed', 1, '', null);
}

// NOT_COMPLETED (carried over)
t('בדיקת גנרטור — נדחה', 'נדחה בגלל תקלה בדלת חדר מכונות', 3, 3, 'one-time', yesterday, '15:30', 'urgent', 'not_completed', false);
t('ריסוס חרקים — קומה B', 'נדחה — מחכה לאישור חומרים', 1, 2, 'one-time', yesterday, '15:30', 'normal', 'not_completed', false);

// ════════════════════════════════════════════════════════════════════════════
// TOMORROW tasks
// ════════════════════════════════════════════════════════════════════════════
t('ניקיון קומה -1', 'ניקיון מפלס חניון', 1, 1, 'daily', tomorrow, '07:00', 'normal', 'draft', true);
t('ניקיון לובי ראשי', 'ניקיון לובי', 1, 1, 'daily', tomorrow, '07:30', 'normal', 'draft', true);
t('בדיקת מיזוג קומות 1-5', 'בדיקה שבועית', 2, 3, 'weekly', tomorrow, '08:00', 'urgent', 'draft', true);
t('ניקיון שירותים קומה 1-3', 'ניקוי שירותים', 1, 2, 'daily', tomorrow, '08:00', 'normal', 'draft', true);
t('גיזום גינה קדמית', 'גיזום עצים חודשי', 8, 2, 'monthly', tomorrow, '09:00', 'normal', 'draft', true);
t('בדיקת מצלמות', 'בדיקת מצלמות שבועית', 6, 4, 'weekly', tomorrow, '10:00', 'normal', 'draft', true);
t('בדיקת כיבוי אש', 'בדיקת ספרינקלרים חודשית', 7, 3, 'monthly', tomorrow, '11:00', 'urgent', 'draft', true);

// Future
t('תחזוקת מעליות — טכנאי חיצוני', 'תחזוקה חצי שנתית', 5, 3, 'semi-annual', in3Days, '08:00', 'urgent', 'draft', true);
t('ניקיון גג', 'פינוי פסולת מגג', 1, 2, 'one-time', in2Days, '09:00', 'normal', 'draft', false);
t('בדיקת מערכת אזעקה', 'בדיקה חודשית', 6, 3, 'monthly', in5Days, '14:00', 'normal', 'draft', true);
t('טיפול בדשא', 'כיסוח דשא', 8, 2, 'biweekly', in3Days, '07:00', 'optional', 'draft', true);
t('בדיקת חימום מים', 'בדיקת דוד חשמלי', 4, 3, 'monthly', nextWeek, '13:00', 'normal', 'draft', true);

// ─── UNITS (needing attention) ───────────────────────────────────────────────
// inspection_date = past date → status will be computed as overdue/needs_inspection
try {
  const unitInsert = db.prepare(`
    INSERT INTO units (name, system_id, inspection_date, alert_days, recurring_enabled, recurring_frequency, recurring_interval, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // inspection_date = last done. next = last + interval months → overdue/needs_inspection
  // recurring_interval=1 means 1 month for monthly frequency
  unitInsert.run('מעלית 1',           5, format(subDays(new Date(), 35), 'yyyy-MM-dd'), 7,  1, 'monthly', 1, 'בדיקה חודשית חובה');
  unitInsert.run('גנרטור ראשי',       3, format(subDays(new Date(), 35), 'yyyy-MM-dd'), 14, 1, 'monthly', 1, 'בדיקה עם הרצה');
  unitInsert.run('לוח חשמל ראשי B2',  3, format(subDays(new Date(), 20), 'yyyy-MM-dd'), 30, 1, 'monthly', 1, 'חשמלאי מוסמך בלבד');
  unitInsert.run('מיכל דלק גנרטור',  3, format(subDays(new Date(), 35), 'yyyy-MM-dd'), 7,  1, 'monthly', 1, 'בדיקת רמת דלק');
  unitInsert.run('מד עשן קומה 8',     7, format(subDays(new Date(), 200), 'yyyy-MM-dd'), 10, 1, 'semi-annual', 1, 'החלפת סוללות');
} catch(e) {
  console.warn('Units insert issue:', e.message);
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run('site_name', 'מתחם הרצל 27');
db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run('manager_employee_id', '6');
db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run('hide_builtin_forms_after_clear', '0');

db.pragma('foreign_keys = ON');
console.log('✅ Rich demo seed completed successfully!');
console.log('   4 employees, 3 buildings, 10 tenants, full workday tasks, history, pending approvals, units');
