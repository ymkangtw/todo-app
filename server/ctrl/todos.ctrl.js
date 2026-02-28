const { Todo, withTransaction } = require('../models/db');

const getAll = async () => {
  return Todo.findAll({ order: [['sortOrder', 'ASC']] });
};

const getById = async (id) => {
  return Todo.findByPk(id);
};

const create = async ({ title, description = '', priority = 'medium' }) => {
  return withTransaction(async (t) => {
    const maxResult = await Todo.max('sortOrder', { transaction: t });
    const maxOrder = maxResult ?? -1;

    const todo = await Todo.create({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description.trim(),
      priority,
      completed: false,
      createdAt: new Date(),
      sortOrder: maxOrder + 1,
    }, { transaction: t });

    return todo;
  });
};

const update = async (id, updates) => {
  return withTransaction(async (t) => {
    const existing = await Todo.findByPk(id, { transaction: t });
    if (!existing) return null;

    const fields = {};
    if (updates.title !== undefined) fields.title = updates.title;
    if (updates.description !== undefined) fields.description = updates.description;
    if (updates.priority !== undefined) fields.priority = updates.priority;
    if (updates.completed !== undefined) fields.completed = !!updates.completed;

    await existing.update(fields, { transaction: t });
    return existing;
  });
};

const remove = async (id) => {
  return withTransaction(async (t) => {
    const existing = await Todo.findByPk(id, { transaction: t });
    if (!existing) return false;
    await existing.destroy({ transaction: t });
    return true;
  });
};

const reorder = async (items) => {
  await withTransaction(async (t) => {
    for (const { id, sortOrder } of items) {
      await Todo.update({ sortOrder }, { where: { id }, transaction: t });
    }
  });
};

module.exports = { getAll, getById, create, update, remove, reorder };
