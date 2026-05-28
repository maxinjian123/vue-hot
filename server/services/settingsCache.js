const { Setting } = require('../models');

let cachedSettings = null;
let lastFetchTime = null;
let ioInstance = null;

const CACHE_TTL = 5 * 60 * 1000;

async function loadSettings() {
  try {
    const settings = await Setting.findAll();
    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    cachedSettings = result;
    lastFetchTime = Date.now();
    console.log(`[设置缓存] 加载设置: ${Object.keys(result).length} 项`);
    return result;
  } catch (err) {
    console.error('[设置缓存] 加载设置失败:', err.message);
    return cachedSettings || {};
  }
}

function getSettings() {
  if (!cachedSettings || !lastFetchTime || (Date.now() - lastFetchTime > CACHE_TTL)) {
    console.warn('[设置缓存] 缓存未命中或过期，使用getSettingsAsync()异步加载');
  }
  return cachedSettings || {};
}

async function getSettingsAsync() {
  if (!cachedSettings || !lastFetchTime || (Date.now() - lastFetchTime > CACHE_TTL)) {
    await loadSettings();
  }
  return cachedSettings || {};
}

function getSetting(key, defaultValue) {
  const settings = getSettings();
  const value = settings[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value;
}

function isBrowserNotificationEnabled() {
  const value = getSetting('browser_notification_enabled', 'false');
  return value === 'true';
}

function isEmailEnabled() {
  const value = getSetting('email_enabled', 'false');
  return value === 'true';
}

async function invalidateCache() {
  console.log('[设置缓存] 缓存已失效，正在重新加载...');
  await loadSettings();

  if (ioInstance) {
    ioInstance.emit('settings:updated', cachedSettings);
    console.log('[设置缓存] 已通过 WebSocket 广播设置更新到所有客户端');
  }
}

async function updateSettingAndInvalidate(key, value) {
  try {
    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      throw new Error(`设置 ${key} 未找到`);
    }
    setting.value = String(value);
    await setting.save();
    console.log(`[设置更新] 更新 ${key} = ${value}，缓存已失效`);
    await invalidateCache();
    return setting;
  } catch (err) {
    console.error(`[设置更新失败] 更新 ${key} = ${value} 失败:`, err.message);
    throw err;
  }
}

function setIoInstance(io) {
  ioInstance = io;
  console.log('[SocketIO] 注册用于广播的IO实例');
}

function getIoInstance() {
  return ioInstance;
}

function emitNotification(notificationData) {
  if (ioInstance) {
    ioInstance.emit('notification:new', notificationData);
    console.log(`[SocketIO] 发送通知到所有客户端: "${notificationData.title}"`);
  } else {
    console.warn('[SocketIO] 未注册IO实例，无法发送通知');
  }
}

module.exports = {
  loadSettings,
  getSettings,
  getSettingsAsync,
  getSetting,
  isBrowserNotificationEnabled,
  isEmailEnabled,
  invalidateCache,
  updateSettingAndInvalidate,
  setIoInstance,
  getIoInstance,
  emitNotification,
};
