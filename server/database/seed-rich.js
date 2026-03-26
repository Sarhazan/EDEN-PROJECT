/**
 * seed-rich.js — Rich demo seed for EDEN maintenance system
 * Run: node server/database/seed-rich.js
 */
'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'maintenance.db');
const db = new Database(dbPath);

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
const today      = dateOffset(0);
const yesterday  = dateOffset(-1);
const twoDaysAgo = dateOffset(-2);
const threeDaysAgo = dateOffset(-3);
const tomorrow   = dateOffset(1);
const in2Days    = dateOffset(2);
const in3Days    = dateOffset(3);
const in5Days    = dateOffset(5);
const in7Days    = dateOffset(7);
const in14Days   = dateOffset(14);
const in30Days   = dateOffset(30);

const nowISO = new Date().toISOString();

// ─── CLEAR ALL DATA ───────────────────────────────────────────────────────────
console.log('🧹 מוחק נתונים קיימים...');
db.pragma('foreign_keys = OFF');

const tablesToClear = [
  'form_delivery_logs','form_submissions','form_dispatches',
  'building_contracts','building_branding',
  'distribution_list_members','distribution_lists',
  'payment_reminders','tenant_credit_profile','payments','charges',
  'task_attachments','task_confirmations',
  'unit_files','units',
  'tasks',
  'tenants','suppliers','locations',
  'employees','buildings','systems','languages',
  'custom_form_templates','form_template_metadata','interactive_form_templates',
  'settings',
];

db.exec('BEGIN');
for (const t of tablesToClear) {
  try { db.exec(`DELETE FROM "${t}"`); } catch(e) { /* table may not exist */ }
}
try { db.exec(`DELETE FROM sqlite_sequence`); } catch(e) {}
db.exec('COMMIT');

// ─── LANGUAGES ────────────────────────────────────────────────────────────────
db.exec(`
  INSERT OR IGNORE INTO languages (code, name) VALUES ('he','Hebrew');
  INSERT OR IGNORE INTO languages (code, name) VALUES ('en','English');
  INSERT OR IGNORE INTO languages (code, name) VALUES ('ru','Russian');
  INSERT OR IGNORE INTO languages (code, name) VALUES ('ar','Arabic');
`);

// ─── BUILDINGS ────────────────────────────────────────────────────────────────
console.log('🏢 מכניס מבנים...');
const insBuilding = db.prepare(`INSERT INTO buildings (name) VALUES (?)`);
insBuilding.run('מגדל הרצל 27');   // id=1
insBuilding.run('בית הים 4');      // id=2
insBuilding.run('מרכז הצפון');     // id=3

// ─── SYSTEMS ──────────────────────────────────────────────────────────────────
console.log('⚙️ מכניס מערכות...');
const insSys = db.prepare(`INSERT INTO systems (name, description, contact_person, phone, email) VALUES (?,?,?,?,?)`);
insSys.run('מעלית',    'מערכות מעליות ואמצעי גישה', 'יוסי הנדלמן',  '03-9876543',  'elev@property.co.il');     // 1
insSys.run('חשמל',     'מערכות חשמל ותאורה',          'שרה אברהם',    '054-9876543', 'electric@property.co.il'); // 2
insSys.run('אינסטלציה','מערכות אינסטלציה ומים',       'דוד לוי',      '052-7654321', 'plumb@property.co.il');    // 3
insSys.run('גינון',    'תחזוקת גינה ושטחים ירוקים',  'רחל גרין',     '054-1112223', 'garden@property.co.il');   // 4
insSys.run('אבטחה',    'מצלמות, מנעולים, סריקת כניסה','אבי שומר',    '050-9998887', 'sec@property.co.il');      // 5
insSys.run('כיבוי אש','גלאי עשן, ספרינקלרים, כיבוי', 'משה אש',      '052-5554443', 'fire@property.co.il');     // 6
insSys.run('ניקיון',   'שירותי ניקיון יומיים',        'ענת שירות',    '03-1234500',  'clean@property.co.il');    // 7
insSys.run('מיזוג',    'תחזוקת מערכות מיזוג אוויר',  'משה כהן',      '050-1234567', 'ac@property.co.il');       // 8

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
console.log('👷 מכניס עובדים...');
const insEmp = db.prepare(`INSERT INTO employees (name, phone, position, language) VALUES (?,?,?,?)`);
insEmp.run('יונתן בן-דוד', '050-1111111', 'מנהל תחזוקה',   'he');  // 1 — manager
insEmp.run('נועה פרץ',     '052-2222222', 'עובדת ניקיון',  'he');  // 2
insEmp.run('אליהו ביטון',  '054-3333333', 'טכנאי תחזוקה',  'he');  // 3
insEmp.run('מרים שלום',    '050-4444444', 'עובדת ניקיון',  'he');  // 4

