const Database = require('better-sqlite3');
const db = new Database('C:/dev/projects/EDEN-PROJECT_LOCAL/maintenance.db');
const rows = db.prepare("SELECT id,title,status,sent_at,acknowledged_at,approval_requested_at,approved_at,completed_at,updated_at,start_date,start_time FROM tasks WHERE title LIKE ? ORDER BY id DESC LIMIT 10").all('%לנקות מעלית%');
console.log(rows);
