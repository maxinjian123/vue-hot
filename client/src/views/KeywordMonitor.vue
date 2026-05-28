<template>
  <div class="bento-grid">
    <div class="bento-card span-4">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          关键词监控
          <LockFilled />
        </div>
        <span class="text-muted" style="font-size: 0.72rem">{{ keywords.length }} 个关键词 · {{ activeKeywordCount }} 个活跃</span>
      </div>
      <div class="quick-action-bar" style="margin-bottom: 14px">
        <input v-model="newKeyword" class="input-field" placeholder="输入要监控的关键词..." style="min-width: 220px; flex: 1" @keyup.enter="onAddKeyword" />
        <select v-model="newFrequency" class="select-field" style="width: 110px">
          <option :value="null">默认频率</option>
          <option :value="1">1分钟</option>
          <option :value="5">5分钟</option>
          <option :value="15">15分钟</option>
          <option :value="30">30分钟</option>
          <option :value="60">60分钟</option>
          <option :value="720">12小时</option>
          <option :value="1440">24小时</option>
        </select>
        <button class="btn btn-primary" :disabled="!newKeyword.trim()" @click="onAddKeyword">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加监控
        </button>
      </div>

      <div v-if="loading" class="loading-skeleton">
        <div v-for="n in 4" :key="n" class="skeleton-card">
          <div class="skeleton skeleton-line w-80"></div>
          <div class="skeleton skeleton-line w-40"></div>
        </div>
      </div>

      <div v-else-if="keywords.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p>还没有监控关键词</p>
        <p style="font-size: 0.72rem">输入关键词，自动从多源捕获热点并推送给您</p>
      </div>

      <div v-for="kw in keywords" :key="kw.id" class="data-list-item" :style="{ borderLeft: kw.enabled ? '2px solid var(--accent-green)' : '3px solid transparent' }">
        <div class="item-content">
          <div class="item-title">
            <span :style="{ color: kw.enabled ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '0.68rem', flexShrink: 0 }">
              {{ kw.enabled ? '⬤' : '○' }}
            </span>
            <strong>{{ kw.word }}</strong>
            <span :class="['badge', frequencyBadgeClass(kw.crawl_frequency)]">
              {{ kw.crawl_frequency == null ? '默认频率' : kw.crawl_frequency + ' 分钟' }}
            </span>
          </div>
          <div class="item-meta">
            <span :style="{ color: kw.enabled ? 'var(--accent-green)' : 'var(--text-muted)' }">{{ kw.enabled ? '监控中' : '已暂停' }}</span>
            <span v-if="kw.last_checked_at" class="text-muted"> 上次检查: {{ store.formatFullTime(kw.last_checked_at) }} </span>
            <span v-else class="text-muted">等待首次检查</span>
          </div>
        </div>
        <div class="item-actions">
          <select class="select-field" style="padding: 4px 8px; font-size: 0.7rem; min-width: 80px" :value="kw.crawl_frequency" @change="onChangeFrequency(kw, $event.target.value)">
            <option value="">默认</option>
            <option :value="1">1分钟</option>
            <option :value="5">5分钟</option>
            <option :value="15">15分钟</option>
            <option :value="30">30分钟</option>
            <option :value="60">60分钟</option>
            <option :value="720">12小时</option>
            <option :value="1440">24小时</option>
          </select>
          <label class="toggle-switch" style="zoom: 0.8" :title="kw.enabled ? '暂停监控' : '启用监控'">
            <input type="checkbox" :checked="kw.enabled" @change="onToggleKeyword(kw)" />
            <span class="switch-track"></span>
          </label>
          <button class="btn btn-sm btn-success" @click="doExportReport(kw)" title="导出监控报告">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button class="btn btn-danger btn-sm" @click="confirmDelete(kw)" title="删除关键词">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          </div>
          监控概览
        </div>
        <span class="badge badge-purple">LIVE</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div class="stat-card" style="border-color: rgba(0, 229, 255, 0.2)">
          <div class="stat-card-value">{{ activeKeywordCount }}</div>
          <div class="stat-card-label">活跃关键词</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" style="color: var(--text-secondary); text-shadow: none">{{ keywords.length }}</div>
          <div class="stat-card-label">总计关键词</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" style="color: var(--accent-purple); font-size: 1.3rem">{{ checkedTodayCount }}</div>
          <div class="stat-card-label">今日已检查</div>
        </div>
        <div class="data-list-item" style="padding: 10px 14px; margin-bottom: 0">
          <div class="item-content">
            <div class="item-title" style="font-size: 0.78rem; margin-bottom: 0">AI 引擎</div>
          </div>
          <span class="badge badge-cyan">DeepSeek V4 / Spark-x</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="deleteConfirm.visible" class="confirm-overlay" @click.self="deleteConfirm.visible = false">
        <div class="confirm-box">
          <div class="confirm-title">确认删除</div>
          <div class="confirm-message">
            确定要删除关键词 <strong style="color: var(--accent-cyan)">{{ deleteConfirm.word }}</strong> 吗？此操作不可恢复，关联的采集数据也将被删除。
          </div>
          <div class="confirm-actions">
            <button class="btn btn-sm" @click="deleteConfirm.visible = false">取消</button>
            <button class="btn btn-danger btn-sm" @click="doDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import * as XLSX from 'xlsx'
