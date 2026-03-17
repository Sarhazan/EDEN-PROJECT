const fs = require('fs');
const path = require('path');
const { db } = require('./schema');
const { addDays, addMonths, addWeeks, format } = require('date-fns');

const HIDE_BUILTIN_FORMS_AFTER_CLEAR_KEY = 'hide_builtin_forms_after_clear';

function seedDatabase() {
  // Clear existing data safely (respecting evolving schema)
  clearDatabase();

  // Insert systems
  const insertSystem = db.prepare(`
    INSERT INTO systems (name, description, contact_person, phone, email)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSystem.run('מיזוג אוויר', 'תחזוקת מערכות מיזוג אוויר בכל המבנה', 'משה כהן', '050-1234567', 'moshe@example.com');
  insertSystem.run('אינסטלציה', 'מערכות אינסטלציה ושירותים', 'דוד לוי', '052-7654321', 'david@example.com');
  insertSystem.run('חשמל', 'מערכות חשמל ותאורה', 'שרה אברהם', '054-9876543', 'sarah@example.com');
  insertSystem.run('מעלית', 'תחזוקת מעליות המבנה', 'יוסי כהן', '03-1234567', 'yossi@elevator.co.il');
  insertSystem.run('גינון', 'תחזוקת גינון ושטחים ירוקים', 'רחל גרין', '054-1112223', 'rachel@garden.co.il');
  insertSystem.run('אבטחה', 'מערכות אבטחה ומצלמות', 'אבי שומר', '050-9998887', 'avi@security.co.il');
  insertSystem.run('כיבוי אש', 'מערכות כיבוי אש וגלאים', 'משה אש', '052-5554443', 'moshe@fire.co.il');

  // Insert employees
  const insertEmployee = db.prepare(`
    INSERT INTO employees (name, phone, position)
    VALUES (?, ?, ?)
  `);

  insertEmployee.run('דוד כהן', '050-1234567', 'טכנאי ראשי');
  insertEmployee.run('שרה לוי', '052-7654321', 'עובדת תחזוקה');
  insertEmployee.run('יוסי אברהם', '054-3216549', 'חשמלאי');
  insertEmployee.run('מיכל ישראלי', '050-9876543', 'מנקה');
  insertEmployee.run('עדן קנדי ', '0539441903', 'טכנאי');
  insertEmployee.run('אבי דוד', '052-1112223', 'גנן');
  insertEmployee.run('רונית כהן', '054-4445556', 'טכנאית מיזוג');

  // Insert suppliers
  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, phone, email, payment_frequency, next_payment_date, payment_amount, is_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
  const nextQuarter = format(addMonths(new Date(), 3), 'yyyy-MM-dd');
  const nextSixMonths = format(addMonths(new Date(), 6), 'yyyy-MM-dd');

  insertSupplier.run('אתם לוי בע"מ', '03-1234567', 'contact@example.com', 'monthly', nextMonth, 2500.00, 0);
  insertSupplier.run('חברת החשמל', '1-800-123-456', 'billing@electric.co.il', 'monthly', nextMonth, 5000.00, 0);
  insertSupplier.run('מעליות ישראל', '03-9876543', 'service@elevators.co.il', 'quarterly', nextQuarter, 8000.00, 0);
  insertSupplier.run('גינון ירוק בע"מ', '054-7778889', 'info@greengardens.co.il', 'monthly', nextMonth, 3500.00, 0);
  insertSupplier.run('אבטחה 24/7', '03-5556667', 'contact@security247.co.il', 'quarterly', nextQuarter, 12000.00, 0);
  insertSupplier.run('כיבוי אש מקצועי', '03-2223334', 'service@firepro.co.il', 'semi-annual', nextSixMonths, 6500.00, 0);

  // Insert locations
  const insertLocation = db.prepare(`
    INSERT INTO locations (name, image, latitude, longitude)
    VALUES (?, ?, ?, ?)
  `);

  // Using placeholder images - in real use, these would be actual uploaded images
  insertLocation.run('לובי ראשי - קומת קרקע', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', '32.0853', '34.7818');
  insertLocation.run('חדר מדרגות א', 'https://images.unsplash.com/photo-1562095241-8c6714fd4178?w=800', '32.0854', '34.7819');
  insertLocation.run('חדר מדרגות ב', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800', '32.0852', '34.7817');
  insertLocation.run('גג המבנה', 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=800', '32.0855', '34.7820');
  insertLocation.run('חניון תת קרקעי', 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800', '32.0851', '34.7816');
  insertLocation.run('חצר אחורית', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', '32.0850', '34.7815');
  insertLocation.run('גינה קדמית', 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800', '32.0856', '34.7821');
  insertLocation.run('חדר מכונות - קומה 1', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800', '32.0853', '34.7819');

  // Insert buildings (keep demo set small and consistent: up to two)
  const insertBuilding = db.prepare(`
    INSERT INTO buildings (name)
    VALUES (?)
  `);
  insertBuilding.run('מגדל הרצל 27');
  insertBuilding.run('בית הים 4');

  // Insert tenants (include a persistent test tenant + richer demo details)
  const insertTenant = db.prepare(`
    INSERT INTO tenants (name, phone, email, apartment_number, floor, building_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const demoTenants = [
    ['עדן קנדי', '0539441903', 'eden.kendi@example.com', '2', '1', 1, 'דיירת בדיקות קבועה לזרימת שליחת טפסים'],
    ['נועה כהן', '0501111111', 'noa.cohen@example.com', '12', '3', 1, 'מעדיפה הודעות וואטסאפ בשעות הערב'],
    ['אמיר חדד', '0538899002', 'amir.hadad@example.com', '23', '6', 1, 'רגיש לרעש בבוקר מוקדם'],
    ['שירה דגן', '0526773210', 'shira.dagan@example.com', '8', '2', 1, 'מבקשת תיעוד מסודר לכל פנייה'],
    ['יואב לוי', '0502222222', 'yoav.levi@example.com', '21', '7', 2, 'מבקש תיאום מראש לפני כניסה לדירה'],
    ['רוני מזרחי', '0523004455', 'roni.mizrahi@example.com', '5', '1', 2, 'חדש בבניין, קוד אינטרקום 4505'],
    ['ליאת פרץ', '0546677881', 'liat.peretz@example.com', '18', '4', 2, 'עובדת משמרות - עדיף ליצור קשר אחרי 16:00'],
    ['גיא נבון', '0509094433', 'guy.navon@example.com', '14', '5', 2, 'זמין בעיקר בוואטסאפ ולא בשיחות קוליות']
  ];

  for (const tenant of demoTenants) {
    insertTenant.run(...tenant);
  }

  // Insert tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
  const nextWeek = format(addWeeks(new Date(), 1), 'yyyy-MM-dd');
  const in3Days = format(addDays(new Date(), 3), 'yyyy-MM-dd');
  const in5Days = format(addDays(new Date(), 5), 'yyyy-MM-dd');

  // Today's recurring tasks
  insertTask.run('בדיקת מערכות מיזוג', 'בדיקה חודשית של כל מערכות המיזוג בקומות 1-5', 1, 1, 'monthly', today, '09:00', 'urgent', 'sent', 1);
  insertTask.run('בדיקת פילטרים', 'החלפת פילטרים במערכת המיזוג - קומות 2,3,4', 1, 6, 'weekly', today, '10:30', 'normal', 'draft', 1);
  insertTask.run('ניקוי שירותים', 'ניקוי יומי של כל השירותים במבנה', 2, 4, 'daily', today, '08:00', 'normal', 'draft', 1);
  insertTask.run('בדיקת מצלמות אבטחה', 'בדיקת תקינות כל מצלמות האבטחה והקלטה', 6, 1, 'weekly', today, '07:30', 'urgent', 'draft', 1);
  insertTask.run('השקיה אוטומטית', 'בדיקת מערכת השקיה בגינה הקדמית', 5, 5, 'daily', today, '15:00', 'normal', 'draft', 1);

  // Today's one-time tasks
  insertTask.run('בדיקת נורות בקומה 3', 'החלפת נורות שרופות בקומה השלישית - חדר מדרגות', 3, 3, 'one-time', today, '14:00', 'normal', 'draft', 0);
  insertTask.run('תיקון דלת כניסה', 'תיקון מנגנון סגירה של דלת הכניסה הראשית', null, 1, 'one-time', today, '11:00', 'urgent', 'sent', 0);
  insertTask.run('ניקוי גינה קדמית', 'הסרת עלים ופסולת מהגינה הקדמית', 5, 6, 'one-time', today, '15:00', 'optional', 'draft', 0);
  insertTask.run('בדיקת לחץ מים', 'בדיקת לחץ מים בקומות העליונות', 2, 2, 'one-time', today, '12:00', 'normal', 'draft', 0);
  insertTask.run('ניקוי מצלמות אבטחה', 'ניקוי עדשות מצלמות האבטחה', 6, 5, 'one-time', today, '13:00', 'normal', 'draft', 0);
  insertTask.run('בדיקת גינה אחורית', 'בדיקה והסרת פסולת בגינה האחורית', 5, 5, 'one-time', today, '15:30', 'optional', 'draft', 0);
  insertTask.run('תיקון נורה בלובי', 'החלפת נורה שרופה בלובי הראשי', 3, 3, 'one-time', today, '16:00', 'normal', 'draft', 0);
  insertTask.run('בדיקת מעקות בגג', 'בדיקת תקינות מעקות הבטיחות בגג', null, 1, 'one-time', today, '17:00', 'urgent', 'draft', 0);
  insertTask.run('ניקוי חדר מדרגות א', 'ניקוי יומי של חדר מדרגות א', null, 4, 'one-time', today, '08:30', 'normal', 'draft', 0);
  insertTask.run('בדיקת מנעול שער חניון', 'בדיקת תקינות מנעול השער החשמלי', 6, 1, 'one-time', today, '18:00', 'normal', 'draft', 0);

  // Overdue tasks (yesterday)
  insertTask.run('תיקון ברז דולף', 'תיקון ברז דולף בשירותי קומה 2 - דחוף!', 2, 2, 'one-time', yesterday, '09:00', 'urgent', 'draft', 0);
  insertTask.run('בדיקת לוח חשמל', 'בדיקת חיבורים בלוח החשמל הראשי בחדר מכונות', 3, 3, 'one-time', yesterday, '15:00', 'normal', 'draft', 0);
  insertTask.run('החלפת סוללות גלאי עשן', 'החלפת סוללות בגלאי עשן קומה 4', 7, 1, 'one-time', yesterday, '10:00', 'urgent', 'draft', 0);

  // Tomorrow's tasks
  insertTask.run('בדיקת גנרטור', 'בדיקה חודשית של גנרטור החירום - הרצה 30 דקות', 3, 3, 'monthly', tomorrow, '10:00', 'urgent', 'draft', 1);
  insertTask.run('גיזום עצים', 'גיזום עצים בגינה האחורית והקדמית', 5, 5, 'monthly', tomorrow, '08:00', 'normal', 'draft', 1);
  insertTask.run('ניקוי מערכת ניקוז', 'ניקוי מערכת הניקוז בחניון התת קרקעי', 2, 2, 'one-time', tomorrow, '09:00', 'normal', 'draft', 0);
  insertTask.run('בדיקת מערכת כיבוי אש', 'בדיקת לחץ במערכת ספרינקלרים', 7, 1, 'monthly', tomorrow, '11:00', 'urgent', 'draft', 1);

  // Future tasks (3-7 days ahead)
  insertTask.run('תחזוקת מעלית', 'תחזוקה חצי שנתית של מעלית המבנה - טכנאי חיצוני', 4, 1, 'semi-annual', nextWeek, '08:00', 'urgent', 'draft', 1);
  insertTask.run('ניקוי גג', 'ניקוי וסילוק פסולת מגג המבנה', null, 4, 'one-time', in3Days, '09:00', 'normal', 'draft', 0);
  insertTask.run('בדיקת מערכת התראה', 'בדיקה חודשית של מערכת התראת האבטחה', 6, 1, 'monthly', in5Days, '14:00', 'normal', 'draft', 1);
  insertTask.run('טיפול בדשא', 'כיסוח דשא וטיפול בשטחי הגינה', 5, 5, 'biweekly', in3Days, '07:00', 'optional', 'draft', 1);
  insertTask.run('בדיקת חימום מים', 'בדיקת תקינות דוד חשמלי ומערכת חימום', 2, 3, 'monthly', nextWeek, '13:00', 'normal', 'draft', 1);

  seedDefaultLanguages();
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(HIDE_BUILTIN_FORMS_AFTER_CLEAR_KEY, '0');

  console.log('Database seeded with sample data successfully');
}

// Default languages always available (restored after clear too)
const DEFAULT_LANGUAGES = [
  { code: 'he', name: 'Hebrew' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

function seedDefaultLanguages() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO languages (code, name) VALUES (?, ?)`
  );
  for (const lang of DEFAULT_LANGUAGES) {
    insert.run(lang.code, lang.name);
  }
}

function resolveLocalUploadPath(filePathValue) {
  if (!filePathValue) return null;
  const normalized = String(filePathValue).replace(/\\/g, '/').replace(/^\/+/, '');
  return path.join(__dirname, '..', '..', normalized);
}

function safeDeleteFile(filePathValue) {
  const absolute = resolveLocalUploadPath(filePathValue);
  if (!absolute) return;

  try {
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      fs.unlinkSync(absolute);
    }
  } catch (error) {
    console.warn(`[seed.clearDatabase] Failed to delete file ${absolute}: ${error.message}`);
  }
}

function clearDemoUploadedAssets() {
  const templateFiles = db.prepare(`
    SELECT file_path
    FROM custom_form_templates
    WHERE file_path IS NOT NULL AND TRIM(file_path) <> ''
  `).all();

  const contractFiles = db.prepare(`
    SELECT file_path
    FROM building_contracts
    WHERE file_path IS NOT NULL AND TRIM(file_path) <> ''
  `).all();

  [...templateFiles, ...contractFiles].forEach((row) => safeDeleteFile(row.file_path));
}

function clearDatabase() {
  clearDemoUploadedAssets();

  const tableRows = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
  `).all();

  // Keep settings by default so API keys/config survive demo resets
  const skipTables = new Set(['settings']);
  const tableNames = tableRows
    .map((r) => r.name)
    .filter((name) => !skipTables.has(name));

  db.exec('PRAGMA foreign_keys = OFF');
  try {
    for (const tableName of tableNames) {
      db.exec(`DELETE FROM ${tableName}`);
    }

    db.exec(`DELETE FROM sqlite_sequence`);
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }

  // Always restore default languages after clear
  seedDefaultLanguages();

  // After explicit clear, hide built-in form templates so forms screen is empty.
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(HIDE_BUILTIN_FORMS_AFTER_CLEAR_KEY, '1');

  console.log('Database cleared successfully');
}

module.exports = { seedDatabase, clearDatabase, seedDefaultLanguages };
