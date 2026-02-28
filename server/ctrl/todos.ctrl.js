const { sequelize, QueryTypes, withTransaction } = require('../models/db');

const getAll = async () => {
  return sequelize.query(
    'SELECT * FROM todos ORDER BY "sortOrder" ASC',
    { type: QueryTypes.SELECT }
  );
};

const getById = async (id) => {
  const rows = await sequelize.query(
    'SELECT * FROM todos WHERE id = :id',
    { replacements: { id }, type: QueryTypes.SELECT }
  );
  return rows[0] || null;
};

const create = async ({ title, description = '', priority = 'medium' }) => {
  return withTransaction(async (t) => {
    const [maxResult] = await sequelize.query(
      'SELECT COALESCE(MAX("sortOrder"), -1) AS max FROM todos',
      { type: QueryTypes.SELECT, transaction: t }
    );
    const maxOrder = maxResult.max;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const [row] = await sequelize.query(
      `INSERT INTO todos (id, title, description, priority, completed, "createdAt", "sortOrder")
       VALUES (:id, :title, :description, :priority, :completed, :createdAt, :sortOrder)
       RETURNING *`,
      {
        replacements: {
          id, title: title.trim(), description: description.trim(),
          priority, completed: false, createdAt: now, sortOrder: maxOrder + 1,
        },
        type: QueryTypes.SELECT,
        transaction: t,
      }
    );
    return row;
  });
};

const update = async (id, updates) => {
  return withTransaction(async (t) => {
    const rows = await sequelize.query(
      'SELECT * FROM todos WHERE id = :id',
      { replacements: { id }, type: QueryTypes.SELECT, transaction: t }
    );
    if (!rows[0]) return null;

    const sets = [];
    const replacements = { id };

    if (updates.title !== undefined) {
      sets.push('title = :title');
      replacements.title = updates.title;
    }
    if (updates.description !== undefined) {
      sets.push('description = :description');
      replacements.description = updates.description;
    }
    if (updates.priority !== undefined) {
      sets.push('priority = :priority');
      replacements.priority = updates.priority;
    }
    if (updates.completed !== undefined) {
      sets.push('completed = :completed');
      replacements.completed = !!updates.completed;
    }

    if (sets.length === 0) return rows[0];

    const [updated] = await sequelize.query(
      `UPDATE todos SET ${sets.join(', ')} WHERE id = :id RETURNING *`,
      { replacements, type: QueryTypes.SELECT, transaction: t }
    );
    return updated;
  });
};

const remove = async (id) => {
  return withTransaction(async (t) => {
    const [, meta] = await sequelize.query(
      'DELETE FROM todos WHERE id = :id',
      { replacements: { id }, transaction: t }
    );
    return meta.rowCount > 0;
  });
};

const reorder = async (items) => {
  await withTransaction(async (t) => {
    for (const { id, sortOrder } of items) {
      await sequelize.query(
        'UPDATE todos SET "sortOrder" = :sortOrder WHERE id = :id',
        { replacements: { id, sortOrder }, transaction: t }
      );
    }
  });
};

module.exports = { getAll, getById, create, update, remove, reorder };
