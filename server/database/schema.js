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
      status TEXT CHECK(status IN ('draft', 'sent', 'received', 'in_progress', 'pending_approval', 'completed')) DEFAULT 'draft',
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

  // Add acknowledged_at column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN acknowledged_at TIMESTAMP`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add completion_note column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN completion_note TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add estimated_duration_minutes column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN estimated_duration_minutes INTEGER DEFAULT 30`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add completed_at column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Add language column to employees table (migration for Phase 5)
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN language TEXT DEFAULT 'he' CHECK(language IN ('he', 'en', 'ru', 'ar'))`);
    console.log('Added language column to employees table');
  } catch (e) {
    // Column already exists, ignore error
    if (!e.message.includes('duplicate column name')) {
      console.error('Error adding language column:', e.message);
    }
  }

  // Migration: Update status CHECK constraint to include 'received' and 'pending_approval'
  // SQLite doesn't support ALTER COLUMN for CHECK constraints
  // So we need to check if the constraint needs updating and recreate table if needed
  try {
    const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'`).get();
    if (tableInfo && tableInfo.sql && (!tableInfo.sql.includes("'received'") || !tableInfo.sql.includes("'pending_approval'"))) {
      console.log('Migrating tasks table to add "received" and "pending_approval" statuses...');

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
          status TEXT CHECK(status IN ('draft', 'sent', 'received', 'in_progress', 'pending_approval', 'completed')) DEFAULT 'draft',
          is_recurring BOOLEAN DEFAULT 0,
          parent_task_id INTEGER,
          weekly_days TEXT,
          sent_at TIMESTAMP,
          acknowledged_at TIMESTAMP,
          completion_note TEXT,
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
                               parent_task_id, weekly_days, sent_at, acknowledged_at,
                               completion_note, created_at, updated_at)
        SELECT id, title, description, system_id, employee_id, frequency,
               start_date, start_time, priority, status, is_recurring,
               parent_task_id, weekly_days, sent_at, acknowledged_at,
               completion_note, created_at, updated_at
        FROM tasks
      `);

      // Drop old table
      db.exec('DROP TABLE tasks');

      // Rename new table to original name
      db.exec('ALTER TABLE tasks_new RENAME TO tasks');

      // Commit transaction
      db.exec('COMMIT');

      console.log('Migration complete: "received" and "pending_approval" statuses added to tasks table');
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

  // Task attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT CHECK(file_type IN ('image', 'note')) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Add location_id column to systems table (for location filtering)
  try {
    db.exec(`ALTER TABLE systems ADD COLUMN location_id INTEGER REFERENCES locations(id)`);
    console.log('Added location_id column to systems table');
  } catch (e) {
    // Column already exists, skip
    if (!e.message.includes('duplicate column')) {
      throw e;
    }
  }

  // Add time_delta_minutes column to tasks table (for statistics)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN time_delta_minutes INTEGER`);
    console.log('Added time_delta_minutes column to tasks table');
  } catch (e) {
    // Column already exists, skip
    if (!e.message.includes('duplicate column')) {
      throw e;
    }
  }

  // Create composite indexes for history query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_history
    ON tasks(status, completed_at DESC, employee_id, system_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_retention
    ON tasks(status, completed_at)
  `);

  // Enable WAL mode for better concurrency (reads during writes)
  db.pragma('journal_mode = WAL');

  // Increase cache size for better performance (~200MB)
  db.pragma('cache_size = 50000');

  console.log('Database tables initialized successfully');
  console.log('History indexes created successfully');
}

module.exports = { db, initializeDatabase };
