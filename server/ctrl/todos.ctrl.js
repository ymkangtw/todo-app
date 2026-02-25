const db = require('../models/db');

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

const getAll = () => {
  return stmts.getAll.all().map(rowToTodo);
};

const getById = (id) => {
  const row = stmts.getById.get(id);
  return row ? rowToTodo(row) : null;
};

const create = ({ title, description = '', priority = 'medium' }) => {
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
  return rowToTodo(todo);
};

const update = (id, updates) => {
  const existing = stmts.getById.get(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  const data = {
    id: existing.id,
    title: merged.title,
    description: merged.description,
    priority: merged.priority,
    completed: typeof merged.completed === 'boolean' ? (merged.completed ? 1 : 0) : merged.completed,
  };
  stmts.update.run(data);
  return rowToTodo(stmts.getById.get(id));
};

const remove = (id) => {
  const existing = stmts.getById.get(id);
  if (!existing) return false;
  stmts.delete.run(id);
  return true;
};

const reorder = (items) => {
  const run = db.transaction(() => {
    for (const { id, sortOrder } of items) {
      stmts.updateOrder.run({ id, sortOrder });
    }
  });
  run();
};

module.exports = { getAll, getById, create, update, remove, reorder };
