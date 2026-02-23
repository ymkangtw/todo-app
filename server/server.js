const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../client/dist')));

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'todo.db'));
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
  // Backfill existing rows with ascending order based on creation time
  const rows = db.prepare('SELECT id FROM todos ORDER BY createdAt ASC').all();
  const backfill = db.prepare('UPDATE todos SET sortOrder = ? WHERE id = ?');
  const backfillAll = db.transaction(() => {
    rows.forEach((row, i) => backfill.run(i, row.id));
  });
  backfillAll();
} catch {
  // Column already exists — ignore
}

// Prepared statements
const stmts = {
  getAll: db.prepare('SELECT * FROM todos ORDER BY sortOrder ASC'),
  getById: db.prepare('SELECT * FROM todos WHERE id = ?'),
  insert: db.prepare('INSERT INTO todos (id, title, description, priority, completed, createdAt, sortOrder) VALUES (@id, @title, @description, @priority, @completed, @createdAt, @sortOrder)'),
  update: db.prepare('UPDATE todos SET title = @title, description = @description, priority = @priority, completed = @completed WHERE id = @id'),
  delete: db.prepare('DELETE FROM todos WHERE id = ?'),
  maxSortOrder: db.prepare('SELECT COALESCE(MAX(sortOrder), -1) AS maxOrder FROM todos'),
  updateOrder: db.prepare('UPDATE todos SET sortOrder = @sortOrder WHERE id = @id'),
};

const rowToTodo = (row) => ({ ...row, completed: !!row.completed });

// GET all todos
app.get('/api/todos', (req, res) => {
  const rows = stmts.getAll.all();
  res.json(rows.map(rowToTodo));
});

// POST create todo
app.post('/api/todos', (req, res) => {
  const { title, description = '', priority = 'medium' } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '標題不能為空' });
  }

  const maxOrder = stmts.maxSortOrder.get().maxOrder;
  const todo = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: title.trim(),
    description: description.trim(),
    priority,
    completed: 0,
    createdAt: new Date().toISOString(),
    sortOrder: maxOrder + 1,
  };
  stmts.insert.run(todo);
  res.status(201).json(rowToTodo(todo));
});

// PUT reorder todos (must be before :id route)
app.put('/api/todos/reorder', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: '需要陣列格式' });
  }
  const reorder = db.transaction(() => {
    for (const { id, sortOrder } of items) {
      stmts.updateOrder.run({ id, sortOrder });
    }
  });
  reorder();
  res.json({ ok: true });
});

// PUT update todo
app.put('/api/todos/:id', (req, res) => {
  const existing = stmts.getById.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '找不到此待辦事項' });
  }
  const merged = { ...existing, ...req.body };
  const updated = {
    id: existing.id,
    title: merged.title,
    description: merged.description,
    priority: merged.priority,
    completed: typeof merged.completed === 'boolean' ? (merged.completed ? 1 : 0) : merged.completed,
  };
  stmts.update.run(updated);
  res.json(rowToTodo(stmts.getById.get(existing.id)));
});

// DELETE todo
app.delete('/api/todos/:id', (req, res) => {
  const existing = stmts.getById.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '找不到此待辦事項' });
  }
  stmts.delete.run(req.params.id);
  res.status(204).send();
});

// SPA fallback: non-API requests serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ 伺服器運行於 http://localhost:${PORT}`);
});
