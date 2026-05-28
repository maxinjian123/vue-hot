const express = require('express');
const router = express.Router();
const { Op, literal } = require('sequelize');
const { HotTopic, Keyword, TopicSnapshot } = require('../models');

const VALID_SORTS = ['latest', 'importance', 'heat', 'tweet_heat', 'smart'];
const DEFAULT_SORT = 'latest';

function buildOrderClause(sort) {
  switch (sort) {
    case 'importance':
      return [['importance', 'DESC'], ['created_at', 'DESC']];
    case 'heat':
      return [
        [literal('(likes + comments * 2 + views * 0.1)'), 'DESC'],
        ['created_at', 'DESC'],
      ];
    case 'tweet_heat':
      return [
        [literal('(likes + retweet_count * 2)'), 'DESC'],
        ['created_at', 'DESC'],
      ];
    case 'smart':
      return [
        [literal('(importance * 3 + LN(GREATEST(likes + 1, 1)) * 2 + LN(GREATEST(comments + 1, 1)) * 1 + (24 - LEAST(TIMESTAMPDIFF(HOUR, COALESCE(tweet_created_at, capture_time), NOW()), 24)) / 24)'), 'DESC'],
        ['capture_time', 'DESC'],
      ];
    case 'latest':
    default:
      return [['capture_time', 'DESC']];
  }
}

function buildTopicWhere(query) {
  const where = {};

  if (query.keyword) {
    const keyword = query.keyword.trim();
    where[Op.or] = [
      { scope: { [Op.like]: `%${keyword}%` } },
      { title: { [Op.like]: `%${keyword}%` } },
      { content: { [Op.like]: `%${keyword}%` } },
      { summary: { [Op.like]: `%${keyword}%` } },
      { id: { [Op.eq]: keyword } },
    ];
  }

  if (query.scope && !query.keyword) {
    where.scope = { [Op.like]: `%${query.scope}%` };
  }

  if (query.keyword_id) {
    where.keyword_id = parseInt(query.keyword_id);
  }

  if (query.source) {
    const sources = query.source.split(',');
    where.source = { [Op.in]: sources };
  }

  if (query.min_importance) {
    where.importance = { [Op.gte]: parseInt(query.min_importance) };
  }

  if (query.min_likes) {
    where.likes = { [Op.gte]: parseInt(query.min_likes) };
  }

  if (query.min_comments) {
    where.comments = { [Op.gte]: parseInt(query.min_comments) };
  }

  if (query.min_views) {
    where.views = { [Op.gte]: parseInt(query.min_views) };
  }

  if (query.author_verified === 'true') {
    where.author_verified = true;
  }

  if (query.has_image === 'true') {
    where.image_url = { [Op.ne]: null };
  }

  if (query.has_video === 'true') {
    where.video_url = { [Op.ne]: null };
  }

  if (query.has_link === 'true') {
    where.source_url = { [Op.ne]: null };
  }

  return where;
}

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort } = req.query;

    const effectiveSort = VALID_SORTS.includes(sort) ? sort : DEFAULT_SORT;
    const where = buildTopicWhere(req.query);
    const order = buildOrderClause(effectiveSort);

    const { count, rows } = await HotTopic.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      include: [
        { model: Keyword, as: 'keyword', attributes: ['word', 'id'] },
      ],
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      sort: effectiveSort,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/trend', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;

    const topic = await HotTopic.findByPk(id);
    if (!topic) return res.status(404).json({ success: false, message: '热点不存在' });

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const snapshots = await TopicSnapshot.findAll({
      where: { topic_id: parseInt(id), snapshot_time: { [Op.gte]: since } },
      order: [['snapshot_time', 'ASC']],
      raw: true,
    });

    const currentData = {
      likes: topic.likes || 0,
      comments: topic.comments || 0,
      views: topic.views || 0,
      importance: topic.importance || 5,
      snapshot_time: new Date(),
    };

    const allDataPoints = [...snapshots, currentData];

    let trendDirection = 'stable';
    let trendPercent = 0;
    if (allDataPoints.length >= 2) {
      const first = allDataPoints[0];
      const last = allDataPoints[allDataPoints.length - 1];
      const totalEngagement = (first.likes || 0) + (first.comments * 2 || 0) + (first.views * 0.01 || 0);
      const currentEngagement = (last.likes || 0) + (last.comments * 2 || 0) + (last.views * 0.01 || 0);
      if (totalEngagement > 0) {
        trendPercent = Math.round(((currentEngagement - totalEngagement) / totalEngagement) * 100);
        if (trendPercent > 10) trendDirection = 'rising';
        else if (trendPercent < -10) trendDirection = 'falling';
        else trendDirection = 'stable';
      }
    }

    res.json({
      success: true,
      data: {
        topicId: parseInt(id),
        trendDirection,
        trendPercent,
        snapshotCount: snapshots.length,
        days: parseInt(days),
        snapshots: allDataPoints.map(s => ({
          time: s.snapshot_time,
          likes: s.likes || 0,
          comments: s.comments || 0,
          views: s.views || 0,
          importance: s.importance || 5,
        })),
      },
    });
  } catch (err) {
    console.error('[HotTopics] 获取趋势数据失败:', err.message);
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

module.exports = router;
