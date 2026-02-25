const path = require('path');
const Database = require('better-sqlite3');

// Initialize SQLite database
const db = new Database(path.join(__dirname, '..', 'todo.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    completed INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  )
`);

// Add sortOrder column if it doesn't exist (compatible with existing data)
try {
  db.exec('ALTER TABLE todos ADD COLUMN sortOrder INTEGER DEFAULT 0');
  const rows = db.prepare('SELECT id FROM todos ORDER BY createdAt ASC').all();
  const backfill = db.prepare('UPDATE todos SET sortOrder = ? WHERE id = ?');
  const backfillAll = db.transaction(() => {
    rows.forEach((row, i) => backfill.run(i, row.id));
  });
  backfillAll();
} catch {
  // Column already exists — ignore
}

module.exports = db;
