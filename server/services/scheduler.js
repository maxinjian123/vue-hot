const cron = require('node-cron');
const { Keyword, Setting } = require('../models');
const crawler = require('./crawler');
const aiAnalyzer = require('./aiAnalyzer');
const emailNotifier = require('./emailNotifier');
const browserNotifier = require('./browserNotifier');
const { Notification, HotTopic, TopicSnapshot } = require('../models');

let cronJobs = [];

async function getDefaultFrequency() {
  const setting = await Setting.findOne({ where: { key: 'default_crawl_frequency' } });
  return parseInt(setting?.value || '15');
}

function resolveFrequency(keyword, defaultFreq) {
  const val = keyword.crawl_frequency;
  if (val === null || val === undefined || val === '') {
    return defaultFreq;
  }
  return parseInt(val) || defaultFreq;
}

function resolvePublishTime(item) {
  if (item.publish_time) return new Date(item.publish_time);
  if (item.tweet_created_at) return new Date(item.tweet_created_at);
  if (item.raw?.pub_date) return new Date(item.raw.pub_date);
  if (item.raw?.pubdate) {
    const ts = parseInt(item.raw.pubdate);
    if (!isNaN(ts)) return ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    return new Date(item.raw.pubdate);
  }
  if (item.raw?.onboard_time) return new Date(item.raw.onboard_time * 1000);
  if (item.raw?.timestamp) return new Date(item.raw.timestamp * 1000);
  if (item.raw?.createdAt) return new Date(item.raw.createdAt);
  return null;
}

async function runKeywordCheck(keyword) {
  console.log(`[Scheduler] 检查关键词: ${keyword.word}`);

  const newTopics = [];

  try {
    const results = await crawler.searchKeywordSources(keyword.word);
    if (!results || results.length === 0) {
      console.log(`[Scheduler] 关键词 ${keyword.word} 没有搜索结果`);
      return newTopics;
    }

    const aiSetting = await Setting.findOne({ where: { key: 'ai_review_enabled' } });
    const aiEnabled = aiSetting?.value === 'true';

    const captureTime = new Date()

    let analyzedResults = results;
    if (aiEnabled) {
      analyzedResults = await aiAnalyzer.analyzeKeywordResults(keyword.word, results);
    }

    for (const item of analyzedResults) {
      if (item.isRelevant !== false) {
        const aiTitle = item.shortTitle || item.title || ''
        const existing = await HotTopic.findOne({
          where: { title: aiTitle, keyword_id: keyword.id },
        });
        if (existing) continue;

        const scopeFromAI = item.scopeValue || (item.scopeTags && item.scopeTags.length > 0 ? item.scopeTags.join(',') : null)
        const finalScope = scopeFromAI || keyword.word

        const topic = await HotTopic.create({
          keyword_id: keyword.id,
          scope: finalScope,
          title: aiTitle,
          content: item.content,
          likes: item.likes || 0,
          comments: item.comments || 0,
          views: item.views || 0,
          video_url: item.video_url || null,
          image_url: item.image_url || null,
          summary: item.summary || '',
          importance: item.importance || 5,
          source: item.source,
          source_url: item.url || '',
          raw_data: item.raw || null,
          ai_analysis: item.aiAnalysis || null,
          capture_time: item.captureTime || captureTime,

          publish_time: resolvePublishTime(item),
          tweet_id: item.tweet_id || null,
          retweet_count: item.retweet_count || 0,
          quote_count: item.quote_count || 0,
          bookmark_count: item.bookmark_count || 0,
          tweet_created_at: item.tweet_created_at || null,
          tweet_lang: item.tweet_lang || null,
          is_reply: item.is_reply || false,
          in_reply_to_id: item.in_reply_to_id || null,
          conversation_id: item.conversation_id || null,
          is_limited_reply: item.is_limited_reply || false,

          author_user_name: item.author_user_name || null,
          author_name: item.author_name || null,
          author_id: item.author_id || null,
          author_verified: item.author_verified || false,
          author_verified_type: item.author_verified_type || null,
          author_followers: item.author_followers || 0,
          author_following: item.author_following || 0,
          author_profile_picture: item.author_profile_picture || null,
          author_cover_picture: item.author_cover_picture || null,
          author_description: item.author_description || null,
          author_location: item.author_location || null,
          author_created_at: item.author_created_at || null,
          author_favourites_count: item.author_favourites_count || 0,
          author_statuses_count: item.author_statuses_count || 0,
          author_media_count: item.author_media_count || 0,
          is_possibly_sensitive: item.is_possibly_sensitive || false,
        });

        await Notification.create({
          topic_id: topic.id,
          keyword_id: keyword.id,
          title: `[监控] ${keyword.word}: ${item.title}`,
          content: item.summary || item.title,
          source: item.source,
          source_url: item.url || '',
          importance: item.importance || 5,
          publish_time: resolvePublishTime(item),
        });

        await browserNotifier.sendBrowserNotification({
          id: topic.id,
          title: item.title,
          content: item.summary || item.title,
          source: item.source,
          importance: item.importance || 5,
          source_url: item.url || '',
        });

        newTopics.push({
          keyword: keyword.word,
          topic: topic.toJSON(),
        });
      }
    }

    keyword.last_checked_at = new Date();
    await keyword.save();

    try {
      const existingTopics = await HotTopic.findAll({
        where: { keyword_id: keyword.id },
        attributes: ['id', 'likes', 'comments', 'views', 'importance'],
        limit: 200,
      });
      const snapshotTime = new Date();
      for (const t of existingTopics) {
        await TopicSnapshot.create({
          topic_id: t.id,
          snapshot_time: snapshotTime,
          likes: t.likes || 0,
          comments: t.comments || 0,
          views: t.views || 0,
          importance: t.importance || 5,
        });
      }
      if (existingTopics.length > 0) {
        console.log(`[Scheduler] 已为关键词 "${keyword.word}" 创建 ${existingTopics.length} 条快照`);
      }
    } catch (snapErr) {
      console.error(`[Scheduler] 创建快照失败 (${keyword.word}):`, snapErr.message);
    }

    if (newTopics.length > 0) {
      console.log(`[Scheduler] 关键字 "${keyword.word}" 检查完成，发现 ${newTopics.length} 个新热点`);
    } else {
      console.log(`[Scheduler] 关键字 "${keyword.word}" 检查完成，无新热点`);
    }

    return newTopics;
  } catch (err) {
    console.error(`[Scheduler] 检查关键字 "${keyword.word}" 时出错:`, err.message);
    return newTopics;
  }
}

