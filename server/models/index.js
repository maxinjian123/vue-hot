const sequelize = require('../config/database');
const Keyword = require('./Keyword');
const HotTopic = require('./HotTopic');
const Notification = require('./Notification');
const Setting = require('./Setting');
const TopicSnapshot = require('./TopicSnapshot');

HotTopic.belongsTo(Keyword, { foreignKey: 'keyword_id', as: 'keyword' });
Notification.belongsTo(HotTopic, { foreignKey: 'topic_id', as: 'topic' });
Notification.belongsTo(Keyword, { foreignKey: 'keyword_id', as: 'keyword' });
TopicSnapshot.belongsTo(HotTopic, { foreignKey: 'topic_id', as: 'topic' });

module.exports = {
  sequelize,
  Keyword,
  HotTopic,
  Notification,
  Setting,
  TopicSnapshot,
};
