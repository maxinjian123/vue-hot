<template>
  <div class="bento-grid">
    <div class="bento-card span-4">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          通知中心
        </div>
        <div style="display: flex; gap: 8px; align-items: center">
          <span class="ws-status" :class="{ 'ws-connected': store.socketConnected.value, 'ws-disconnected': !store.socketConnected.value }"> <span class="ws-dot"></span> {{ store.socketConnected.value ? '实时连接' : '离线' }} </span>
          <span v-if="store.browserNotifEnabled.value" class="notif-badge-on">🔔 通知已开</span>
          <span v-else class="notif-badge-off">🔕 通知已关</span>
          <span class="text-muted" style="font-size: 0.72rem">
            未读: <span class="text-red" style="font-weight: 700">{{ store.unreadCount.value }}</span>
          </span>
          <button v-if="store.unreadCount.value" class="btn btn-sm btn-success" @click="markAllRead">全部已读</button>
          <button class="btn btn-sm btn-success" @click="doExport('excel')" title="导出通知">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出
          </button>
          <button class="btn btn-sm" @click="resetNotifFilters" title="重置">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      <FilterBar
        :model-value="{ sort: notifSort, source: notifFilters.source, min_importance: notifFilters.min_importance, is_read: notifFilters.is_read }"
        :sort-options="sortOpts"
        :source-options="store.sources"
        :importance-options="importanceOpts"
        :read-options="readOpts"
        :source-label-fn="store.sourceLabel"
        :source-badge-fn="store.sourceBadge"
        @update:sort="applyNotifSort"
        @update:min_importance="applyNotifFilters('min_importance', $event)"
        @update:is_read="applyNotifFilters('is_read', $event)"
        @update:source="applyNotifFilters('source', $event)" />

      <div v-if="loading" class="loading-skeleton">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-meta"></div>
        </div>
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.73 21a2 2 0 0 1-3.46 0M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /></svg>
        </div>
        <p>暂无通知</p>
        <p style="font-size: 0.72rem">关键词监测到新内容时将自动推送</p>
      </div>

      <div v-for="notif in notifications" :key="notif.id" class="data-list-item" :class="{ 'notif-read': notif.is_read }">
        <div class="item-content">
          <div class="item-title" style="white-space: normal; line-height: 1.5">
            <svg v-if="!notif.is_read" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="var(--accent-red)" /></svg>
            <span v-html="notif.title"></span>
          </div>
          <div v-if="notif.content" class="notif-content-text">
            {{ notif.content }}
          </div>
          <span class="notif-content-text">关联热点ID: {{ notif.topic_id }}</span>

          <div class="item-meta">
            <span :class="['badge', store.sourceBadge(notif.source)]">{{ store.sourceLabel(notif.source) }}</span>
            <span>重要性: {{ notif.importance }}/10</span>
            <span v-if="notif.publish_time" class="text-muted">📅 {{ store.formatFullTime(notif.publish_time) }}</span>
            <span class="text-muted">{{ store.formatTime(notif.created_at) }}</span>
          </div>
        </div>
        <div class="item-actions" style="flex-direction: column; gap: 6px; align-items: flex-end">
          <button v-if="!notif.is_read" class="btn btn-sm btn-primary" @click="markRead(notif.id)">已读</button>
          <button v-if="notif.source_url" class="btn btn-sm" @click="store.openUrl(notif.source_url)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <Pagination :current-page="notifPage" :total-items="notifTotal" :page-size="notifPageSize" @page-change="goToNotifPage" />
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
          通知概览
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div class="stat-card" style="border-color: rgba(255, 23, 68, 0.2)">
          <div class="stat-card-value" style="color: var(--accent-red)">{{ store.unreadCount.value }}</div>
          <div class="stat-card-label">未读通知</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" style="color: var(--text-secondary); text-shadow: none">{{ notifTotal }}</div>
          <div class="stat-card-label">总通知数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" style="color: var(--accent-purple); font-size: 1.3rem">{{ todayNotifCount }}</div>
          <div class="stat-card-label">今日新增</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/index.js'
import FilterBar from '../components/FilterBar.vue'
import Pagination from '../components/Pagination.vue'
import { useAppStore } from '../composables/useAppStore.js'

const sortOpts = [
  { value: 'latest', label: '最新时间' },
  { value: 'importance', label: '重要性优先' },
  { value: 'unread_first', label: '未读优先' }
]

const importanceOpts = [
  { value: '', label: '不限' },
  { value: '1', label: '≥1' },
  { value: '3', label: '≥3' },
  { value: '5', label: '≥5' },
  { value: '7', label: '≥7' },
  { value: '9', label: '≥9' }
]

const readOpts = [
  { value: '', label: '全部' },
  { value: 'false', label: '未读' },
  { value: 'true', label: '已读' }
]