// ─── TENANTS ──────────────────────────────────────────────────────────────────
console.log('🏠 מכניס דיירים...');
const insTen = db.prepare(`INSERT INTO tenants (name, phone, email, apartment_number, floor, building_id, notes) VALUES (?,?,?,?,?,?,?)`);
// Building 1 — מגדל הרצל 27 (7 tenants)
insTen.run('רונית כהן',     '0501234567', 'ronit@mail.co.il',  '1A', '1', 1, 'ממשפחה ותיקה');
insTen.run('גיא נבון',      '0509094433', 'guy@mail.co.il',    '2B', '2', 1, 'ווצאפ בלבד');
insTen.run('שירה דגן',      '0526773210', 'shira@mail.co.il',  '3C', '3', 1, 'מבקשת תיעוד בכל פעולה');
insTen.run('אמיר חדד',      '0538899002', 'amir@mail.co.il',   '4A', '4', 1, 'רגיש לרעש בבוקר');
insTen.run('יעל מזרחי',     '0523004455', 'yael@mail.co.il',   '5B', '5', 1, 'קוד כניסה 1234');
insTen.run('ניר לוי',       '0502222222', 'nir@mail.co.il',    '6A', '6', 1, 'תיאום מראש בלבד');
insTen.run('ענת שפירא',     '0546677881', 'anat@mail.co.il',   '7C', '7', 1, 'משמרות, אחרי 16:00');
// Building 2 — בית הים 4 (5 tenants)
insTen.run('דנה אביב',      '0501234000', 'dana@mail.co.il',   '1',  '1', 2, 'פנסיונרית, בבית כל היום');
insTen.run('יואב ברק',      '0522200000', 'yoav@mail.co.il',   '5',  '2', 2, 'תיאום מראש');
insTen.run('מיכל שמש',      '0544400000', 'michal@mail.co.il', '9',  '3', 2, 'אחראית קומה');
insTen.run('רן קדמי',       '0506600000', 'ran@mail.co.il',    '12', '4', 2, 'חדש, קוד 4505');
insTen.run('לילה טל',       '0528800000', 'lila@mail.co.il',   '15', '5', 2, 'דוברת ערבית ועברית');
// Building 3 — מרכז הצפון (4 tenants)
insTen.run('בוריס איבנוב',  '0529876543', 'boris@mail.co.il',  '3',  '1', 3, 'דובר רוסית, עברית בסיסית');
insTen.run('פאדי ג\'אבר',   '0531122334', 'fadi@mail.co.il',   '7',  '2', 3, 'בעל עסק בקניון');
insTen.run('חנה ויס',       '0543344556', 'hana@mail.co.il',   '11', '3', 3, 'מעדיפה שיחות טלפון');
insTen.run('אלון שמיר',     '0557788990', 'alon@mail.co.il',   '14', '4', 3, 'בעל מפתח חדר מכונות');

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
console.log('🔧 מכניס ספקים...');
const insSup = db.prepare(`INSERT INTO suppliers (name, phone, email, payment_frequency, next_payment_date, payment_amount, is_paid) VALUES (?,?,?,?,?,?,?)`);
insSup.run('חשמל ישראל בע"מ',       '1-800-000-001', 'billing@electric.co.il', 'monthly',     in30Days, 5200,  0);
insSup.run('אינסטלציה מהירה',        '03-1234567',    'plumb@fast.co.il',        'monthly',     in30Days, 3800,  0);
insSup.run('מעליות ישראל',           '03-9876543',    'service@elevators.co.il', 'quarterly',   in30Days, 9000,  1);
insSup.run('ניקיון הצפון בע"מ',      '03-9991234',    'clean@north.co.il',       'monthly',     in30Days, 8500,  0);
insSup.run('אבטחה 24/7',             '03-5556667',    'sec@247.co.il',           'monthly',     in30Days, 6800,  0);
insSup.run('כיבוי אש ראשי',          '03-7771112',    'fire@main.co.il',         'semi-annual', in30Days, 4200,  1);
insSup.run('גינון ירוק',             '054-9990001',   'garden@green.co.il',      'monthly',     in30Days, 2900,  0);
insSup.run('חברת המיזוג',            '050-2345678',   'ac@cool.co.il',           'quarterly',   in30Days, 12000, 0);
insSup.run('אנרגיה סולארית',         '077-1234567',   'solar@energy.co.il',      'annual',      in30Days, 18000, 1);

