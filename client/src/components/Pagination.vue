<template>
  <div v-if="totalPages > 1" class="pagination">
    <button class="page-btn" :disabled="currentPage <= 1" @click="goTo(1)" title="首页">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="11 17 6 12 11 7" />
        <polyline points="18 17 13 12 18 7" />
      </svg>
    </button>
    <button class="page-btn" :disabled="currentPage <= 1" @click="goTo(currentPage - 1)" title="上一页">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <button v-for="p in visiblePages" :key="p" class="page-btn"
            :class="{ active: p === currentPage, ellipsis: p === '...' }"
            :disabled="p === '...'" @click="p !== '...' && goTo(p)">
      {{ p }}
    </button>

    <button class="page-btn" :disabled="currentPage >= totalPages" @click="goTo(currentPage + 1)" title="下一页">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
    <button class="page-btn" :disabled="currentPage >= totalPages" @click="goTo(totalPages)" title="末页">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    </button>

    <span class="page-info">{{ currentPage }} / {{ totalPages }} 页 · 共 {{ totalItems }} 条</span>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'Pagination',
  props: {
    currentPage: { type: Number, required: true },
    totalItems: { type: Number, required: true },
    pageSize: { type: Number, default: 20 }
  },
  emits: ['page-change'],
  setup(props, { emit }) {
    const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))

    const visiblePages = computed(() => {
      const total = totalPages.value
      const current = props.currentPage
      const pages = []

      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
        return pages
      }

      pages.push(1)

      if (current > 3) pages.push('...')

      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)

      if (current < total - 2) pages.push('...')

      pages.push(total)
      return pages
    })

    function goTo(page) {
      if (page < 1 || page > totalPages.value || page === props.currentPage) return
      emit('page-change', page)
    }

    return { totalPages, visiblePages, goTo }
  }
}
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px 0 4px;
  flex-wrap: wrap;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 8px;
  background: rgba(10, 14, 26, 0.6);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.page-btn:hover:not(:disabled):not(.ellipsis):not(.active) {
  border-color: rgba(0, 229, 255, 0.35);
  color: var(--accent-cyan);
  background: rgba(0, 229, 255, 0.08);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.12);
  transform: translateY(-1px);
}

.page-btn.active {
  border-color: var(--accent-cyan);
  background: rgba(0, 229, 255, 0.15);
  color: var(--accent-cyan);
  box-shadow: 0 0 16px rgba(0, 229, 255, 0.2);
  pointer-events: none;
}

.page-btn.ellipsis {
  border-color: transparent;
  background: transparent;
  color: var(--text-primary);
  cursor: default;
  pointer-events: none;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.page-info {
  margin-left: 12px;
  font-size: 0.72rem;
  color: var(--text-primary);
  white-space: nowrap;
}
</style>
