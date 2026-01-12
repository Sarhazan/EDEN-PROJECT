const { db } = require('./schema');
const { addDays, addMonths, addWeeks, format } = require('date-fns');

function seedDatabase() {
  // Clear existing data
  db.exec(`DELETE FROM tasks`);
  db.exec(`DELETE FROM systems`);
  db.exec(`DELETE FROM employees`);
  db.exec(`DELETE FROM suppliers`);

  // Reset auto-increment
  db.exec(`DELETE FROM sqlite_sequence`);

  // Insert systems
  const insertSystem = db.prepare(`
    INSERT INTO systems (name, description, contact_person, phone, email)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertSystem.run('מיזוג אוויר', 'תחזוקת מערכות מיזוג אוויר בכל המבנה', 'משה כהן', '050-1234567', 'moshe@example.com');
  insertSystem.run('אינסטלציה', 'מערכות אינסטלציה ושירותים', 'דוד לוי', '052-7654321', 'david@example.com');
  insertSystem.run('חשמל', 'מערכות חשמל ותאורה', 'שרה אברהם', '054-9876543', 'sarah@example.com');
  insertSystem.run('מעלית', 'תחזוקת מעליות המבנה', 'יוסי כהן', '03-1234567', 'yossi@elevator.co.il');

  // Insert employees
  const insertEmployee = db.prepare(`
    INSERT INTO employees (name, phone, position)
    VALUES (?, ?, ?)
  `);

  insertEmployee.run('דוד כהן', '050-1234567', 'טכנאי ראשי');
  insertEmployee.run('שרה לוי', '052-7654321', 'עובדת תחזוקה');
  insertEmployee.run('יוסי אברהם', '054-3216549', 'חשמלאי');

  // Insert suppliers
  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, phone, email, payment_frequency, next_payment_date, payment_amount, is_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
  const nextQuarter = format(addMonths(new Date(), 3), 'yyyy-MM-dd');

  insertSupplier.run('אתם לוי בע"מ', '03-1234567', 'contact@example.com', 'monthly', nextMonth, 2500.00, 0);
  insertSupplier.run('חברת החשמל', '1-800-123-456', 'billing@electric.co.il', 'monthly', nextMonth, 5000.00, 0);
  insertSupplier.run('מעליות ישראל', '03-9876543', 'service@elevators.co.il', 'quarterly', nextQuarter, 8000.00, 0);

  // Insert tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, system_id, employee_id, frequency, start_date, start_time, priority, status, is_recurring)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
  const nextWeek = format(addWeeks(new Date(), 1), 'yyyy-MM-dd');

  // Today's recurring tasks
  insertTask.run('בדיקת מערכות מיזוג', 'בדיקה חודשית של כל מערכות המיזוג', 1, 1, 'monthly', today, '09:00', 'urgent', 'sent', 1);
  insertTask.run('בדיקת פילטרים', 'החלפת פילטרים במערכת המיזוג', 1, 1, 'weekly', today, '10:30', 'normal', 'draft', 1);
  insertTask.run('ניקוי שירותים', 'ניקוי יומי של כל השירותים במבנה', 2, 2, 'daily', today, '08:00', 'normal', 'in_progress', 1);

  // Today's one-time tasks
  insertTask.run('בדיקת נורות בקומה 3', 'החלפת נורות שרופות בקומה השלישית', 3, 3, 'one-time', today, '14:00', 'normal', 'draft', 0);
  insertTask.run('תיקון דלת כניסה', 'תיקון מנגנון סגירה של דלת הכניסה הראשית', null, 1, 'one-time', today, '11:00', 'urgent', 'sent', 0);

  // Overdue tasks (yesterday)
  insertTask.run('תיקון ברז דולף', 'תיקון ברז דולף בשירותי קומה 2', 2, 2, 'one-time', yesterday, '09:00', 'urgent', 'draft', 0);
  insertTask.run('בדיקת לוח חשמל', 'בדיקת חיבורים בלוח החשמל הראשי', 3, 3, 'one-time', yesterday, '15:00', 'normal', 'draft', 0);

  // Future tasks
  insertTask.run('תחזוקת מעלית', 'תחזוקה חצי שנתית של מעלית המבנה', 4, 1, 'semi-annual', nextWeek, '08:00', 'normal', 'draft', 1);
  insertTask.run('בדיקת גנרטור', 'בדיקה חודשית של גנרטור החירום', 3, 3, 'monthly', tomorrow, '10:00', 'optional', 'draft', 1);

  console.log('Database seeded with sample data successfully');
}

function clearDatabase() {
  db.exec(`DELETE FROM tasks`);
  db.exec(`DELETE FROM systems`);
  db.exec(`DELETE FROM employees`);
  db.exec(`DELETE FROM suppliers`);
  db.exec(`DELETE FROM sqlite_sequence`);

  console.log('Database cleared successfully');
}

module.exports = { seedDatabase, clearDatabase };
