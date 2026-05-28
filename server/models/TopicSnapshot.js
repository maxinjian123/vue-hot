const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TopicSnapshot = sequelize.define('TopicSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  topic_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联热点ID',
  },
  snapshot_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '快照时间',
  },
  likes: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '当时点赞数',
  },
  comments: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '当时评论数',
  },
  views: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    comment: '当时浏览量',
  },
  importance: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    comment: '当时重要性评分',
  },
}, {
  tableName: 'topic_snapshots',
  timestamps: false,
  indexes: [
    { fields: ['topic_id'] },
    { fields: ['snapshot_time'] },
    { fields: ['topic_id', 'snapshot_time'] },
  ],
});

module.exports = TopicSnapshot;
