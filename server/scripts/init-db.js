const { Sequelize } = require('sequelize');
require('dotenv').config();

async function initDatabase() {
  try {
    const dbSeq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: false,
    });

    console.log('[DB] Connecting to MySQL (hot_sentinel)...');
    await dbSeq.authenticate();
    console.log('[DB] Connection established.');

    console.log('[DB] Dropping existing tables...');
    await dbSeq.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await dbSeq.query('SHOW TABLES');
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      console.log(`[DB]   DROP TABLE ${tableName}`);
      await dbSeq.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    await dbSeq.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[DB] All tables dropped.');
    await dbSeq.close();

    const { sequelize, Setting } = require('../models');
    console.log('[DB] Syncing models...');
    await sequelize.sync({ force: false });
    console.log('[DB] Models synced.');

    const defaults = [
      { key: 'email_enabled', value: 'true', description: '是否启用邮件通知' },
      { key: 'email_to', value: '2906594394@qq.com', description: '通知接收邮箱（多个用英文逗号分隔）' },
      { key: 'browser_notification_enabled', value: 'true', description: '是否启用浏览器通知' },
      { key: 'default_crawl_frequency', value: '15', description: '默认采集频率(分钟): 5/15/30' },
      { key: 'deepseek_model', value: 'deepseek-v4-flash', description: 'AI 模型: deepseek-v4-flash / spark-x' },
      { key: 'ai_review_enabled', value: 'true', description: '是否启用 AI 审核(过滤假冒内容)' },
      { key: 'crawl_source_twitter', value: 'true', description: 'Twitter/X 搜索开关' },
      { key: 'crawl_source_bing', value: 'true', description: 'Bing 搜索开关' },
      { key: 'crawl_source_so360', value: 'true', description: '360 搜索开关' },
      { key: 'crawl_source_bilibili_search', value: 'true', description: 'B站搜索开关' },
      { key: 'crawl_source_sogou', value: 'true', description: '搜狗搜索开关' },
      { key: 'crawl_source_baidu_search', value: 'true', description: '百度搜索开关' },
      { key: 'crawl_source_weibo_search', value: 'true', description: '微博搜索开关' },
      { key: 'crawl_source_zhihu', value: 'true', description: '知乎搜索开关' },
      { key: 'crawl_source_juejin', value: 'true', description: '掘金搜索开关' },
      { key: 'crawl_source_csdn', value: 'true', description: 'CSDN搜索开关' },
      { key: 'crawl_source_oschina', value: 'true', description: '开源中国搜索开关' },
    ];

    for (const item of defaults) {
      await Setting.findOrCreate({
        where: { key: item.key },
        defaults: item,
      });
    }

    console.log('[DB] Default settings seeded.');
    console.log('[DB] Database initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('[DB] Initialization failed:', err.message);
    process.exit(1);
  }
}

initDatabase();