// ─── LOCATIONS ────────────────────────────────────────────────────────────────
const insLoc = db.prepare(`INSERT INTO locations (name) VALUES (?)`);
insLoc.run('לובי ראשי');
insLoc.run('חניון מפלס -1');
insLoc.run('קומות 1-5');
insLoc.run('קומות 6-13');
insLoc.run('גג המבנה');
insLoc.run('גינה קדמית');
insLoc.run('חדר מכונות');

// ─── TASKS ────────────────────────────────────────────────────────────────────
console.log('📋 מכניס משימות...');

const insTask = db.prepare(`
  INSERT INTO tasks (
    title, description, system_id, employee_id, frequency,
    start_date, start_time, priority, status, is_recurring,
    due_date, building_id, completion_note, approval_requested_at, approved_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

function task({
  title, desc='', sys=null, emp=null, freq='one-time',
  date=today, time='08:00', prio='normal', status='draft',
  recur=false, due=null, building=null, note='',
  approvalAt=null, approvedAt=null
}) {
  insTask.run(
    title, desc, sys, emp, freq,
    date, time, prio, status, recur ? 1 : 0,
    due, building, note, approvalAt, approvedAt
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DAILY recurring tasks — עובד 2 (נועה) — ניקיון
// ════════════════════════════════════════════════════════════════════════════
task({title:'ניקיון לובי ראשי', desc:'ניקוי לובי, ריצוף, ניגוב כניסה', sys:7, emp:2, freq:'daily', date:today, time:'07:00', status:'sent', recur:true, building:1});
task({title:'ניקיון שירותים קומה 1-3', desc:'ניקוי חיטוי שירותים, מילוי מוצרים', sys:7, emp:2, freq:'daily', date:today, time:'08:00', status:'sent', recur:true, building:1});
task({title:'ניקיון שירותים קומות 4-8', desc:'ניקוי שירותים קומות 4-8', sys:7, emp:2, freq:'daily', date:today, time:'09:30', status:'draft', recur:true, building:1});
task({title:'ניקיון שירותים קומות 9-13', desc:'ניקוי שירותים קומות 9-13', sys:7, emp:2, freq:'daily', date:today, time:'11:00', status:'draft', recur:true, building:1});
task({title:'השקיה גינה קדמית', desc:'בדיקת ממטרות + השקיה ידנית', sys:4, emp:2, freq:'daily', date:today, time:'13:00', status:'draft', recur:true, building:1});
task({title:'ניקיון חדר כביסה', desc:'ניקוי מכונות כביסה ורצפה', sys:7, emp:2, freq:'daily', date:today, time:'14:30', status:'draft', recur:true, building:1});

// DAILY — עובד 4 (מרים)
task({title:'ניקיון משרדי הנהלה', desc:'ניקיון יסודי, אבק, ריצוף, חלונות', sys:7, emp:4, freq:'daily', date:today, time:'07:30', status:'draft', recur:true, building:1});
task({title:'ניקיון חדרי ישיבות', desc:'ניקוי שולחנות, לוחות, כיסאות', sys:7, emp:4, freq:'daily', date:today, time:'09:00', status:'draft', recur:true, building:1});
task({title:'ניקיון מטבחון קומה 5', desc:'שטיפת כלים, ניקוי מיקרוגל, אזור קפה', sys:7, emp:4, freq:'daily', date:today, time:'10:30', status:'draft', recur:true, building:1});
task({title:'ניקיון מדרגות חירום', desc:'כל קומות — ניקוי מדרגות חירום', sys:7, emp:4, freq:'daily', date:today, time:'14:00', status:'draft', recur:true, building:1});

// ════════════════════════════════════════════════════════════════════════════
// WEEKLY tasks
// ════════════════════════════════════════════════════════════════════════════
task({title:'בדיקת מיזוג קומות 1-5', desc:'בדיקת פילטרים, טמפרטורה, ניקוי', sys:8, emp:3, freq:'weekly', date:today, time:'08:00', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת מיזוג קומות 6-13', desc:'בדיקת פילטרים, טמפרטורה', sys:8, emp:3, freq:'weekly', date:today, time:'10:00', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת מצלמות אבטחה', desc:'ניגוב עדשות מצלמות אבטחה + בדיקה', sys:5, emp:3, freq:'weekly', date:today, time:'15:00', status:'draft', recur:true, building:1});
task({title:'גיזום שיחים', desc:'גיזום שיחים ועשבים שוטים', sys:4, emp:2, freq:'weekly', date:today, time:'09:00', status:'draft', recur:true, building:1});
task({title:'בדיקת כניסות ומנעולים', desc:'בדיקת תקינות מנעולי כניסות ודלתות', sys:5, emp:1, freq:'weekly', date:today, time:'08:30', status:'draft', recur:true, building:2});
task({title:'ניקיון חניון שבועי', desc:'שטיפת רצפת חניון, פינוי פסולת', sys:7, emp:2, freq:'weekly', date:today, time:'16:00', status:'draft', recur:true, building:1});

// ════════════════════════════════════════════════════════════════════════════
// BIWEEKLY tasks
// ════════════════════════════════════════════════════════════════════════════
task({title:'כיסוח דשא', desc:'כיסוח דשא גינה קדמית', sys:4, emp:2, freq:'biweekly', date:today, time:'07:00', status:'draft', recur:true, building:1});
task({title:'בדיקת מאגר מים', desc:'בדיקת רמת מים + ניקוי מסנן', sys:3, emp:3, freq:'biweekly', date:today, time:'11:00', status:'draft', recur:true, building:2});
task({title:'ניקוי גג המבנה', desc:'פינוי עלים ופסולת מגג', sys:7, emp:4, freq:'biweekly', date:today, time:'13:30', status:'draft', recur:true, building:1});
task({title:'בדיקת תאורת חירום', desc:'בדיקת נורות חירום בכל קומות', sys:2, emp:3, freq:'biweekly', date:today, time:'14:00', status:'draft', recur:true, building:1});

// ════════════════════════════════════════════════════════════════════════════
// MONTHLY tasks
// ════════════════════════════════════════════════════════════════════════════
task({title:'בדיקת לוח חשמל ראשי', desc:'בדיקה חזותית + בדיקת מתח, חשמלאי מוסמך', sys:2, emp:3, freq:'monthly', date:today, time:'10:30', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת גנרטור', desc:'הרצת גנרטור 15 דקות, רישום תוצאות', sys:2, emp:3, freq:'monthly', date:today, time:'15:30', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת כיבוי אש — ספרינקלרים', desc:'בדיקת ספרינקלרים חודשית', sys:6, emp:3, freq:'monthly', date:today, time:'09:00', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת גלאי עשן', desc:'בדיקת כל גלאי העשן בבניין', sys:6, emp:3, freq:'monthly', date:today, time:'11:00', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'ניקוי מסנני מים', desc:'ניקוי מסנני מים בכל הדירות', sys:3, emp:3, freq:'monthly', date:today, time:'13:00', status:'draft', recur:true, building:2});
task({title:'גיזום עצים גינה קדמית', desc:'גיזום עצים גדולים, פינוי ענפים', sys:4, emp:2, freq:'monthly', date:today, time:'08:00', status:'draft', recur:true, building:1});
task({title:'בדיקת מעלית — תחזוקה חודשית', desc:'בדיקת מנגנוני מעלית, שמן, כבלים', sys:1, emp:3, freq:'monthly', date:today, time:'12:00', prio:'urgent', status:'draft', recur:true, building:1});

// ════════════════════════════════════════════════════════════════════════════
// ONE-TIME tasks — היום
// ════════════════════════════════════════════════════════════════════════════
task({title:'תיקון ברז דולף שירותי קומה 4', desc:'תיקון ברז דולף — תלונת דיירת רונית כהן', sys:3, emp:3, freq:'one-time', date:today, time:'11:30', prio:'urgent', status:'draft', building:1});
task({title:'החלפת נורות קומה 6-8', desc:'החלפת נורות לד שרופות', sys:2, emp:3, freq:'one-time', date:today, time:'09:30', status:'draft', building:1});
task({title:'ריסוס חרקים — מרתף', desc:'ריסוס תחתי מרתף ותעלות — פגיעה בלתי צפויה', sys:7, emp:2, freq:'one-time', date:today, time:'15:30', status:'draft', building:1});
task({title:'בדיקת דלת חדר מכונות', desc:'הדלת נתקעת — בדיקת מנגנון', sys:5, emp:1, freq:'one-time', date:today, time:'10:00', prio:'urgent', status:'draft', building:1});

// ════════════════════════════════════════════════════════════════════════════
// ONE-TIME tasks — עתיד
// ════════════════════════════════════════════════════════════════════════════
task({title:'תחזוקת מעליות — טכנאי חיצוני', desc:'תחזוקה חצי שנתית, חברת מעליות ישראל', sys:1, emp:3, freq:'one-time', date:in5Days, time:'08:00', prio:'urgent', status:'draft', building:1});
task({title:'בדיקת מערכת אזעקה', desc:'בדיקה חודשית — מאובטחים', sys:5, emp:3, freq:'one-time', date:in7Days, time:'14:00', status:'draft', building:1});
task({title:'בדיקת חימום מים', desc:'בדיקת דוד חשמלי + ניקוי קסם', sys:2, emp:3, freq:'one-time', date:in14Days, time:'13:00', status:'draft', building:2});
task({title:'צביעת חדר מדרגות', desc:'צביעה מחדש — תיאום עם ועד הבית', sys:7, emp:1, freq:'one-time', date:in14Days, time:'09:00', status:'draft', building:1});
task({title:'התקנת מצלמה חדשה בחניון', desc:'הגדלת כיסוי וידאו בחניון מפלס -1', sys:5, emp:3, freq:'one-time', date:in30Days, time:'10:00', status:'draft', building:1});

// ════════════════════════════════════════════════════════════════════════════
// DUE DATE tasks — פג תוקף תוך 1-3 ימים (כולל היום)
// ════════════════════════════════════════════════════════════════════════════
task({title:'חידוש חוזה מעליות', desc:'חידוש חוזה שנתי עם מעליות ישראל', sys:1, emp:1, freq:'one-time', date:today, time:'09:00', prio:'urgent', status:'draft', due:today, building:1});
task({title:'הגשת דוח בטיחות חודשי', desc:'דוח בטיחות לרשות המקומית', sys:6, emp:1, freq:'one-time', date:today, time:'10:00', prio:'urgent', status:'draft', due:tomorrow, building:1});
task({title:'עדכון רשימת כוננות', desc:'עדכון רשימת כוננות לחודש הבא', sys:5, emp:1, freq:'one-time', date:today, time:'11:00', status:'draft', due:tomorrow, building:1});
task({title:'תיקון תאורת חניון', desc:'תיקון שתי נורות שרופות בחניון — בטיחות', sys:2, emp:3, freq:'one-time', date:today, time:'12:00', prio:'urgent', status:'draft', due:in2Days, building:1});
task({title:'בדיקת ביטוח שנתי', desc:'חידוש ביטוח מבנה — המסמכים אצל המנהל', sys:5, emp:1, freq:'one-time', date:today, time:'09:00', status:'draft', due:in3Days, building:1});
task({title:'טיפול בנזילה בגג', desc:'נזילה שנמצאה בגג — חייב לטפל לפני גשם', sys:3, emp:3, freq:'one-time', date:today, time:'08:00', prio:'urgent', status:'sent', due:in2Days, building:2});

// ════════════════════════════════════════════════════════════════════════════
// PENDING APPROVAL tasks — ממתינות לאישור (לפחות 4)
// ════════════════════════════════════════════════════════════════════════════
task({title:'ניקיון קומות 1-5 — מעברים', desc:'ניקוי מלא בוצע', sys:7, emp:2, freq:'daily', date:yesterday, time:'08:00', status:'pending_approval', recur:true, note:'הכל נקי, החלפתי גם שלטי קומות', approvalAt:nowISO, building:1});
task({title:'בדיקת מיזוג קומות 1-5', desc:'בדיקה שבועית בוצעה', sys:8, emp:3, freq:'weekly', date:yesterday, time:'08:00', prio:'urgent', status:'pending_approval', recur:true, note:'פילטרים הוחלפו בקומות 3 ו-5, שאר תקין', approvalAt:nowISO, building:1});
task({title:'תיקון ברז דולף שירותי קומה 2', desc:'תיקון בוצע', sys:3, emp:3, freq:'one-time', date:yesterday, time:'11:00', prio:'urgent', status:'pending_approval', note:'הוחלף הגומי, לחץ תקין', approvalAt:nowISO, building:1});
task({title:'החלפת נורות לובי', desc:'הוחלפו 3 נורות שרופות בלובי', sys:2, emp:3, freq:'one-time', date:yesterday, time:'14:00', status:'pending_approval', note:'הוחלפו 3 נורות LED כולל חוץ', approvalAt:nowISO, building:1});
task({title:'גיזום עצים גינה', desc:'גיזום עצים גדולים בוצע', sys:4, emp:2, freq:'monthly', date:twoDaysAgo, time:'08:00', status:'pending_approval', recur:true, note:'גוזמו 4 עצים, פינוי ענפים הושלם', approvalAt:nowISO, building:1});

// ════════════════════════════════════════════════════════════════════════════
// NOT_COMPLETED tasks — באיחור (לפחות 3)
// ════════════════════════════════════════════════════════════════════════════
task({title:'בדיקת גנרטור — נדחה', desc:'נדחה בגלל תקלה בדלת חדר מכונות', sys:2, emp:3, freq:'one-time', date:yesterday, time:'15:30', prio:'urgent', status:'not_completed', building:1});
task({title:'ריסוס חרקים — קומה B', desc:'נדחה — מחכה לאישור חומרים מהמנהל', sys:7, emp:2, freq:'one-time', date:yesterday, time:'15:30', status:'not_completed', building:1});
task({title:'תיקון מנעול דלת גג', desc:'נדחה — חסר חלק חילוף', sys:5, emp:3, freq:'one-time', date:threeDaysAgo, time:'10:00', prio:'urgent', status:'not_completed', building:1});
task({title:'בדיקת ביקורת בטיחות מסדרון', desc:'לא בוצע — עובד חלה', sys:6, emp:4, freq:'monthly', date:twoDaysAgo, time:'09:00', prio:'urgent', status:'not_completed', recur:true, building:2});

// ════════════════════════════════════════════════════════════════════════════
// COMPLETED tasks — עם completion_note
// ════════════════════════════════════════════════════════════════════════════
const completedTasks = [
  ['ניקיון לובי ראשי', 7, 2, yesterday, '07:30', true,  'לובי נוצץ, הוספתי ריח נעים'],
  ['מעלית — בדיקה יומית', 1, 3, yesterday, '08:30', true,  'מעלית תקינה, ניקוי תא בוצע'],
  ['ניקיון שירותים קומה 1-3', 7, 2, yesterday, '08:00', true,  'ניקוי מלא + מילוי כל המוצרים'],
  ['השקיה גינה קדמית', 4, 2, yesterday, '09:00', true,  'כל הממטרות תקינות'],
  ['החלפת נורות קומה 3', 2, 3, yesterday, '09:30', false, 'הוחלפו 5 נורות, אחסון מחודש'],
  ['ניקיון משרדי הנהלה', 7, 4, yesterday, '07:30', true,  'ניקיון יסודי, נמצאו מסמכים שנשלחו למנהל'],
  ['ניקיון חדרי ישיבות', 7, 4, yesterday, '09:00', true,  'חדרי ישיבות נקיים ומוכנים'],
  ['ניקיון לובי ראשי', 7, 2, twoDaysAgo, '07:30', true,  'בוצע'],
  ['ניקיון קומות 1-5 — מעברים', 7, 2, twoDaysAgo, '08:00', true,  'בוצע'],
  ['ניקיון שירותים קומה 1-3', 7, 2, twoDaysAgo, '08:00', true,  'בוצע'],
  ['בדיקת מיזוג קומות 1-5', 8, 3, twoDaysAgo, '08:00', true,  'תקין'],
  ['ניקיון משרדי הנהלה', 7, 4, twoDaysAgo, '07:30', true,  'בוצע'],
];
const insCompleted = db.prepare(`
  INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time,
    priority, status, is_recurring, completion_note, building_id)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);
