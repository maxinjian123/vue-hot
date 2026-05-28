<template>
  <div class="settings-layout">
    <!-- 左侧列：系统设置 -->
    <div class="settings-left">
      <div class="bento-card">
        <div class="card-header">
          <div class="card-title">
            <div class="card-title-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" stroke-width="2.5">
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            系统设置
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px">
          <div class="data-list-item">
            <div class="item-content">
              <div class="item-title" style="font-size: 0.85rem">邮件通知</div>
              <div class="item-meta">启用后，发现新热点时自动发送邮件通知</div>
            </div>
            <div class="item-actions">
              <label class="toggle-switch">
                <input type="checkbox" :checked="settings.email_enabled === 'true'" @change="toggleSetting('email_enabled')" />
                <span class="switch-track"></span>
              </label>
            </div>
          </div>

          <div class="data-list-item">
            <div class="item-content" style="flex: 1">
              <div class="item-title" style="font-size: 0.85rem">通知邮箱</div>
              <div class="item-meta">
                <span v-if="settings.email_to">
                  <span v-for="(email, idx) in parseEmailList(settings.email_to)" :key="idx" class="badge badge-purple" style="margin-right: 3px; font-size: 0.62rem; margin-bottom: 3px">{{ email }}</span>
                </span>
                <span v-else class="text-muted">未设置邮箱</span>
              </div>
              <div class="item-meta">多个邮箱用英文逗号分隔</div>
            </div>
            <div class="item-actions" style="flex-shrink: 0; align-self: center">
              <input :value="settings.email_to || ''" class="input-field" style="width: 240px" placeholder="user@qq.com, user2@163.com" @change="updateSettingValue('email_to', $event.target.value)" />
            </div>
          </div>

          <div class="data-list-item">
            <div class="item-content">
              <div class="item-title" style="font-size: 0.85rem">浏览器通知</div>
              <div class="item-meta">启用后，页面内弹出系统通知提示</div>
            </div>
            <div class="item-actions">
              <label class="toggle-switch">
                <input type="checkbox" :checked="settings.browser_notification_enabled === 'true'" @change="toggleSetting('browser_notification_enabled')" />
                <span class="switch-track"></span>
              </label>
            </div>
          </div>

          <div class="data-list-item">
            <div class="item-content">
              <div class="item-title" style="font-size: 0.85rem">默认采集频率</div>
              <div class="item-meta">新建关键词的默认检查频率</div>
            </div>
            <div class="item-actions">
              <select :value="settings.default_crawl_frequency || '15'" class="select-field" @change="updateSettingValue('default_crawl_frequency', $event.target.value)">
                <option value="1">每 1 分钟</option>
                <option value="5">每 5 分钟</option>
                <option value="15">每 15 分钟（推荐）</option>
                <option value="30">每 30 分钟</option>
                <option value="60">每 60 分钟</option>
                <option value="720">每 12 小时</option>
                <option value="1440">每 24 小时</option>
              </select>
            </div>
          </div>

          <div class="data-list-item">
            <div class="item-content">
              <div class="item-title" style="font-size: 0.85rem">AI 内容审核</div>
              <div class="item-meta">启用 DeepSeek AI 过滤假冒/低质内容</div>
            </div>
            <div class="item-actions">
              <label class="toggle-switch">
                <input type="checkbox" :checked="settings.ai_review_enabled === 'true'" @change="toggleSetting('ai_review_enabled')" />
                <span class="switch-track"></span>
              </label>
            </div>
          </div>

          <div class="data-list-item" v-if="!aiConfig.useLocalAI">
            <div class="item-content" style="flex: 1">
              <div class="item-title" style="font-size: 0.85rem">AI 模型</div>
              <div class="item-meta">当前: {{ settings.deepseek_model || 'deepseek-v4-flash' }}</div>
            </div>
            <div class="item-actions" style="flex-shrink: 0; align-self: center">
              <select :value="settings['deepseek_model'] || 'deepseek-v4-flash'" class="select-field" @change="updateSettingValue('deepseek_model', $event.target.value)">
                <option value="deepseek-v4-flash">DeepSeek V4 Flash（快速）</option>
                <option value="spark-x">讯飞 Spark X（深度推理）</option>
                <option value="qwen-turbo">通义千问 Qwen3.6-Flash（平衡）</option>
              </select>
            </div>
          </div>

          <div class="data-list-item" v-else style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08)); border: 1px solid rgba(99, 102, 241, 0.2)">
            <div class="item-content">
              <div class="item-title" style="font-size: 0.85rem; color: var(--accent-purple)">🤖 本地AI模型 (Ollama)</div>
              <div class="item-meta">{{ aiConfig.useLocalAI ? '✅ 已启用 - 使用本地Ollama服务' : '❌ 未启用 - 使用云端API' }}</div>
            </div>
            <div class="item-actions">
              <label class="toggle-switch">
                <input type="checkbox" :checked="aiConfig.useLocalAI" disabled />
                <span class="switch-track" style="opacity: 0.5"></span>
              </label>
            </div>
          </div>

          <div v-if="aiConfig.useLocalAI" class="data-list-item" style="margin-left: 20px; background: rgba(99, 102, 241, 0.04)">
            <div class="item-content" style="flex: 1">
              <div class="item-title" style="font-size: 0.8rem; color: var(--text-secondary)">本地模型选择</div>
              <div class="item-meta">
                <span v-if="ollamaStatus === 'ok'" style="color: var(--accent-green)">● 服务正常</span>
                <span v-else style="color: var(--accent-red)">● 服务不可用</span>
              </div>
            </div>
            <div class="item-actions" style="flex-shrink: 0; align-self: center">
              <select :value="aiConfig.ollamaDefaultModel || 'gemma3:4b'" class="select-field" style="background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3)" disabled>
                <option value="gemma3:4b">Gemma3 4B (快速响应)</option>
                <option value="qwen3.5:4b">Qwen3.5 4B (深度推理)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右上：数据源控制 -->
    <div class="settings-right-top">
      <div class="bento-card">
        <div class="card-header">
          <div class="card-title">
            <div class="card-title-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            数据源控制
          </div>
          <span class="text-muted" style="font-size: 0.72rem">{{ enabledSourceCount }} / {{ sourceList.length }} 个活跃</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px">
          <div v-for="src in sourceList" :key="src.id" class="data-list-item" style="padding: 8px 12px; margin-bottom: 0">
            <div class="item-content">
              <div class="item-title" style="font-size: 0.8rem">
                <span :class="['badge', store.sourceBadge(src.id)]" style="font-size: 0.55rem">{{ src.label }}</span>
                {{ src.name }}
              </div>
            </div>
            <div class="item-actions">
              <label class="toggle-switch" :title="isSourceEnabled(src.id) ? '关闭' + src.name : '开启' + src.name">
                <input type="checkbox" :checked="isSourceEnabled(src.id)" @change="toggleSource(src.id)" />
                <span class="switch-track"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右下：配置说明 -->
    <div class="settings-right-bottom">
      <div class="bento-card">
        <div class="card-header">
          <div class="card-title">
            <div class="card-title-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            配置说明
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px">
          <div class="stat-card">
            <div class="stat-card-value" style="font-size: 1.1rem; color: var(--accent-amber)">⚡</div>
            <div class="stat-card-label">频率越高，数据越及时，但 API 消耗越大</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value" style="font-size: 1.1rem; color: var(--accent-green)">🤖</div>
            <div class="stat-card-label">启用 AI 审核可过滤假冒内容，提升信息质量</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value" style="font-size: 1.1rem; color: var(--accent-purple)">📧</div>
            <div class="stat-card-label">邮件通知通过 QQ SMTP 发送，确保及时送达</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { getSettings } from '../api'
