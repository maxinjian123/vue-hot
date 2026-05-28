const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  topic_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联热点ID',
  },
  keyword_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联关键词ID',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '通知标题',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '通知内容',
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '数据源',
  },
  source_url: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: '原文链接',
  },
  importance: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: '重要性评分',
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已读',
  },
  publish_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '帖子原始发布时间',
  },
}, {
  tableName: 'notifications',
});

module.exports = Notification;
