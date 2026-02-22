const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

// Prepared statements
const stmts = {
  getAll: db.prepare('SELECT * FROM todos'),
  getById: db.prepare('SELECT * FROM todos WHERE id = ?'),
  insert: db.prepare('INSERT INTO todos (id, title, description, priority, completed, createdAt) VALUES (@id, @title, @description, @priority, @completed, @createdAt)'),
  update: db.prepare('UPDATE todos SET title = @title, description = @description, priority = @priority, completed = @completed WHERE id = @id'),
  delete: db.prepare('DELETE FROM todos WHERE id = ?'),
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

  const todo = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: title.trim(),
    description: description.trim(),
    priority,
    completed: 0,
    createdAt: new Date().toISOString(),
  };
  stmts.insert.run(todo);
  res.status(201).json(rowToTodo(todo));
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

app.listen(PORT, () => {
  console.log(`✅ 伺服器運行於 http://localhost:${PORT}`);
});