for (const [title, sys, emp, date, time, recur, note] of completedTasks) {
  insCompleted.run(title, 'בוצע בהצלחה', sys, emp, recur ? 'daily' : 'one-time', date, time, 'normal', 'completed', recur ? 1 : 0, note, 1);
}

// ════════════════════════════════════════════════════════════════════════════
// TOMORROW + FUTURE scheduled tasks
// ════════════════════════════════════════════════════════════════════════════
task({title:'ניקיון לובי ראשי', desc:'ניקוי לובי', sys:7, emp:2, freq:'daily', date:tomorrow, time:'07:00', status:'draft', recur:true, building:1});
task({title:'ניקיון שירותים קומה 1-3', desc:'ניקוי שירותים', sys:7, emp:2, freq:'daily', date:tomorrow, time:'08:00', status:'draft', recur:true, building:1});
task({title:'בדיקת מיזוג קומות 1-5', desc:'בדיקה שבועית', sys:8, emp:3, freq:'weekly', date:tomorrow, time:'08:00', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת כיבוי אש', desc:'בדיקת ספרינקלרים חודשית', sys:6, emp:3, freq:'monthly', date:tomorrow, time:'11:00', prio:'urgent', status:'draft', recur:true, building:1});
task({title:'בדיקת מצלמות', desc:'בדיקת מצלמות שבועית', sys:5, emp:3, freq:'weekly', date:tomorrow, time:'10:00', status:'draft', recur:true, building:1});
task({title:'טיפול בדשא', desc:'כיסוח דשא', sys:4, emp:2, freq:'biweekly', date:in3Days, time:'07:00', status:'draft', recur:true, building:1});

// ─── SETTINGS ──────────────────────────────────────────────────────────────────
console.log('⚙️ מכניס הגדרות...');
const insSetting = db.prepare(`INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
insSetting.run('site_name',           'מתחם הרצל 27 — מנהל תחזוקה');
insSetting.run('manager_employee_id', '1');
insSetting.run('workday_start_time',  '07:00');
insSetting.run('workday_end_time',    '17:00');

// ─── UNITS ─────────────────────────────────────────────────────────────────────
try {
  const insUnit = db.prepare(`
    INSERT INTO units (name, system_id, inspection_date, alert_days, recurring_enabled, recurring_frequency, recurring_interval, notes)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  insUnit.run('מעלית 1',          1, dateOffset(-35), 7,  1, 'monthly', 1, 'בדיקה חודשית חובה');
  insUnit.run('גנרטור ראשי',      2, dateOffset(-35), 14, 1, 'monthly', 1, 'בדיקה עם הרצה');
  insUnit.run('לוח חשמל ראשי',    2, dateOffset(-20), 30, 1, 'monthly', 1, 'חשמלאי מוסמך בלבד');
  insUnit.run('מד עשן קומה 8',    6, dateOffset(-200),10, 1, 'semi-annual', 1, 'החלפת סוללות');
  insUnit.run('משאבת מים ראשית',  3, dateOffset(-40), 14, 1, 'monthly', 1, 'בדיקת לחץ');
} catch(e) {
  console.warn('⚠️ units insert:', e.message);
}

// ─── SUMMARY ───────────────────────────────────────────────────────────────────
db.pragma('foreign_keys = ON');

const counts = {
  employees:   db.prepare('SELECT COUNT(*) as c FROM employees').get().c,
  buildings:   db.prepare('SELECT COUNT(*) as c FROM buildings').get().c,
  tenants:     db.prepare('SELECT COUNT(*) as c FROM tenants').get().c,
  suppliers:   db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c,
  systems:     db.prepare('SELECT COUNT(*) as c FROM systems').get().c,
  tasks:       db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
  pending:     db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='pending_approval'").get().c,
  notDone:     db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='not_completed'").get().c,
  dueSoon:     db.prepare("SELECT COUNT(*) as c FROM tasks WHERE due_date IS NOT NULL AND date(due_date) <= date('now', '+3 days')").get().c,
  completed:   db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='completed'").get().c,
  daily:       db.prepare("SELECT COUNT(*) as c FROM tasks WHERE frequency='daily'").get().c,
  weekly:      db.prepare("SELECT COUNT(*) as c FROM tasks WHERE frequency='weekly'").get().c,
  biweekly:    db.prepare("SELECT COUNT(*) as c FROM tasks WHERE frequency='biweekly'").get().c,
  monthly:     db.prepare("SELECT COUNT(*) as c FROM tasks WHERE frequency='monthly'").get().c,
  oneTime:     db.prepare("SELECT COUNT(*) as c FROM tasks WHERE frequency='one-time'").get().c,
};

console.log('\n✅ Seed הושלם בהצלחה!\n');
console.log('📊 סיכום:');
console.log(`  👷 עובדים:              ${counts.employees}`);
console.log(`  🏢 מבנים:               ${counts.buildings}`);
console.log(`  🏠 דיירים:              ${counts.tenants}`);
console.log(`  🔧 ספקים:               ${counts.suppliers}`);
console.log(`  ⚙️  מערכות:             ${counts.systems}`);
console.log(`  📋 סה"כ משימות:        ${counts.tasks}`);
console.log(`     ↳ יומיות (daily):    ${counts.daily}`);
console.log(`     ↳ שבועיות (weekly):  ${counts.weekly}`);
console.log(`     ↳ דו-שבועיות:       ${counts.biweekly}`);
console.log(`     ↳ חודשיות (monthly): ${counts.monthly}`);
console.log(`     ↳ חד-פעמיות:        ${counts.oneTime}`);
console.log(`     ↳ completed:         ${counts.completed}`);
console.log(`  🔔 pending_approval:    ${counts.pending} ${counts.pending >= 4 ? '✅' : '❌ (צריך 4+)'}`);
console.log(`  ⚠️  not_completed:      ${counts.notDone} ${counts.notDone >= 3 ? '✅' : '❌ (צריך 3+)'}`);
console.log(`  📅 due תוך 3 ימים:    ${counts.dueSoon} ${counts.dueSoon >= 3 ? '✅' : '❌ (צריך 3+)'}`);

if (counts.tasks < 65) console.log(`\n⚠️  סה"כ משימות ${counts.tasks} — צריך 65+!`);
else console.log(`\n🎉 כל הבדיקות עברו בהצלחה!`);
