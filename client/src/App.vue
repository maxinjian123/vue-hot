<template>
  <div>
    <div class="aurora-bg"></div>
    <div class="grid-overlay"></div>
    <div class="scanline"></div>

    <div class="app-container">
      <header class="header">
        <div class="header-brand">
          <router-link to="/" class="header-logo-link">
            <div class="header-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-cyan)">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="M5.64 5.64l2.83 2.83" />
                <path d="M15.54 15.54l2.83 2.83" />
                <path d="M5.64 18.36l2.83-2.83" />
                <path d="M15.54 8.46l2.83-2.83" />
              </svg>
            </div>
            <div>
              <div class="header-title">热点哨兵</div>
              <div class="header-subtitle">HOT SENTINEL</div>
            </div>
          </router-link>
        </div>
        <div class="header-meta">
          <div :class="['status-indicator', store.online.value ? '' : 'offline']">
            <span class="status-dot"></span>
            <span>{{ store.online.value ? 'LIVE' : 'OFFLINE' }}</span>
          </div>
          <div class="clock-display">
            <svg width="14" height="14"
                 style="margin-bottom: 3px"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>{{ store.currentTime.value }}</span>
          </div>
          <router-link to="/notifications" class="notif-bell">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span v-if="store.unreadCount.value" class="badge-count">{{ store.unreadCount.value > 99 ? '99+' : store.unreadCount.value }}</span>
          </router-link>
        </div>
      </header>

      <nav class="nav-wrapper">
        <router-link v-for="tab in tabs" :key="tab.path" :to="tab.path" class="nav-tab" active-class="active">
          <span style="margin-top: 5px" v-html="tab.icon"></span>
          <span>{{ tab.label }}</span>
          <span v-if="tab.path === '/notifications' && store.unreadCount.value" class="badge-count">{{ store.unreadCount.value }}</span>
        </router-link>
      </nav>

      <router-view />

      <footer class="app-footer">
        <span>Hot Sentinel v1.0</span>
        <span class="footer-sep">·</span>
        <span>DeepSeek AI</span>
        <span class="footer-sep">·</span>
        <span>16 数据源</span>
      </footer>

      <Teleport to="body">
        <div v-if="store.toastMessage.value" class="toast-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink: 0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {{ store.toastMessage.value }}
        </div>
      </Teleport>

      <HsDialog v-model="store.previewMedia.visible" title="媒体预览" :width="'90%'" :close-on-click-modal="false">
        <img :src="store.previewMedia.url" :alt="store.previewMedia.title" class="media-modal-img" />
        <div v-if="store.previewMedia.title" class="media-modal-caption">{{ store.previewMedia.title }}</div>
      </HsDialog>

    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted } from 'vue'
import HsDialog from './components/HsDialog.vue'
import { useAppStore } from './composables/useAppStore.js'
// 添加鼠标跟随效果（只需这段JS）
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  document.documentElement.style.setProperty('--mouse-x', `${x}%`);
  document.documentElement.style.setProperty('--mouse-y', `${y}%`);
});

// 可选：鼠标离开窗口时淡出光晕
document.addEventListener('mouseleave', () => {
  document.documentElement.style.setProperty('--mouse-x', '50%');
  document.documentElement.style.setProperty('--mouse-y', '50%');
});
export default {
  name: 'App',
  components: { HsDialog },
  methods: {},
  setup() {
    const store = useAppStore()
    let notifPollTimer = null
    let prevUnreadCount = 0

    const tabs = [
      {
        path: '/dashboard',
        label: '大屏',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
      },
      {
        path: '/monitor',
        label: '监控',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
      },
      {
        path: '/discovery',
        label: '热点',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
      },
      {
        path: '/search',
        label: '搜索',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
      },
      {
        path: '/notifications',
        label: '通知',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
      },
      {
        path: '/settings',
        label: '设置',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
      }
    ]

    async function pollNotifications() {
      try {
        const { getNotifications } = await import('./api/index.js')
        const res = await getNotifications({ page: 1, limit: 1 })
        const newUnread = res.data.unreadCount || 0
        if (newUnread > prevUnreadCount && prevUnreadCount > 0) {
          const diff = newUnread - prevUnreadCount
          store.sendBrowserNotification('热点哨兵', `发现 ${diff} 条新通知，请及时查看`)
          store.showToast(`收到 ${diff} 条新通知`)
        }
        store.unreadCount.value = newUnread
        prevUnreadCount = newUnread
      } catch (e) {
        /* ignore */
      }
    }

    onMounted(() => {
      store.init()
      prevUnreadCount = store.unreadCount.value
      notifPollTimer = setInterval(pollNotifications, 60000)
    })

    onUnmounted(() => {
      store.destroy()
      if (notifPollTimer) clearInterval(notifPollTimer)
    })

    return { store, tabs }
  }
}
</script>

<style scoped>
.app-footer {
  text-align: center;
  padding: 32px 0 24px;
  font-size: 0.72rem;
  color: var(--text-primary);
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.footer-sep {
  opacity: 0.3;
}
</style>
