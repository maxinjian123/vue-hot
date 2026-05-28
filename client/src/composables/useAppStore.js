import { io } from 'socket.io-client'
import { reactive, ref } from 'vue'
import { checkHealth, getNotifications } from '../api/index.js'

const online = ref(false)
const toastMessage = ref('')
const currentTime = ref('')
const unreadCount = ref(0)
const socketConnected = ref(false)
const browserNotifEnabled = ref(false)

const detailModal = reactive({ visible: false, topic: null })
const previewMedia = reactive({ visible: false, url: '', title: '' })

let toastTimer = null
let clockTimer = null
let healthTimer = null
let socket = null

export function useAppStore() {
  const sources = [
    { id: 'twitter', name: 'X (Twitter)', label: 'Global' },
    { id: 'bing', name: 'Bing 搜索', label: 'Search' },
    { id: 'so360', name: '360 搜索', label: 'Search' },
    { id: 'bilibili_search', name: 'B站 搜索', label: 'Video' },
    { id: 'baidu_search', name: '百度 搜索', label: 'Search' },
    { id: 'weibo_search', name: '微博 搜索', label: 'Social' },
    { id: 'sogou', name: '搜狗搜索', label: 'Search' },
    { id: 'zhihu', name: '知乎搜索', label: 'Social' },
    { id: 'juejin', name: '掘金搜索', label: 'Tech' },
    { id: 'csdn', name: 'CSDN搜索', label: 'Tech' },
    { id: 'oschina', name: '开源中国', label: 'Tech' },
    { id: 'baidu', name: '百度热搜', label: 'Hot' },
    { id: 'weibo', name: '微博热搜', label: 'Hot' },
    { id: 'bilibili', name: 'B站热搜', label: 'Hot' },
    { id: 'tencent', name: '腾讯新闻', label: 'News' },
    { id: 'rss', name: 'RSS 订阅', label: 'Feed' }
  ]

  function showToast(msg) {
    toastMessage.value = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastMessage.value = ''
    }, 3000)
  }

  function requestBrowserNotification() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function sendBrowserNotification(title, body) {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛰️</text></svg>',
        tag: 'hot-sentinel'
      })
    } catch (e) {
      /* ignore */
    }
  }

  function handleRealtimeNotification(data) {
    console.log('[SocketIO] 收到实时通知:', data)

    sendBrowserNotification('🔔 热点哨兵 - 新通知', data.title || '发现新内容')

    unreadCount.value++

    showToast(`📢 ${data.title || '收到新通知'}`)

    window.dispatchEvent(new CustomEvent('notification:new', { detail: data }))
  }

  function connectSocket() {
    const serverUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:3000`

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socket.on('connect', () => {
      console.log(`[SocketIO] 已连接到服务器: ${socket.id}`)
      socketConnected.value = true
    })

    socket.on('disconnect', (reason) => {
      console.log(`[SocketIO] 已断开连接: ${reason}`)
      socketConnected.value = false
    })

    socket.on('connect_error', (error) => {
      console.error('[SocketIO] 连接错误:', error.message)
      socketConnected.value = false
    })

    socket.on('notification:new', (data) => {
      if (browserNotifEnabled.value) {
        handleRealtimeNotification(data)
      }
    })

    socket.on('settings:current', (settings) => {
      console.log('[SocketIO] 收到当前设置')
      browserNotifEnabled.value = settings['browser_notification_enabled'] === 'true'
    })

    socket.on('settings:updated', (settings) => {
      console.log('[SocketIO] 设置更新:', settings)
      browserNotifEnabled.value = settings['browser_notification_enabled'] === 'true'
      showToast('⚙️ 设置已更新（浏览器通知已' + (browserNotifEnabled.value ? '开启' : '关闭') + '）')
    })
  }

  function disconnectSocket() {
    if (socket) {
      socket.disconnect()
      socket = null
      socketConnected.value = false
    }
  }

  function openUrl(url) {
    window.open(url, '_blank')
  }

  async function openDetail(topic) {
    detailModal.visible = true
    detailModal.topic = topic
    if (!topic.snapshots) {
      try {
        const { getTopicTrend } = await import('../api/index.js')
        const trendRes = await getTopicTrend(topic.id, 7)
        if (trendRes.data && trendRes.data.data) {
          detailModal.topic = { ...topic, ...trendRes.data.data }
        }
      } catch (e) { /* ignore */ }
    }
  }

  function closeDetail() {
    detailModal.visible = false
    detailModal.topic = null
  }

  function formatJson(obj) {
    if (!obj) return ''
    try {
      return JSON.stringify(obj, null, 2)
    } catch (e) {
      return String(obj)
    }
  }

  function hasRawAuthor(rawData) {
    if (!rawData) return false
    return !!(rawData.author || rawData.pub_date || rawData.feed_source || rawData.description)
  }

  function previewImage(url, title) {
    previewMedia.visible = true
    previewMedia.url = url
    previewMedia.title = title || ''
  }

  function closePreview() {
    previewMedia.visible = false
    previewMedia.url = ''
    previewMedia.title = ''
  }

  function sourceLabel(s) {
    const m = {
      twitter: 'Twitter', bing: 'Bing', so360: '360',
      bilibili_search: 'B站搜索', baidu_search: '百度搜索', weibo_search: '微博搜索',
      baidu: '百度热搜', weibo: '微博热搜', bilibili: 'B站热搜',
      tencent: '腾讯新闻', sogou: '搜狗', rss: 'RSS',
      zhihu: '知乎', juejin: '掘金',
      csdn: 'CSDN', oschina: '开源中国',
    }
    return m[s] || s
  }

  function sourceBadge(s) {
    const m = {
      twitter: 'badge-cyan', bing: 'badge-cyan', so360: 'badge-green',
      bilibili_search: 'badge-cyan', baidu_search: 'badge-red', weibo_search: 'badge-amber',
      baidu: 'badge-red', weibo: 'badge-amber', bilibili: 'badge-cyan',
      tencent: 'badge-purple', sogou: 'badge-green', rss: 'badge-purple',
      zhihu: 'badge-cyan', juejin: 'badge-amber',
      csdn: 'badge-red', oschina: 'badge-green',
    }
    return m[s] || 'badge-cyan'
  }

  function formatTime(d) {
    if (!d) return ''
    return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function formatFullTime(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('zh-CN')
  }

  function extractDomain(url) {
    if (!url) return ''
    try {
      const host = new URL(url).hostname.replace(/^www\./, '')
      return host
    } catch {
      return ''
    }
  }

  function getTopicPublishTime(topic) {
    if (topic.publish_time) return topic.publish_time
    if (topic.tweet_created_at) return topic.tweet_created_at
    return null
  }

  function getTopicAuthorName(topic) {
    if (topic.author_name) return topic.author_name
    if (topic.author_user_name) return topic.author_user_name
    if (topic.raw_data?.author) return topic.raw_data.author
    return null
  }

  function getTopicAuthorUserName(topic) {
    if (topic.author_user_name) return topic.author_user_name
    return null
  }

  function getTopicAuthorVerified(topic) {
    return !!(topic.author_verified || topic.raw_data?.author_verified)
  }

  function getContentPreview(content) {
    if (!content) return ''
    const plain = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return plain.length > 80 ? plain.substring(0, 80) + '...' : plain
  }

  function formatCount(n) {
    if (!n) return '0'
    if (n >= 10000) return (n / 10000).toFixed(1) + '万'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  function credibilityBadge(pct) {
    if (pct == null) return 'badge-cyan'
    if (pct >= 80) return 'badge-green'
    if (pct >= 60) return 'badge-cyan'
    if (pct >= 40) return 'badge-amber'
    return 'badge-red'
  }

  function credibilityFillClass(pct) {
    if (pct == null) return ''
    if (pct >= 80) return 'cred-fill-high'
    if (pct >= 60) return 'cred-fill-mid'
    if (pct >= 40) return 'cred-fill-low'
    return 'cred-fill-crit'
  }

  async function checkServerHealth() {
    try {
      await checkHealth()
      online.value = true
    } catch {
      online.value = false
    }
  }

  function updateClock() {
    currentTime.value = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  async function loadUnreadCount() {
    try {
      const res = await getNotifications({ page: 1, limit: 1 })
      unreadCount.value = res.data.unreadCount || 0
    } catch (e) { /* ignore */ }
  }

  function init() {
    updateClock()
    clockTimer = setInterval(updateClock, 1000)
    checkServerHealth()
    loadUnreadCount()
    requestBrowserNotification()
    healthTimer = setInterval(checkServerHealth, 30000)
    connectSocket()
  }

  function destroy() {
    if (clockTimer) clearInterval(clockTimer)
    if (healthTimer) clearInterval(healthTimer)
    disconnectSocket()
  }

  return {
    online,
    currentTime,
    toastMessage,
    unreadCount,
    socketConnected,
    browserNotifEnabled,
    detailModal,
    previewMedia,
    sources,
    showToast,
    requestBrowserNotification,
    sendBrowserNotification,
    connectSocket,
    disconnectSocket,
    openUrl,
    openDetail,
    closeDetail,
    formatJson,
    hasRawAuthor,
    previewImage,
    closePreview,
    sourceLabel,
    sourceBadge,
    formatTime,
    formatFullTime,
    extractDomain,
    getTopicPublishTime,
    getTopicAuthorName,
    getTopicAuthorUserName,
    getTopicAuthorVerified,
    getContentPreview,
    formatCount,
    credibilityBadge,
    credibilityFillClass,
    init,
    destroy
  }
}
