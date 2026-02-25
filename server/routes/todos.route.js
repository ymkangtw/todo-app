const { Router } = require('express');
const todosCtrl = require('../ctrl/todos.ctrl');

module.exports = (io) => {
  const router = Router();

  const broadcast = (req, event, data) => {
    const socketId = req.headers['x-socket-id'];
    if (socketId) {
      io.sockets.sockets.get(socketId)?.broadcast.emit(event, data);
    } else {
      io.emit(event, data);
    }
  };

  // GET all todos
  router.get('/', (req, res) => {
    res.json(todosCtrl.getAll());
  });

  // POST create todo
  router.post('/', (req, res) => {
    const { title, description, priority } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: '標題不能為空' });
    }
    const created = todosCtrl.create({ title, description, priority });
    broadcast(req, 'todo:created', created);
    res.status(201).json(created);
  });

  // PUT reorder todos (must be before :id route)
  router.put('/reorder', (req, res) => {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '需要陣列格式' });
    }
    todosCtrl.reorder(items);
    broadcast(req, 'todo:reordered', items);
    res.json({ ok: true });
  });

  // PUT update todo
  router.put('/:id', (req, res) => {
    const result = todosCtrl.update(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ error: '找不到此待辦事項' });
    }
    broadcast(req, 'todo:updated', result);
    res.json(result);
  });

  // DELETE todo
  router.delete('/:id', (req, res) => {
    const success = todosCtrl.remove(req.params.id);
    if (!success) {
      return res.status(404).json({ error: '找不到此待辦事項' });
    }
    broadcast(req, 'todo:deleted', req.params.id);
    res.status(204).send();
  });

  return router;
};
