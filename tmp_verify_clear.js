const Database = require('better-sqlite3');
const db = new Database('C:/dev/projects/EDEN-PROJECT_LOCAL/maintenance.db');
const tables = ['tasks', 'tenants', 'employees', 'custom_form_templates'];
const out = {};
for (const t of tables) out[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
out.hideFlag = db.prepare("SELECT value FROM settings WHERE key='hide_builtin_forms_after_clear'").get()?.value ?? null;
console.log(JSON.stringify(out));