import { useAppStore } from '../composables/useAppStore.js'

export default {
  name: 'SettingsPanel',
  setup() {
    const store = useAppStore()
    const settings = ref({})
    const aiConfig = ref({
      useLocalAI: false,
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaDefaultModel: 'gemma3:4b',
      availableModels: {}
    })
    const ollamaStatus = ref('checking')

    const sourceList = [
      { id: 'twitter', name: 'X (Twitter)', label: 'Global' },
      { id: 'bing', name: 'Bing 搜索', label: 'Search' },
      { id: 'so360', name: '360 搜索', label: 'Search' },
      { id: 'bilibili_search', name: 'B站 搜索', label: 'Video' },
      { id: 'sogou', name: '搜狗搜索', label: 'Search' },
      { id: 'baidu_search', name: '百度 搜索', label: 'Search' },
      { id: 'weibo_search', name: '微博 搜索', label: 'Social' },
      { id: 'zhihu', name: '知乎搜索', label: 'Social' },
      { id: 'juejin', name: '掘金搜索', label: 'Tech' },
      { id: 'csdn', name: 'CSDN搜索', label: 'Tech' },
      { id: 'oschina', name: '开源中国', label: 'Tech' }
    ]

    const enabledSourceCount = computed(() => {
      let count = 0
      sourceList.forEach(s => {
        const key = `crawl_source_${s.id}`
        if (settings.value[key] !== 'false') count++
      })
      return count
    })

    function isSourceEnabled(id) {
      const key = `crawl_source_${id}`
      return settings.value[key] !== 'false'
    }

    async function toggleSource(id) {
      const key = `crawl_source_${id}`
      const current = settings.value[key] !== 'false'
      const newVal = current ? 'false' : 'true'
      await updateSettingValue(key, newVal)
    }

    async function loadSettings() {
      try {
        const res = await getSettings()
        settings.value = res.data.data || {}
        aiConfig.value = res.data.data?.aiConfig || aiConfig.value
      } catch (e) {
        /* ignore */
      }
    }

    async function checkOllamaStatus() {
      try {
        const res = await fetch('/api/settings/ai/status')
        const data = await res.json()
        if (data.success) {
          ollamaStatus.value = data.data.ollamaStatus?.status || 'error'
          aiConfig.value = {
            ...aiConfig.value,
            ...data.data
          }
        }
      } catch (e) {
        ollamaStatus.value = 'error'
      }
    }

    async function toggleSetting(key) {
      const newVal = settings.value[key] === 'true' ? 'false' : 'true'
      await updateSetting(key, newVal)
      store.showToast('设置已更新')
      await loadSettings()
    }

    async function updateSettingValue(key, value) {
      await updateSetting(key, value)
      store.showToast('设置已更新')
      await loadSettings()
    }

    async function updateSetting(key, value) {
      try {
        const response = await fetch(`/api/settings/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        })
        if (!response.ok) throw new Error('更新失败')
      } catch (e) {
        store.showToast('更新失败: ' + e.message)
      }
    }

    function parseEmailList(value) {
      if (!value) return []
      return value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    onMounted(() => {
      loadSettings()
      checkOllamaStatus()
    })

    return { store, settings, aiConfig, ollamaStatus, toggleSetting, updateSettingValue, parseEmailList, sourceList, enabledSourceCount, isSourceEnabled, toggleSource }
  }
}
</script>
