const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'maintenance.db');
const db = new Database(dbPath);

// Get all recurring daily tasks
const tasks = db.prepare(`
  SELECT id, title, start_date, start_time, is_recurring, frequency, status, employee_id
  FROM tasks
  WHERE is_recurring = 1 AND frequency = 'daily'
  ORDER BY start_time
`).all();

console.log(`Found ${tasks.length} daily recurring tasks:\n`);

const now = new Date();
console.log('Current time (UTC):', now.toISOString());
console.log('Current time (Local):', now.toString());

tasks.forEach(task => {
  console.log('\n---');
  console.log('Task:', task.title);
  console.log('Start date:', task.start_date);
  console.log('Start time:', task.start_time);
  console.log('Status:', task.status);
  console.log('Employee ID:', task.employee_id);

  // For recurring tasks, only check if the time today is in the future
  const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  const taskDateTimeToday = new Date(`${today}T${task.start_time}`);
  const isFuture = taskDateTimeToday > now;

  console.log('Task time today:', taskDateTimeToday.toString());
  console.log('Is future?', isFuture);

  // Check if button should show
  const shouldShowButton = task.status === 'draft' && task.employee_id && isFuture;
  console.log('Should show send button?', shouldShowButton);
});

db.close();
