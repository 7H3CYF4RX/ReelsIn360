const path = require('path');
const fs = require('fs');

// sql.js uses WebAssembly — we wrap it in a sync-like API using an in-memory DB
// persisted to disk via Buffer read/write
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '../../data/reelsin360.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db = null;

// Save DB to disk
function persistDb() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[DB] Failed to persist DB:', err.message);
  }
}

// Auto-save every 5 seconds
setInterval(persistDb, 5000);

// Save on process exit
process.on('exit', persistDb);
process.on('SIGINT', () => { persistDb(); process.exit(0); });
process.on('SIGTERM', () => { persistDb(); process.exit(0); });

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing database from disk.');
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database.');
  }

  createTables();
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// Helper: run a query that returns rows as plain objects
function query(sql, params = []) {
  const d = getDb();
  const safeParams = params.map(p => (p === undefined ? null : p));
  const stmt = d.prepare(sql);
  stmt.bind(safeParams);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a mutating query (INSERT/UPDATE/DELETE)
function run(sql, params = []) {
  const d = getDb();
  // sql.js does not accept undefined — coerce to null
  const safeParams = params.map(p => (p === undefined ? null : p));
  d.run(sql, safeParams);
  const result = d.exec('SELECT last_insert_rowid() as id, changes() as changes');
  
  // Persist to disk immediately on mutation to ensure durability
  persistDb();

  if (result.length > 0 && result[0].values.length > 0) {
    return {
      lastInsertRowid: result[0].values[0][0],
      changes: result[0].values[0][1],
    };
  }
  return { lastInsertRowid: 0, changes: 0 };
}

// Helper: get single row
function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function createTables() {
  const d = getDb();

  d.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales',
    avatar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    instagram TEXT,
    package TEXT,
    budget REAL,
    location TEXT,
    source TEXT,
    notes TEXT,
    status TEXT DEFAULT 'new_lead',
    assigned_to INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS lead_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id),
    user_id INTEGER REFERENCES users(id),
    note TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS lead_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id),
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS follow_up_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id),
    user_id INTEGER REFERENCES users(id),
    remind_at TEXT NOT NULL,
    message TEXT,
    done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id),
    client_name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT,
    email TEXT,
    package TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT UNIQUE NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    lead_id INTEGER REFERENCES leads(id),
    package TEXT,
    shoot_date TEXT,
    delivery_date TEXT,
    reels_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    assigned_shooter INTEGER REFERENCES users(id),
    assigned_editor INTEGER REFERENCES users(id),
    assigned_designer INTEGER REFERENCES users(id),
    design_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS project_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    item_key TEXT NOT NULL,
    item_label TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    completed_by INTEGER REFERENCES users(id)
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS project_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    note TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    upload_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS editing_workflow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id),
    status TEXT DEFAULT 'pending',
    updated_by INTEGER REFERENCES users(id),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS client_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id),
    review_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    revision_count INTEGER DEFAULT 0,
    max_revisions INTEGER DEFAULT 1,
    client_feedback TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    delivery_link TEXT NOT NULL,
    delivery_method TEXT NOT NULL,
    notes TEXT,
    delivered_by INTEGER REFERENCES users(id),
    delivered_at TEXT DEFAULT (datetime('now'))
  )`);

  d.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    account_id INTEGER REFERENCES accounts(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  console.log('[DB] All tables verified.');
}

module.exports = { initDb, getDb, query, run, get, persistDb };
