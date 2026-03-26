const Database = require('C:/dev/projects/EDEN-PROJECT_LOCAL/node_modules/better-sqlite3');
const db = new Database('C:/dev/projects/EDEN-PROJECT_LOCAL/maintenance.db');
const info = db.prepare('PRAGMA table_info(tasks)').all();
console.log(JSON.stringify(info, null, 2));
db.close();
