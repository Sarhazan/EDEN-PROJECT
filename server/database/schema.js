const Database = require('better-sqlite3');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', '..', 'maintenance.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function createIndexIfNotExists(indexName, tableName, columnsSql) {
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columnsSql})`);
}

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
      manager_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
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

  // Add manager_id to employees table (MVP manager support: employees can manage other employees)
  // Non-breaking: nullable column; existing rows remain valid.
  if (!hasColumn('employees', 'manager_id')) {
    db.exec(`ALTER TABLE employees ADD COLUMN manager_id INTEGER REFERENCES employees(id)`);
    console.log('Added manager_id column to employees table');
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

  // Add location_id column to tasks table (optional location linking)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN location_id INTEGER REFERENCES locations(id)`);
    console.log('Added location_id column to tasks table');
  } catch (e) {
    // Column already exists, skip
    if (!e.message.includes('duplicate column')) {
      throw e;
    }
  }

  // Add original_language column if it doesn't exist (migration for Phase 5 note translation)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN original_language TEXT CHECK(original_language IN ('he', 'en', 'ru', 'ar'))`);
    console.log('✓ Added original_language column to tasks table');
  } catch (e) {
    // Column already exists, ignore error
    if (!e.message.includes('duplicate column name')) {
      console.error('Error adding original_language column:', e.message);
    }
  }

  // Add translation_provider column to track which API was used (migration for Phase 5)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN translation_provider TEXT CHECK(translation_provider IN ('gemini', 'google-translate', 'none'))`);
    console.log('✓ Added translation_provider column to tasks table');
  } catch (e) {
    // Column already exists, ignore error
    if (!e.message.includes('duplicate column name')) {
      console.error('Error adding translation_provider column:', e.message);
    }
  }

  // Add is_starred column for task prioritization (migration for Phase 1)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT 0`);
    console.log('Added is_starred column to tasks table');
  } catch (e) {
    // Column already exists, ignore error
    if (!e.message.includes('duplicate column name')) {
      console.error('Error adding is_starred column:', e.message);
    }
  }

  // Buildings table (maintenance buildings/structures)
  db.exec(`
    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add building_id column to tasks table (optional building linking)
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN building_id INTEGER REFERENCES buildings(id)`);
    console.log('Added building_id column to tasks table');
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      throw e;
    }
  }

  // HQ distribution lists
  db.exec(`
    CREATE TABLE IF NOT EXISTS distribution_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS distribution_list_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES distribution_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(list_id, employee_id)
    )
  `);

  // Forms hub: building branding/contracts + site interactive form dispatches
  db.exec(`
    CREATE TABLE IF NOT EXISTS building_branding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL UNIQUE,
      logo_path TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS building_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS form_dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_key TEXT NOT NULL,
      recipient_type TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_contact TEXT,
      payload_json TEXT,
      status TEXT DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table for external service configurations (API keys, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for HQ dashboard/history query performance
  // Completed/history paths
  createIndexIfNotExists('idx_tasks_history', 'tasks', 'status, completed_at DESC, employee_id, system_id');
  createIndexIfNotExists('idx_tasks_retention', 'tasks', 'status, completed_at');
  createIndexIfNotExists('idx_tasks_employee_status_completed_at', 'tasks', 'employee_id, status, completed_at DESC');
  createIndexIfNotExists('idx_tasks_system_status_completed_at', 'tasks', 'system_id, status, completed_at DESC');
  createIndexIfNotExists('idx_tasks_location_status_completed_at', 'tasks', 'location_id, status, completed_at DESC');
  createIndexIfNotExists('idx_tasks_building_status_completed_at', 'tasks', 'building_id, status, completed_at DESC');

  // Active dashboard paths (today/pending/in-progress)
  createIndexIfNotExists('idx_tasks_status_start_date_start_time', 'tasks', 'status, start_date, start_time');

  // Join/filter helpers
  createIndexIfNotExists('idx_systems_location_id', 'systems', 'location_id');
  createIndexIfNotExists('idx_employees_manager_id', 'employees', 'manager_id');
  createIndexIfNotExists('idx_distribution_list_members_list_id', 'distribution_list_members', 'list_id');
  createIndexIfNotExists('idx_distribution_list_members_employee_id', 'distribution_list_members', 'employee_id');
  createIndexIfNotExists('idx_building_contracts_building_id', 'building_contracts', 'building_id');
  createIndexIfNotExists('idx_form_dispatches_created_at', 'form_dispatches', 'created_at DESC');

  // Enable WAL mode for better concurrency (reads during writes)
  db.pragma('journal_mode = WAL');

  // Increase cache size for better performance (~200MB)
  db.pragma('cache_size = 50000');

  console.log('Database tables initialized successfully');
  console.log('History indexes created successfully');
}

// Check if database needs seeding (for Railway/cloud deployments)
// DISABLED BY DEFAULT - only seed if ALLOW_DEMO_SEED=true is explicitly set
function checkAndSeedDatabase() {
  // Only seed if explicitly allowed via environment variable
  // Set ALLOW_DEMO_SEED=true in EDEN-TEST, leave unset in EDEN-PRODUCTION
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    console.log('Demo seeding disabled (ALLOW_DEMO_SEED not set)');
    return false;
  }

  const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get();
  if (employeeCount.count === 0) {
    console.log('Database is empty, seeding with demo data...');
    const { seedDatabase } = require('./seed');
    seedDatabase();
    return true;
  }
  return false;
}

module.exports = { db, initializeDatabase, checkAndSeedDatabase };