import { createKeyword, deleteKeyword, getHotTopics, getKeywords, updateKeyword } from '../api'
import { useAppStore } from '../composables/useAppStore.js'
import { LockFilled } from '@ant-design/icons-vue';

export default {
  name: 'KeywordMonitor',
  components: {
    LockFilled
  },
  setup() {
    const store = useAppStore()
    const keywords = ref([])
    const newKeyword = ref('')
    const newFrequency = ref(null)
    const loading = ref(false)

    const deleteConfirm = reactive({ visible: false, id: null, word: '' })

    let refreshTimer = null

    const activeKeywordCount = computed(() => keywords.value.filter(k => k.enabled).length)

    const checkedTodayCount = computed(() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return keywords.value.filter(k => {
        if (!k.last_checked_at) return false
        return new Date(k.last_checked_at) >= today
      }).length
    })

    function frequencyBadgeClass(f) {
      if (f == null) return 'badge-cyan'
      return f <= 5 ? 'badge-red' : f <= 15 ? 'badge-amber' : 'badge-green'
    }

    async function loadKeywords() {
      try {
        loading.value = true
        const res = await getKeywords()
        keywords.value = res.data.data || []
      } catch (e) {
        /* ignore */
      } finally {
        loading.value = false
      }
    }

    async function onAddKeyword() {
      const word = newKeyword.value.trim()
      if (!word) return
      try {
        const freq = newFrequency.value == null ? null : parseInt(newFrequency.value)
        await createKeyword({ word, crawl_frequency: freq })
        store.showToast(`已添加关键词: ${word}`)
        newKeyword.value = ''
        newFrequency.value = null
        await loadKeywords()
      } catch (e) {
        store.showToast('添加失败，请检查关键词是否已存在')
      }
    }

    async function onToggleKeyword(kw) {
      await updateKeyword(kw.id, { enabled: !kw.enabled })
      store.showToast(`已${kw.enabled ? '暂停' : '恢复'}: ${kw.word}`)
      await loadKeywords()
    }

    async function onChangeFrequency(kw, value) {
      const val = value === '' || value === 'null' ? null : parseInt(value)
      await updateKeyword(kw.id, { crawl_frequency: val })
      store.showToast(`监控频率: ${kw.word} → ${val == null ? '使用默认' : val + ' 分钟'}`)
      await loadKeywords()
    }

    function confirmDelete(kw) {
      deleteConfirm.visible = true
      deleteConfirm.id = kw.id
      deleteConfirm.word = kw.word
    }

    async function doDelete() {
      await deleteKeyword(deleteConfirm.id)
      store.showToast('关键词已删除')
      deleteConfirm.visible = false
      deleteConfirm.id = null
      deleteConfirm.word = ''
      await loadKeywords()
    }

    async function doExportReport(kw) {
      try {
        store.showToast(`正在生成 "${kw.word}" 的监控报告...`)
        const res = await getHotTopics({ keyword_id: kw.id, limit: 10000 })
        const topics = res.data.data || []
        const rows = topics.map((t, i) => ({
          "序号": i + 1,
          "标题": t.title,
          "摘要": t.summary || '',
          "来源": t.source,
          "原文链接": t.source_url || '',
          "重要性": t.importance,
          "点赞": t.likes || 0,
          "评论": t.comments || 0,
          "浏览": t.views || 0,
          '可信度%': t.ai_analysis ? (t.ai_analysis.credibilityPercentage ?? '-') : '-',
          "发现时间": t.capture_time ? new Date(t.capture_time).toLocaleString('zh-CN') : ''
        }))

        const wsData = [[`热点哨兵 - 关键词监控报告`], [`关键词: ${kw.word}`], [`状态: ${kw.enabled ? '监控中' : '已暂停'}`], [`采集频率: ${kw.crawl_frequency ? kw.crawl_frequency + ' 分钟' : '默认'}`], [`报告生成时间: ${new Date().toLocaleString('zh-CN')}`], [`共发现 ${rows.length} 条热点`], []]
        if (rows.length > 0) {
          wsData.push(Object.keys(rows[0]))
          rows.forEach(r => wsData.push(Object.values(r)))
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, '监控报告')
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${kw.word}_监控报告_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
        store.showToast(`"${kw.word}" 监控报告已导出 (${rows.length} 条)`)
      } catch (e) {
        store.showToast('导出失败，请重试')
      }
    }

    onMounted(() => {
      loadKeywords()
      refreshTimer = setInterval(loadKeywords, 30000)
    })

    onUnmounted(() => {
      if (refreshTimer) clearInterval(refreshTimer)
    })

    return {
      store,
      keywords,
      newKeyword,
      newFrequency,
      loading,
      deleteConfirm,
      activeKeywordCount,
      checkedTodayCount,
      frequencyBadgeClass,
      onAddKeyword,
      onToggleKeyword,
      onChangeFrequency,
      confirmDelete,
      doDelete,
      doExportReport
    }
  }
}
</script>

<style scoped>
.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
