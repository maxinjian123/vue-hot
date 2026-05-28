const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Keyword = sequelize.define('Keyword', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  word: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '关键词',
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用',
  },
  crawl_frequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: '采集频率(分钟)，null 表示使用全局默认值',
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '上次检查时间',
  },
}, {
  tableName: 'keywords',
});

module.exports = Keyword;
