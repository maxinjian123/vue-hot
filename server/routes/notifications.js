const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Notification } = require('../models');

const VALID_SORTS = ['latest', 'importance', 'unread_first'];
const DEFAULT_SORT = 'latest';

function buildOrderClause(sort) {
  switch (sort) {
    case 'importance':
      return [['importance', 'DESC'], ['created_at', 'DESC']];
    case 'unread_first':
      return [['is_read', 'ASC'], ['created_at', 'DESC']];
    case 'latest':
    default:
      return [['created_at', 'DESC']];
  }
}

function buildNotificationWhere(query) {
  const where = {};

  if (query.is_read === 'true') {
    where.is_read = true;
  } else if (query.is_read === 'false') {
    where.is_read = false;
  }

  if (query.source) {
    const sources = query.source.split(',');
    where.source = { [Op.in]: sources };
  }

  if (query.min_importance) {
    where.importance = { [Op.gte]: parseInt(query.min_importance) };
  }

  return where;
}

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, sort } = req.query;

    const effectiveSort = VALID_SORTS.includes(sort) ? sort : DEFAULT_SORT;
    const where = buildNotificationWhere(req.query);
    const order = buildOrderClause(effectiveSort);

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    const unreadCount = await Notification.count({ where: { is_read: false } });

    res.json({
      success: true,
      data: rows,
      total: count,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      sort: effectiveSort,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByPk(id);
    if (!notification) return res.status(404).json({ success: false, error: '通知不存在' });
    notification.is_read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { is_read: false } });
    res.json({ success: true, message: '全部已读' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
