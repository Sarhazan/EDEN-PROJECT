const Database = require('C:/dev/projects/EDEN-PROJECT_LOCAL/node_modules/better-sqlite3');
const db = new Database('C:/dev/projects/EDEN-PROJECT_LOCAL/maintenance.db');
const today = new Date().toISOString().slice(0,10);
console.log('today:', today);

db.prepare(`INSERT INTO tasks (title, start_date, start_time, due_date, frequency, is_recurring, status, priority, created_at, updated_at) 
VALUES ('test_due_today', ?, '08:00', ?, 'one-time', 0, 'draft', 'normal', datetime('now'), datetime('now'))`).run(today, today);
console.log('done');
db.close();
