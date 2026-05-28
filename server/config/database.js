const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('hot_sentinel', 'root', 'root', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
