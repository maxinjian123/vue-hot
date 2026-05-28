<template>
  <div class="filter-bar">
    <div class="filter-group" v-if="sortOptions && sortOptions.length">
      <label class="filter-label">排序</label>
      <select class="filter-select" :value="modelValue.sort" @change="$emit('update:sort', $event.target.value)">
        <option v-for="o in sortOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="filter-group" v-if="sourceOptions && sourceOptions.length">
      <label class="filter-label">来源</label>
      <div class="multi-select-wrapper" ref="sourceDropdown">
        <button class="filter-btn multi-trigger" @click="toggleDropdown('source')" @blur="closeDropdown('source')">
          <span v-if="modelValue.source.length === 0" class="placeholder">全部</span>
          <span v-else class="selected-text">{{ sourceDisplay }}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <div v-if="openDropdown === 'source'" class="multi-dropdown">
          <label v-for="s in sourceOptions" :key="s.id" class="multi-option">
            <input type="checkbox" :checked="modelValue.source.includes(s.id)" @change="toggleSource(s.id)" />
            <span :class="['badge', badgeFn(s.id)]">{{ labelFn(s.id) }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="filter-group" v-if="importanceOptions && importanceOptions.length">
      <label class="filter-label">重要性≥</label>
      <select class="filter-select" :value="modelValue.min_importance || ''" @change="$emit('update:min_importance', $event.target.value)">
        <option v-for="o in importanceOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="filter-group" v-if="showVerifiedToggle">
      <label class="filter-label filter-check-label">
        <input type="checkbox" :checked="modelValue.author_verified" @change="$emit('update:author_verified', $event.target.checked)" />
        <span>蓝V</span>
      </label>
    </div>

    <div class="filter-group" v-if="readOptions && readOptions.length">
      <label class="filter-label">状态</label>
      <select class="filter-select" :value="modelValue.is_read || ''" @change="$emit('update:is_read', $event.target.value)">
        <option v-for="o in readOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="filter-group" v-if="mediaOptions && mediaOptions.length">
      <label class="filter-label">媒体</label>
      <div class="check-chips">
        <label v-for="m in mediaOptions" :key="m.key" class="chip-label">
          <input type="checkbox" :checked="modelValue[m.key]" @change="$emit('update:' + m.key, $event.target.checked)" />
          <span>{{ m.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  name: 'FilterBar',
  props: {
    modelValue: { type: Object, required: true },
    sortOptions: { type: Array, default: () => [] },
    sourceOptions: { type: Array, default: () => [] },
    importanceOptions: { type: Array, default: () => [] },
    showVerifiedToggle: { type: Boolean, default: false },
    readOptions: { type: Array, default: () => [] },
    mediaOptions: { type: Array, default: () => [] },
    sourceLabelFn: { type: Function, default: null },
    sourceBadgeFn: { type: Function, default: null },
  },
  emits: [
    'update:sort', 'update:min_importance', 'update:author_verified',
    'update:is_read', 'update:has_image', 'update:has_video', 'update:has_link',
    'update:source',
  ],
  setup(props, { emit }) {
    const openDropdown = ref(null)

    function labelFn(id) {
      return props.sourceLabelFn ? props.sourceLabelFn(id) : id
    }
    function badgeFn(id) {
      return props.sourceBadgeFn ? props.sourceBadgeFn(id) : 'badge-cyan'
    }

    const sourceDisplay = computed(() => {
      if (props.modelValue.source.length === 0) return '全部'
      if (props.modelValue.source.length <= 2) return props.modelValue.source.map(labelFn).join(', ')
      return `已选 ${props.modelValue.source.length} 项`
    })

    function toggleDropdown(name) {
      openDropdown.value = openDropdown.value === name ? null : name
    }

    function closeDropdown(name) {
      setTimeout(() => {
        if (openDropdown.value === name) openDropdown.value = null
      }, 200)
    }

    function toggleSource(id) {
      const current = [...props.modelValue.source]
      const idx = current.indexOf(id)
      if (idx >= 0) {
        current.splice(idx, 1)
      } else {
        current.push(id)
      }
      emit('update:source', current)
    }

    return { openDropdown, labelFn, badgeFn, sourceDisplay, toggleDropdown, closeDropdown, toggleSource }
  },
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 0 14px;
  margin-bottom: 4px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.filter-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
  white-space: nowrap;
}

.filter-select {
  padding: 5px 24px 5px 10px;
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 6px;
  background: rgba(10, 14, 26, 0.7);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7da0' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  transition: all var(--transition-fast);
}

.filter-select:focus {
  outline: none;
  border-color: var(--border-active);
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 6px;
  background: rgba(10, 14, 26, 0.7);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 70px;
}

.filter-btn:hover {
  border-color: rgba(0, 229, 255, 0.35);
}

.placeholder { color: var(--text-muted); }
.selected-text { color: var(--accent-cyan); }

.multi-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  padding: 6px;
  background: rgba(10, 14, 26, 0.95);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  z-index: 100;
  min-width: 160px;
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.multi-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--text-secondary);
  transition: background var(--transition-fast);
}

.multi-option:hover {
  background: rgba(0, 229, 255, 0.08);
}

.multi-option input[type="checkbox"] {
  accent-color: var(--accent-cyan);
  width: 13px;
  height: 13px;
}

.filter-check-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-check-label input[type="checkbox"] {
  accent-color: var(--accent-cyan);
  width: 14px;
  height: 14px;
}

.check-chips {
  display: flex;
  gap: 6px;
}

.chip-label {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.7rem;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.chip-label:hover {
  border-color: rgba(0, 229, 255, 0.3);
  color: var(--text-secondary);
}

.chip-label input[type="checkbox"] {
  accent-color: var(--accent-cyan);
  width: 12px;
  height: 12px;
}
</style>
