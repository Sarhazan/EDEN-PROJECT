const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'maintenance.db');
const db = new Database(dbPath);

// Find the task
const task = db.prepare(`
  SELECT id, title, status, start_time
  FROM tasks
  WHERE title = 'השקיה אוטומטית'
`).get();

console.log('Before update:');
console.log(task);

if (task) {
  // Update status to draft and change time to 16:00 (future time)
  db.prepare(`
    UPDATE tasks
    SET status = 'draft', start_time = '16:00', sent_at = NULL
    WHERE id = ?
  `).run(task.id);

  const updatedTask = db.prepare(`
    SELECT id, title, status, start_time, sent_at
    FROM tasks
    WHERE id = ?
  `).get(task.id);

  console.log('\nAfter update:');
  console.log(updatedTask);
}

db.close();
console.log('\nTask reset successfully!');
