const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '配置键',
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '配置值',
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '配置说明',
  },
}, {
  tableName: 'settings',
});

module.exports = Setting;