export default {
  name: 'NotificationCenter',
  components: { Pagination, FilterBar },
  setup() {
    const store = useAppStore()

    const notifications = ref([])
    const notifPage = ref(1)
    const notifTotal = ref(0)
    const notifPageSize = ref(20)
    const loading = ref(false)

    const notifSort = ref('latest')
    const notifFilters = ref({
      source: [],
      min_importance: '',
      is_read: ''
    })

    const todayNotifCount = computed(() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return notifications.value.filter(n => new Date(n['createdAt']) >= today).length
    })

    let refreshTimer = null

    async function loadNotifications(params = {}) {
      try {
        loading.value = true
        const page = params.page !== undefined ? params.page : notifPage.value
        const limit = params.limit !== undefined ? params.limit : notifPageSize.value
        const sort = params.sort !== undefined ? params.sort : notifSort.value
        const filters = params.filters !== undefined ? params.filters : notifFilters.value

        const query = { page, limit, sort }
        if (filters.is_read) query.is_read = filters.is_read
        if (filters.source.length > 0) query.source = filters.source.join(',')
        if (filters.min_importance) query.min_importance = filters.min_importance

        const res = await getNotifications(query)
        notifications.value = res.data.data || []
        store.unreadCount.value = res.data.unreadCount || 0
        notifTotal.value = res.data.total || 0
        notifPage.value = res.data.page || page
      } catch (e) {
        /* ignore */
      } finally {
        loading.value = false
      }
    }

    async function goToNotifPage(page) {
      notifPage.value = page
      window.scrollTo(0, 0)
      await loadNotifications({ page })
    }

    function applyNotifSort(val) {
      notifSort.value = val
      notifPage.value = 1
      loadNotifications({ page: 1, sort: val })
    }

    function applyNotifFilters(key, val) {
      notifFilters.value[key] = val
      notifPage.value = 1
      loadNotifications({ page: 1 })
    }

    function resetNotifFilters() {
      notifFilters.value = { source: [], min_importance: '', is_read: '' }
      notifSort.value = 'latest'
      notifPage.value = 1
      loadNotifications({ page: 1 })
    }

    async function markRead(id) {
      await markNotificationRead(id)
      store.showToast('已标记已读')
      await loadNotifications()
    }

    async function markAllRead() {
      await markAllNotificationsRead()
      store.showToast('全部已读')
      await loadNotifications()
    }

    onMounted(() => {
      loadNotifications()
      refreshTimer = setInterval(loadNotifications, 30000)

      window.addEventListener('notification:new', handleNewNotification)
    })

    onUnmounted(() => {
      if (refreshTimer) clearInterval(refreshTimer)
      window.removeEventListener('notification:new', handleNewNotification)
    })

    function handleNewNotification(event) {
      console.log('[NotificationCenter] New notification received via WebSocket')
      store.unreadCount.value++
      loadNotifications()
    }

    async function doExport(format) {
      try {
        store.showToast('正在生成导出文件...')
        const params = { limit: 10000 }
        if (notifFilters.value.is_read) params.is_read = notifFilters.value.is_read
        if (notifFilters.value.source.length > 0) params.source = notifFilters.value.source.join(',')
        if (notifFilters.value.min_importance) params.min_importance = notifFilters.value.min_importance
        if (notifSort.value) params.sort = notifSort.value
        const res = await getNotifications(params)
        const rows = (res.data.data || []).map(n => ({
          ID: n.id,
          标题: n.title,
          内容: n.content || '',
          关联热点ID: n.topic_id || '',
          关联关键词ID: n.keyword_id || '',
          来源: n.source || '',
          原文链接: n.source_url || '',
          重要性: n.importance || 5,
          已读: n.is_read ? '是' : '否',
          发布时间: n.publish_time ? new Date(n.publish_time).toLocaleString('zh-CN') : '',
          创建时间: n.created_at ? new Date(n.created_at).toLocaleString('zh-CN') : ''
        }))

        if (format === 'csv') {
          const headers = Object.keys(rows[0] || {})
          const csv =
            '\uFEFF' +
            headers.join(',') +
            '\n' +
            rows
              .map(r =>
                headers
                  .map(h => {
                    const v = String(r[h] ?? '')
                    return v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v.replace(/"/g, '""') + '"' : v
                  })
                  .join(',')
              )
              .join('\n')
          const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `通知记录_${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          window.URL.revokeObjectURL(url)
        } else {
          const ws = XLSX.utils.json_to_sheet(rows)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, '通知记录')
          const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `通知记录_${new Date().toISOString().slice(0, 10)}.xlsx`
          a.click()
          window.URL.revokeObjectURL(url)
        }
        store.showToast(`已导出 ${format.toUpperCase()} 文件 (${rows.length} 条)`)
      } catch (e) {
        store.showToast('导出失败，请重试')
      }
    }

    return {
      store,
      notifications,
      notifPage,
      notifTotal,
      notifPageSize,
      notifSort,
      notifFilters,
      sortOpts,
      importanceOpts,
      readOpts,
      loading,
      todayNotifCount,
      goToNotifPage,
      applyNotifSort,
      applyNotifFilters,
      resetNotifFilters,
      markRead,
      markAllRead,
      doExport
    }
  }
}
</script>

<style scoped>
.notif-read {
  opacity: 0.5;
}

.ws-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.ws-connected {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.ws-disconnected {
  background: rgba(255, 23, 68, 0.15);
  color: #ff1744;
}

.ws-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.notif-badge-on {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
  font-weight: 600;
}

.notif-badge-off {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(158, 158, 158, 0.15);
  color: #9e9e9e;
  font-weight: 600;
}

.notif-content-text {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
