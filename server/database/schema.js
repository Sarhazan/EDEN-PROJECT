const Database = require('better-sqlite3');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', '..', 'maintenance.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
  // Systems table
  db.exec(`
    CREATE TABLE IF NOT EXISTS systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Employees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      position TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      system_id INTEGER,
      employee_id INTEGER,
      frequency TEXT CHECK(frequency IN ('one-time', 'daily', 'weekly', 'biweekly', 'monthly', 'semi-annual', 'annual')) DEFAULT 'one-time',
      start_date DATE NOT NULL,
      start_time TIME NOT NULL,
      priority TEXT CHECK(priority IN ('urgent', 'normal', 'optional')) DEFAULT 'normal',
      status TEXT CHECK(status IN ('draft', 'sent', 'in_progress', 'completed')) DEFAULT 'draft',
      is_recurring BOOLEAN DEFAULT 0,
      parent_task_id INTEGER,
      weekly_days TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `);

  // Add weekly_days column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN weekly_days TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add sent_at column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN sent_at TIMESTAMP`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Update status CHECK constraint to include 'received'
  // SQLite doesn't support ALTER COLUMN for CHECK constraints
  // So we need to check if the constraint needs updating and recreate table if needed
  try {
    const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'`).get();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'received'")) {
      console.log('Migrating tasks table to add "received" status...');

      // Begin transaction
      db.exec('BEGIN TRANSACTION');

      // Create new table with updated constraint
      db.exec(`
        CREATE TABLE tasks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          system_id INTEGER,
          employee_id INTEGER,
          frequency TEXT CHECK(frequency IN ('one-time', 'daily', 'weekly', 'biweekly', 'monthly', 'semi-annual', 'annual')) DEFAULT 'one-time',
          start_date DATE NOT NULL,
          start_time TIME NOT NULL,
          priority TEXT CHECK(priority IN ('urgent', 'normal', 'optional')) DEFAULT 'normal',
          status TEXT CHECK(status IN ('draft', 'sent', 'received', 'in_progress', 'completed')) DEFAULT 'draft',
          is_recurring BOOLEAN DEFAULT 0,
          parent_task_id INTEGER,
          weekly_days TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE SET NULL,
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
          FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
        )
      `);

      // Copy data from old table to new table
      db.exec(`
        INSERT INTO tasks_new (id, title, description, system_id, employee_id, frequency,
                               start_date, start_time, priority, status, is_recurring,
                               parent_task_id, weekly_days, sent_at, created_at, updated_at)
        SELECT id, title, description, system_id, employee_id, frequency,
               start_date, start_time, priority, status, is_recurring,
               parent_task_id, weekly_days, sent_at, created_at, updated_at
        FROM tasks
      `);

      // Drop old table
      db.exec('DROP TABLE tasks');

      // Rename new table to original name
      db.exec('ALTER TABLE tasks_new RENAME TO tasks');

      // Commit transaction
      db.exec('COMMIT');

      console.log('Migration complete: "received" status added to tasks table');
    }
  } catch (e) {
    console.error('Error during status migration:', e);
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback error
    }
  }

  // Locations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image TEXT,
      latitude REAL,
      longitude REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      payment_frequency TEXT CHECK(payment_frequency IN ('one-time', 'monthly', 'quarterly', 'semi-annual', 'annual')),
      next_payment_date DATE,
      payment_amount REAL,
      is_paid BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Task confirmation tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      employee_id INTEGER NOT NULL,
      task_ids TEXT NOT NULL,
      is_acknowledged BOOLEAN DEFAULT 0,
      acknowledged_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables initialized successfully');
}

module.exports = { db, initializeDatabase };
