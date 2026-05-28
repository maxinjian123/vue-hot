<template>
  <div class="bento-grid">
    <div class="bento-card span-4">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M3 11a8 8 0 0 1 8-8" />
              <path d="M3 11a8 8 0 0 0 8 8" />
            </svg>
          </div>
          全网搜索
        </div>
        <div style="display: flex; gap: 8px; align-items: center">
          <span v-if="searching" class="badge badge-cyan" style="animation: pulse 1.5s ease-in-out infinite">搜索中</span>
          <span v-else-if="searchedKeyword" class="text-muted" style="font-size: 0.72rem"> "{{ searchedKeyword }}" · {{ results.length }} 条 </span>
          <span v-if="aiAnalysisInfo?.enabled" class="badge badge-purple" style="font-size: 0.62rem">AI已分析</span>
        </div>
      </div>

      <div class="search-input-wrapper" style="margin-bottom: 10px; position: relative">
        <div class="btn" @click="() => (enableAiAnalysis = !enableAiAnalysis)">
          <label class="toggle-switch" style="zoom: 0.75" title="启用AI智能分析排序">
            <input type="checkbox" v-model="enableAiAnalysis" disabled="true" />
            <span class="switch-track"></span>
          </label>
          启用AI智能分析排序
        </div>
        <div style="position: relative; display: flex; flex: 1">
          <input v-model="query" class="input-field" placeholder="输入关键词搜索全网热点..." style="flex: 1; min-width: 240px" @keyup.enter="doSearch" @input="handleInput" @focus="showSuggestions = true" @blur="hideSuggestionsDelayed" />
          <div class="suggestions-dropdown" v-if="suggestions && suggestions.length > 1 && query.trim() !== ''">
            <div v-for="(suggestion, idx) in suggestions" :key="idx" class="suggestion-item" @mousedown.prevent="selectSuggestion(suggestion)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-right: 6px">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>{{ suggestion }}</span>
            </div>
          </div>
        </div>
        <select v-model="resultsPerSource" class="select-field" style="width: 100px" title="每源最多返回数">
          <option :value="2">2条/源</option>
          <option :value="3">3条/源</option>
          <option :value="5">5条/源</option>
          <option :value="10">10条/源</option>
        </select>

        <button class="btn btn-primary" :disabled="searching || !query.trim()" @click="doSearch">
          <svg v-if="!searching" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite">
            <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-linecap="round" />
          </svg>
          {{ searching ? '搜索中...' : '搜索' }}
        </button>
      </div>

      <div v-if="aiAnalysisInfo" class="ai-analysis-info" style="margin-bottom: 10px; padding: 8px 12px; background: rgba(128, 90, 213, 0.08); border-radius: 6px; border-left: 3px solid var(--accent-purple); font-size: 0.7rem">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px">
          <span style="color: var(--accent-purple); font-weight: 600">🤖 AI 分析报告</span>
          <span v-if="aiAnalysisInfo.model" class="text-muted"> 模型: {{ aiAnalysisInfo.model }} | 耗时: {{ aiAnalysisInfo.analysisTime }}</span>
        </div>
        <div v-if="aiAnalysisInfo.enabled" style="color: var(--text-secondary)">
          共分析 <strong>{{ aiAnalysisInfo.totalAnalyzed }}</strong> 条结果， 其中 <strong style="color: var(--accent-green)">{{ aiAnalysisInfo.relevantCount }}</strong> 条被判定为相关内容
        </div>
        <div v-else style="color: var(--accent-amber)">⚠️ AI分析未启用（{{ aiAnalysisInfo.fallback || '基础排序模式' }}）</div>
      </div>

      <div class="quick-action-bar" style="margin-bottom: 0; flex-wrap: wrap; gap: 5px">
        <label v-for="src in sourceCheckboxes" :key="src.id" class="source-chip" :class="{ active: !selectedSources.length || selectedSources.includes(src.id) }">
          <input type="checkbox" :value="src.id" :checked="!selectedSources.length || selectedSources.includes(src.id)" @change="toggleSource(src.id)" class="sr-only" />
          <span>{{ src.label }}</span>
        </label>
        <button v-if="selectedSources.length > 0 && selectedSources.length < sourceCheckboxes.length" class="btn btn-sm" style="font-size: 0.6rem; padding: 3px 8px" @click="selectedSources = []">全选</button>
      </div>

      <div class="search-divider"></div>

      <div v-if="error" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p style="color: var(--accent-red)">{{ error }}</p>
      </div>

      <div v-else-if="searching && results.length === 0 && !searchedKeyword" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" stroke-dasharray="40 20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <p>正在从多源采集数据...</p>
        <p style="font-size: 0.72rem">
          <span class="scanning-dot" :style="{ animationDelay: '0s' }">·</span>
          <span class="scanning-dot" :style="{ animationDelay: '0.2s' }">·</span>
          <span class="scanning-dot" :style="{ animationDelay: '0.4s' }">·</span>
        </p>
      </div>

      <div v-else-if="!searching && results.length === 0 && searchedKeyword" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p>未找到 "{{ searchedKeyword }}" 的相关结果</p>
        <p style="font-size: 0.72rem">尝试更换关键词或检查数据源</p>
        <div v-if="suggestions.length > 0" style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: center">
          <span v-for="(suggestion, idx) in suggestions.slice(0, 6)" :key="idx" class="badge badge-cyan suggestion-tag" style="cursor: pointer" @click="selectSuggestion(suggestion)">
            {{ suggestion }}
          </span>
        </div>
      </div>

      <div v-else-if="!searching && !searchedKeyword" class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p>输入关键词搜索全网热点</p>
        <p style="font-size: 0.72rem">实时从多源采集，支持AI智能分析和排序 ✨</p>
      </div>

      <div v-else-if="searching && results.length === 0 && searchedKeyword" class="loading-skeleton-list">
        <div v-for="n in 5" :key="n" class="skeleton-card">
          <div class="skeleton skeleton-line w-80"></div>
          <div class="skeleton skeleton-line w-40"></div>
        </div>
      </div>

      <div v-for="(item, idx) in results" :key="idx" class="search-result-item" :class="{ 'not-relevant': item.isRelevant === false }">
        <div class="search-result-main">
          <a v-if="item.url && isValidUrl(item.url)" :href="item.url" target="_blank" class="search-result-title">
            <span v-html="item.title"></span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink: 0">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          <span v-else class="search-result-title" style="cursor: default; opacity: 0.85">
            <span v-html="item.title"></span>
            <svg v-if="!item.url || !isValidUrl(item.url)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" style="flex-shrink: 0; margin-left: 4px" title="暂无可用链接">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </span>

          <div v-if="item.aiAnalysis" class="ai-badge-row" style="display: flex; gap: 6px; margin: 4px 0; flex-wrap: wrap">
            <span v-if="item.aiAnalysis.importance" :class="['badge', getImportanceBadgeClass(item.aiAnalysis.importance)]" style="font-size: 0.58rem"> 重要性: {{ item.aiAnalysis.importance }}/10 </span>
            <span v-if="item.aiAnalysis.credibilityText" class="badge" style="font-size: 0.58rem; background: rgba(34, 197, 94, 0.15); color: #22c55e">
              {{ item.aiAnalysis.credibilityText }}
            </span>
            <span v-if="item.isRelevant === false" class="badge" style="font-size: 0.58rem; background: rgba(239, 68, 68, 0.15); color: #ef4444"> 低相关性 </span>
          </div>

          <div v-if="item.content && item.content.trim() && item.content.trim() !== item.title.trim()" class="search-result-content">
            {{ item.content.length > 200 ? item.content.substring(0, 200) + '...' : item.content }}
          </div>

          <div v-if="item.summary && item.summary !== item.title" class="search-result-content" style="color: var(--accent-purple); font-style: italic; font-size: 0.78rem">💡 AI摘要: {{ item.summary.length > 150 ? item.summary.substring(0, 150) + '...' : item.summary }}</div>

          <div class="search-result-meta">
            <span :class="['badge', store.sourceBadge(item.source)]">{{ store.sourceLabel(item.source) }}</span>
            <span v-if="item.url && isValidUrl(item.url) && store.extractDomain(item.url)" class="text-muted">{{ store.extractDomain(item.url) }}</span>
            <span v-else-if="!item.url || !isValidUrl(item.url)" class="text-muted" style="color: var(--accent-red)">链接不可用</span>
            <span v-if="item.likes > 0" class="text-muted">👍 {{ store.formatCount(item.likes) }}</span>
            <span v-if="item.comments > 0" class="text-muted">💬 {{ store.formatCount(item.comments) }}</span>
            <span v-if="item.views > 0" class="text-muted">👁 {{ store.formatCount(item.views) }}</span>
            <span v-if="item.author_name" class="text-muted">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {{ item.author_name }}
            </span>
            <span v-if="item.publish_time" class="text-muted">{{ store.formatTime(item.publish_time) }}</span>
          </div>
        </div>
        <div v-if="item.image_url && isValidImageUrl(item.image_url)" class="search-result-thumb">
          <img :src="item.image_url" :alt="item.title" loading="lazy" @error="onImageError" />
        </div>
      </div>
    </div>

    <div class="bento-card span-2">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          数据源
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <div class="data-list-item" style="padding: 8px 14px; margin-bottom: 0" v-for="src in sourceCheckboxes" :key="src.id">
          <div class="item-content">
            <div class="item-title" style="font-size: 0.76rem; margin-bottom: 0">{{ src.name }}</div>
          </div>
          <label class="toggle-switch" style="zoom: 0.7" :title="'切换' + src.label">
            <input type="checkbox" :checked="!selectedSources.length || selectedSources.includes(src.id)" @change="toggleSource(src.id)" />
            <span class="switch-track"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { getSearchSuggestions, searchWeb } from '../api'