async function runAllChecks() {
  const keywords = await Keyword.findAll({ where: { enabled: true } });
  if (keywords.length === 0) {
    console.log('[Scheduler] 没有可执行的关键字');
    return;
  }

  const allNewTopics = [];

  for (const kw of keywords) {
    const topics = await runKeywordCheck(kw);
    allNewTopics.push(...topics);
  }

  if (allNewTopics.length > 0) {
    try {
      await emailNotifier.sendBatchAlerts(allNewTopics);
    } catch (emailErr) {
      console.error('[Scheduler] 批量邮件发送失败:', emailErr.message);
    }
  }
}

async function start() {
  console.log('[Scheduler] 开始启动调度器...');
  cronJobs.forEach((job) => job.stop());
  cronJobs = [];

  const keywords = await Keyword.findAll({ where: { enabled: true } });
  const defaultFreq = await getDefaultFrequency();

  if (keywords.length === 0) {
    console.log('[Scheduler] 没有可执行的关键字，等待关键词启用后自动开始');
    const cronExpr = `*/${defaultFreq} * * * *`;
    const job = cron.schedule(cronExpr, async () => {
      console.log(`[Scheduler] 运行默认 ${defaultFreq}min检查...`);
      const kws = await Keyword.findAll({ where: { enabled: true } });
      if (kws.length === 0) {
        console.log('[Scheduler] 没有可执行的关键字');
        return;
      }

      const allNewTopics = [];
      for (const kw of kws) {
        const topics = await runKeywordCheck(kw);
        allNewTopics.push(...topics);
      }

      if (allNewTopics.length > 0) {
        try {
          await emailNotifier.sendBatchAlerts(allNewTopics);
        } catch (emailErr) {
          console.error('[Scheduler] 批量邮件发送失败:', emailErr.message);
        }
      }
    });
    cronJobs.push(job);
    console.log(`[Scheduler] 注册默认 ${defaultFreq}min检查: ${cronExpr}`);
    return;
  }

  const trackedFrequencies = new Set();
  keywords.forEach((kw) => {
    const freq = resolveFrequency(kw, defaultFreq);
    trackedFrequencies.add(freq);
  });

  for (const freq of trackedFrequencies) {
    const cronExpr = `*/${freq} * * * *`;
    const job = cron.schedule(cronExpr, async () => {
      console.log(`[Scheduler] 运行 ${freq} 分钟周期...`);
      const kws = await Keyword.findAll({ where: { enabled: true } });
      if (kws.length === 0) {
        console.log('[Scheduler] 没有可执行的关键字');
        return;
      }

      const allNewTopics = [];
      for (const kw of kws) {
        const kwFreq = resolveFrequency(kw, defaultFreq);
        if (kwFreq === freq) {
          const topics = await runKeywordCheck(kw);
          allNewTopics.push(...topics);
        }
      }

      if (allNewTopics.length > 0) {
        try {
          await emailNotifier.sendBatchAlerts(allNewTopics);
        } catch (emailErr) {
          console.error('[Scheduler] 批量邮件发送失败:', emailErr.message);
        }
      }
    });
    cronJobs.push(job);
    console.log(`[Scheduler] 注册 ${freq}min检查: ${cronExpr}`);
  }

  console.log('[Scheduler] 运行初始检查...');
  runAllChecks();
}

function stop() {
  cronJobs.forEach((job) => job.stop());
  cronJobs = [];
}

module.exports = { start, stop, runAllChecks };
