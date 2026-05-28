const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HotTopic = sequelize.define('HotTopic', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  scope: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '热点范围',
  },
  keyword_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联关键词ID',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '热点标题',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '原始内容',
  },
  likes: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '点赞数',
  },
  comments: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '评论数',
  },
  views: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '查看数',
  },
  video_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: '视频链接',
  },
  image_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: '图片链接',
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI 生成的摘要',
  },
  importance: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: '重要性评分 1-10',
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '数据源',
  },
  source_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: '原文链接',
  },
  raw_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '原始爬虫数据（完整保留）',
  },
  ai_analysis: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'AI 分析结果',
  },
  capture_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '抓取时间',
  },
  publish_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '帖子原始发布时间',
  },
  is_notified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已通知',
  },

  tweet_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Twitter 推文ID',
  },
  retweet_count: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Twitter 转发数',
  },
  quote_count: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Twitter 引用数',
  },
  bookmark_count: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: 'Twitter 书签数',
  },
  tweet_created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '推文发布时间',
  },
  tweet_lang: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: '推文语言',
  },
  is_reply: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否是回复推文',
  },
  in_reply_to_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '回复的目标推文ID',
  },
  conversation_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '对话ID',
  },
  is_limited_reply: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否限制回复',
  },
  author_user_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '推文作者 @用户名',
  },
  author_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '推文作者显示名',
  },
  author_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '推文作者ID',
  },
  author_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '作者是否蓝V认证',
  },
  author_verified_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '作者认证类型',
  },
  author_followers: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '作者粉丝数',
  },
  author_following: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '作者关注数',
  },
  author_profile_picture: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: '作者头像URL',
  },
  author_cover_picture: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: '作者封面图URL',
  },
  author_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '作者简介',
  },
  author_location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '作者所在地',
  },
  author_created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '作者账号创建时间',
  },
  author_favourites_count: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '作者收藏数',
  },
  author_statuses_count: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '作者发推数',
  },
  author_media_count: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '作者媒体数',
  },
  is_possibly_sensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否可能包含敏感内容',
  },
}, {
  tableName: 'hot_topics',
  indexes: [
    { fields: ['tweet_id'] },
    { fields: ['author_user_name'] },
    { fields: ['conversation_id'] },
    { fields: ['scope'] },
    { fields: ['keyword_id'] },
    { fields: ['source'] },
    { fields: ['created_at'] },
  ],
});

module.exports = HotTopic;