import { useAppStore } from '../composables/useAppStore.js'

export default {
  name: 'SearchView',
  setup() {
    const store = useAppStore()

    const query = ref('')
    const results = ref([])
    const searching = ref(false)
    const searchedKeyword = ref('')
    const error = ref('')
    const selectedSources = ref([])
    const resultsPerSource = ref(3)
    const enableAiAnalysis = ref(true)
    const suggestions = ref([])
    const showSuggestions = ref(false)
    const aiAnalysisInfo = ref(null)

    let suggestTimeout = null

    const sourceCheckboxes = [
      { id: 'twitter', label: 'X', name: 'twitter 搜索' },
      { id: 'bing', label: 'Bing', name: 'Bing 搜索' },
      { id: 'so360', label: '360', name: '360 搜索' },
      { id: 'bilibili_search', label: 'B站', name: 'B站 搜索' },
      { id: 'baidu_search', label: '百度', name: '百度 搜索' },
      { id: 'weibo_search', label: '微博', name: '微博 搜索' },
      { id: 'sogou', label: '搜狗', name: '搜狗 搜索' },
        { id: 'zhihu', label: '知乎', name: '知乎 搜索' },
        { id: 'juejin', label: '掘金', name: '掘金 搜索' },
    ]

    const allSourceIds = sourceCheckboxes.map(s => s.id)

    function toggleSource(id) {
      if (selectedSources.value.length === 0) {
        selectedSources.value = allSourceIds.filter(s => s !== id)
        return
      }
      const idx = selectedSources.value.indexOf(id)
      if (idx >= 0) {
        selectedSources.value.splice(idx, 1)
        if (selectedSources.value.length === 0) {
          selectedSources.value = []
        }
      } else {
        selectedSources.value.push(id)
      }
    }

    function isValidUrl(url) {
      if (!url || typeof url !== 'string') return false
      const trimmedUrl = url.trim()
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) return false
      try {
        new URL(trimmedUrl)
        return true
      } catch (e) {
        return false
      }
    }

    function isValidImageUrl(url) {
      if (!url || typeof url !== 'string') return false
      const trimmedUrl = url.trim().toLowerCase()
      return (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('//')) && (trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i) || trimmedUrl.includes('/image'))
    }

    const IMG_PLACEHOLDER =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280">' +
          '<rect fill="#1a1a2e" width="400" height="280" rx="6"/>' +
          '<g transform="translate(175,90)" stroke="#4a4a6a" stroke-width="2" fill="none">' +
          '<rect x="2" y="2" width="46" height="46" rx="6"/>' +
          '<circle cx="14" cy="14" r="5" fill="#4a4a6a"/>' +
          '<polyline points="48 48 36 32 2 48"/>' +
          '</g>' +
          '<text fill="#4a4a6a" font-size="12" font-family="system-ui,sans-serif" text-anchor="middle">' +
          '<tspan x="200" y="168">图片加载失败</tspan>' +
          '</text>' +
          '</svg>'
      )

    function onImageError(e) {
      if (e.target.src === IMG_PLACEHOLDER) return
      e.target.src = IMG_PLACEHOLDER
      e.target.style.opacity = '0.5'
      e.target.style.filter = 'grayscale(0.6)'
    }

    function getImportanceBadgeClass(score) {
      if (score >= 8) return 'badge-red'
      if (score >= 6) return 'badge-amber'
      if (score >= 4) return 'badge-cyan'
      return 'badge-green'
    }

    async function handleInput() {
      const keyword = query.value.trim()
      if (keyword.length < 1) {
        suggestions.value = []
        showSuggestions.value = false
        return
      }

      if (suggestTimeout) clearTimeout(suggestTimeout)

      suggestTimeout = setTimeout(async () => {
        try {
          const res = await getSearchSuggestions({ q: keyword })
          suggestions.value = res.data.suggestions || []
          showSuggestions.value = suggestions.value.length > 0
        } catch (e) {
          console.error('[Search] 获取建议失败:', e)
          suggestions.value = []
        }
      }, 1000)
    }

    function hideSuggestionsDelayed() {
      setTimeout(() => {
        showSuggestions.value = false
      }, 200)
    }

    function selectSuggestion(suggestion) {
      query.value = suggestion
      showSuggestions.value = false
      suggestions.value = []
      doSearch()
    }

    async function doSearch() {
      const keyword = query.value.trim()
      if (!keyword || searching.value) return

      showSuggestions.value = false
      suggestions.value = []

      searching.value = true
      results.value = []
      searchedKeyword.value = ''
      error.value = ''
      aiAnalysisInfo.value = null

      try {
        const params = {
          q: keyword,
          limit: resultsPerSource.value,
          ai_analysis: enableAiAnalysis.value
        }
        if (selectedSources.value.length > 0) {
          params.sources = selectedSources.value.join(',')
        }
        const res = await searchWeb(params)
        results.value = res.data.data || []
        searchedKeyword.value = res.data.keyword || keyword
        aiAnalysisInfo.value = res.data.aiAnalysis || null

        if (res.data.suggestions && Array.isArray(res.data.suggestions)) {
          suggestions.value = res.data.suggestions
        }

        if (res.data.message) {
          store.showToast(res.data.message)
        }
      } catch (e) {
        error.value = e.response?.data?.message || '搜索请求失败，请检查网络或稍后重试'
      } finally {
        query.value = ''
        searching.value = false
      }
    }

    return {
      store,
      query,
      results,
      searching,
      searchedKeyword,
      error,
      selectedSources,
      resultsPerSource,
      enableAiAnalysis,
      suggestions,
      showSuggestions,
      aiAnalysisInfo,
      sourceCheckboxes,
      toggleSource,
      isValidUrl,
      isValidImageUrl,
      onImageError,
      getImportanceBadgeClass,
      handleInput,
      hideSuggestionsDelayed,
      selectSuggestion,
      doSearch
    }
  }
}
</script>

<style scoped>
@import '../styles/global.css';
.search-input-wrapper {
  position: relative;
  display: flex;
  flex-wrap: wrap;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 100px;
  max-height: 280px;
  overflow-y: auto;
  background: rgba(73, 72, 72, 0.9);
  border: 1px solid rgba(73, 72, 72, 0.9);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 100;
  margin-top: 4px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 0.82rem;
  color: var(--text-primary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: rgba(56, 189, 248, 0.08);
}

.suggestion-tag {
  transition: all 0.2s ease;
}

.suggestion-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
}

.search-result-item.not-relevant {
  opacity: 0.55;
  border-left: 3px solid var(--accent-red);
}

.ai-badge-row .badge {
  padding: 2px 8px;
}

.loading-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
