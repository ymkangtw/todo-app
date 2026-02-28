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
  router.get('/', async (req, res) => {
    try {
      res.json(await todosCtrl.getAll());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create todo
  router.post('/', async (req, res) => {
    const { title, description, priority } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: '標題不能為空' });
    }
    try {
      const created = await todosCtrl.create({ title, description, priority });
      broadcast(req, 'todo:created', created);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT reorder todos (must be before :id route)
  router.put('/reorder', async (req, res) => {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '需要陣列格式' });
    }
    try {
      await todosCtrl.reorder(items);
      broadcast(req, 'todo:reordered', items);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update todo
  router.put('/:id', async (req, res) => {
    try {
      const result = await todosCtrl.update(req.params.id, req.body);
      if (!result) {
        return res.status(404).json({ error: '找不到此待辦事項' });
      }
      broadcast(req, 'todo:updated', result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE todo
  router.delete('/:id', async (req, res) => {
    try {
      const success = await todosCtrl.remove(req.params.id);
      if (!success) {
        return res.status(404).json({ error: '找不到此待辦事項' });
      }
      broadcast(req, 'todo:deleted', req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
