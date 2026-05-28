const express = require('express');
const router = express.Router();
const { Sequelize: { Op, fn, col, literal } } = require('sequelize');
const { HotTopic, Keyword, Notification, Setting, TopicSnapshot } = require('../models');
const sequelize = require('../config/database');
const dayjs = require("dayjs");

router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const hoursAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalTopics,
      todayTopics,
      totalKeywords,
      activeKeywords,
      totalNotifications,
      unreadNotifications,
      todayNotifications,
      sourceDistribution,
      importanceDistribution,
      hourlyStats,
      dailyTrend,
      keywordActivity,
      aiAnalysisRate,
      snapshotCount
    ] = await Promise.all([
      HotTopic.count(),
      HotTopic.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      Keyword.count(),
      Keyword.count({ where: { enabled: true } }),
      Notification.count(),
      Notification.count({ where: { is_read: false } }),
      Notification.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      HotTopic.findAll({
        attributes: ['source', [fn('COUNT', col('id')), 'count']],
        group: ['source'],
        raw: true,
      }),
      HotTopic.findAll({
        attributes: ['importance', [fn('COUNT', col('id')), 'count']],
        group: ['importance'],
        raw: true,
      }),
      HotTopic.findAll({
        attributes: [
          [fn('HOUR', col('created_at')), 'hour'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { created_at: { [Op.gte]: hoursAgo24 } },
        group: [fn('HOUR', col('created_at'))],
        order: [[fn('HOUR', col('created_at')), 'ASC']],
        raw: true,
      }),
      HotTopic.findAll({
        attributes: [
          [fn('DATE', col('capture_time')), 'date'],
          [fn('COUNT', col('id')), 'count'],
        ],
        where: { capture_time: { [Op.gte]: sevenDaysAgo } },
        group: [fn('DATE', col('capture_time'))],
        order: [[fn('DATE', col('capture_time')), 'ASC']],
        raw: true,
      }),
      sequelize.query(
        `SELECT k.id, k.word, k.enabled, k.last_checked_at,
                COUNT(ht.id) AS topic_count
         FROM keywords k
         LEFT JOIN hot_topics ht ON ht.keyword_id = k.id
         GROUP BY k.id, k.word, k.enabled, k.last_checked_at
         ORDER BY topic_count DESC
         LIMIT 10`,
        { type: sequelize.QueryTypes.SELECT }
      ),
      Promise.all([
        HotTopic.count({ where: { ai_analysis: { [Op.ne]: null } } }),
        HotTopic.count(),
      ]).then(([analyzed, total]) => ({ analyzed, total })),
      TopicSnapshot.count().catch(() => 0),
    ]);

    const sourceMap = {};
    const sourceLabels = {
      baidu: '百度热搜',
      weibo: '微博热搜',
      bing: 'Bing搜索',
      bilibili: 'B站热门',
      bilibili_search: 'B站搜索',
      sogou: '搜狗搜索',
      so360: '360搜索',
      baidu_search: '百度搜索',
      tencent: '腾讯新闻',
      rss: 'RSS订阅',
      twitter: 'Twitter/X',
      zhihu: '知乎',
      juejin: '掘金',
      csdn: 'CSDN',
      oschina: '开源中国',
    };
    sourceDistribution.forEach(s => {
      sourceMap[s.source] = parseInt(s.count);
    });

    const importanceMap = {};
    for (let i = 1; i <= 10; i++) {
      importanceMap[i] = 0;
    }
    importanceDistribution.forEach(imp => {
      importanceMap[parseInt(imp.importance)] = parseInt(imp.count);
    });

    const hourlyArray = Array(24).fill(0);
    hourlyStats.forEach(h => {
      const hour = parseInt(h.hour);
      if (hour >= 0 && hour < 24) hourlyArray[hour] = parseInt(h.count);
    });

    const dailyArray = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');

      const found = dailyTrend.find(t => {
        return t.date === dateStr
      });
      dailyArray.push({ date: `${date.format('M/D')}/${date.format('M/D')}`, count: found ? parseInt(found.count) : 0 });
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalTopics,
          todayTopics,
          totalKeywords,
          activeKeywords,
          totalNotifications,
          unreadNotifications,
          todayNotifications,
          snapshotCount,
        },
        sourceDistribution: Object.entries(sourceMap).map(([key, value]) => ({
          name: sourceLabels[key] || key,
          value,
        })).sort((a, b) => b.value - a.value),
        importanceDistribution: Object.entries(importanceMap).map(([key, value]) => ({
          importance: parseInt(key),
          count: value,
        })),
        hourlyDistribution: hourlyArray.map((count, hour) => ({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          count,
        })),
        dailyTrend: dailyArray,
        topKeywords: keywordActivity.map(k => ({
          id: k.id,
          word: k.word,
          enabled: !!k.enabled,
          topicCount: parseInt(k.topic_count) || 0,
          lastCheckedAt: k.last_checked_at,
        })),
        aiAnalysisRate: aiAnalysisRate.total > 0
          ? Math.round((aiAnalysisRate.analyzed / aiAnalysisRate.total) * 100)
          : 0,
      },
    });
  } catch (err) {
    console.error('[Dashboard] 获取统计数据失败:', err.message);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

module.exports = router;
