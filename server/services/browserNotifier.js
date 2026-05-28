const settingsCache = require('./settingsCache');

function isBrowserNotificationEnabled() {
  return settingsCache.isBrowserNotificationEnabled();
}

async function sendBrowserNotification(notificationData) {
  if (!isBrowserNotificationEnabled()) {
    console.log('[BrowserNotif]浏览器通知禁用，跳过');
    return false;
  }

  const payload = {
    id: notificationData.id,
    title: notificationData.title,
    content: notificationData.content,
    source: notificationData.source,
    importance: notificationData.importance,
    source_url: notificationData.source_url,
    created_at: new Date().toISOString(),
    type: 'hot_topic_alert',
  };

  try {
    settingsCache.emitNotification(payload);
    console.log(`[BrowserNotif]通过WebSocket发送: "${notificationData.title}"`);
    return true;
  } catch (err) {
    console.error('[BrowserNotif]通过WebSocket发送通知失败:', err.message);
    return false;
  }
}

module.exports = { isBrowserNotificationEnabled, sendBrowserNotification };
