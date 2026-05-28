<template>
  <Teleport to="body">
    <Transition name="hs-dialog" @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div v-if="modelValue" v-show="!destroyOnClose || modelValue" class="hs-dialog-wrapper" :class="{ 'hs-dialog--fullscreen': fullscreen, 'hs-dialog--no-mask': !modal }" @click.self="handleMaskClick">
        <div ref="dialogRef" class="hs-dialog" :style="dialogStyle" :class="{ 'hs-dialog--draggable': draggable, 'hs-dialog--dragging': isDragging }" @mousedown.stop="handleDragStart">
          <div v-if="showHeader" class="hs-dialog__header" ref="headerRef">
            <slot name="header">
              <span class="hs-dialog__title">{{ title }}</span>
            </slot>
            <button v-if="showClose" class="hs-dialog__close-btn" type="button" @click="handleClose">
              <slot name="close-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </slot>
            </button>
          </div>

          <div v-if="!destroyOnClose || modelValue" class="hs-dialog__body" ref="bodyRef">
            <slot />
          </div>

          <div v-if="$slots.footer && (!destroyOnClose || modelValue)" class="hs-dialog__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export default {
  name: 'HsDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    width: {
      type: [String, Number],
      default: '50%'
    },
    fullscreen: {
      type: Boolean,
      default: false
    },
    modal: {
      type: Boolean,
      default: true
    },
    lockScroll: {
      type: Boolean,
      default: true
    },
    closeOnClickModal: {
      type: Boolean,
      default: true
    },
    closeOnPressEscape: {
      type: Boolean,
      default: true
    },
    showClose: {
      type: Boolean,
      default: true
    },
    draggable: {
      type: Boolean,
      default: false
    },
    destroyOnClose: {
      type: Boolean,
      default: false
    },
    closeIcon: {
      type: String,
      default: 'Close'
    }
  },
  emits: ['update:modelValue', 'open', 'opened', 'close', 'closed'],
  setup(props, { emit }) {
    const dialogRef = ref(null)
    const headerRef = ref(null)
    const bodyRef = ref(null)
    const isDragging = ref(false)
    const dragOffset = ref({ x: 0, y: 0 })
    const dragPosition = ref({ x: 0, y: 0 })
    let originalPosition = null

    const dialogStyle = computed(() => {
      if (props.fullscreen) {
        return {
          width: '100vw',
          height: '100vh',
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0
        }
      }

      const style = {}
      if (typeof props.width === 'number') {
        style.width = `${props.width}px`
      } else if (typeof props.width === 'string') {
        style.width = props.width
      }

      if (props.draggable) {
        style.transform = `translate(${dragPosition.value.x}px, ${dragPosition.value.y}px)`
        style.transition = isDragging.value ? 'none' : 'transform 0.2s ease'
      }

      return style
    })

    function handleClose() {
      emit('update:modelValue', false)
      emit('close')
    }

    function handleMaskClick() {
      if (props.closeOnClickModal) {
        handleClose()
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape' && props.modelValue && props.closeOnPressEscape) {
        e.preventDefault()
        handleClose()
      }
    }

    function handleDragStart(e) {
      if (!props.draggable || !headerRef.value || !headerRef.value.contains(e.target)) return

      e.preventDefault()
      isDragging.value = true

      const rect = dialogRef.value.getBoundingClientRect()
      dragOffset.value = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      }

      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.body.style.userSelect = 'none'
    }

    function handleDragMove(e) {
      if (!isDragging.value) return

      const containerRect = document.querySelector('.hs-dialog-wrapper').getBoundingClientRect()
      const dialogRect = dialogRef.value.getBoundingClientRect()

      let newX = e.clientX - containerRect.width / 2 - dragOffset.value.x
      let newY = e.clientY - containerRect.height / 2 - dragOffset.value.y

      const maxX = containerRect.width / 2 - dialogRect.width / 2
      const maxY = containerRect.height / 2 - dialogRect.height / 2

      newX = Math.max(-maxX, Math.min(maxX, newX))
      newY = Math.max(-maxY, Math.min(maxY, newY))

      dragPosition.value = { x: newX, y: newY }
    }

    function handleDragEnd() {
      isDragging.value = false
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.body.style.userSelect = ''
    }

    function onAfterEnter() {
      emit('opened')
    }

    function onAfterLeave() {
      emit('closed')
      if (props.draggable) {
        dragPosition.value = { x: 0, y: 0 }
      }
    }

    function lockBodyScroll() {
      if (props.lockScroll) {
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
        document.body.style.overflow = 'hidden'
        document.body.style.paddingRight = `${scrollBarWidth}px`
      }
    }

    function unlockBodyScroll() {
      if (props.lockScroll) {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
    }

    watch(
      () => props.modelValue,
      val => {
        if (val) {
          emit('open')
          nextTick(() => {
            lockBodyScroll()
          })
        } else {
          unlockBodyScroll()
        }
      }
    )

    onMounted(() => {
      document.addEventListener('keydown', handleKeyDown)
      if (props.modelValue) {
        lockBodyScroll()
      }
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
    })

    const showHeader = computed(() => {
      return props.title || props.showClose || !!$slots.header
    })

    return {
      dialogRef,
      headerRef,
      bodyRef,
      isDragging,
      dialogStyle,
      showHeader,
      handleClose,
      handleMaskClick,
      handleDragStart,
      onAfterEnter,
      onAfterLeave
    }
  }
}
</script>

<style scoped>
.hs-dialog-wrapper {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(59, 57, 57, 0.3) ;
  backdrop-filter: blur(1px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.hs-dialog--no-mask {
  background: transparent;
  backdrop-filter: none;
}

.hs-dialog--fullscreen {
  padding: 0;
}

.hs-dialog {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: rgba(13, 17, 23, 0.98);
  border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 12px);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hs-dialog--fullscreen .hs-dialog {
  max-width: none;
  max-height: none;
  border-radius: 0;
  padding: 16px;
}

.hs-dialog--draggable {
  cursor: move;
}

.hs-dialog--draggable .hs-dialog__header {
  cursor: grab;
}

.hs-dialog--draggable .hs-dialog__header:active {
  cursor: grabbing;
}

.hs-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
  flex-shrink: 0;
}

.hs-dialog__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #e0e0e0);
  line-height: 1.4;
  letter-spacing: -0.3px;
}

.hs-dialog__close-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.6);
  border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary, #888);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  z-index: 10;
  margin-left: auto;
  flex-shrink: 0;
}

.hs-dialog__close-btn:hover {
  background: rgba(255, 23, 68, 0.2);
  border-color: var(--accent-red, #ff1744);
  color: var(--accent-red, #ff1744);
  transform: rotate(90deg);
}

.hs-dialog__body {
  padding: 20px 24px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
}

.hs-dialog__footer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.hs-dialog-enter-active {
  animation: hsDialogFadeIn 0.3s ease;
}

.hs-dialog-leave-active {
  animation: hsDialogFadeOut 0.25s ease;
}

@keyframes hsDialogFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes hsDialogFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.hs-dialog-enter-active .hs-dialog {
  animation: hsDialogScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hs-dialog-leave-active .hs-dialog {
  animation: hsDialogScaleOut 0.25s ease;
}

@keyframes hsDialogScaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes hsDialogScaleOut {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.9);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .hs-dialog-wrapper {
    padding: 12px;
  }

  .hs-dialog {
    max-width: 95vw;
    max-height: 92vh;
  }

  .hs-dialog__header {
    padding: 16px 18px 12px;
  }

  .hs-dialog__body {
    padding: 16px 18px;
  }

  .hs-dialog__footer {
    padding: 14px 18px 16px;
  }
}

@media (max-width: 480px) {
  .hs-dialog {
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
  }

  .hs-dialog-wrapper {
    padding: 0;
  }
}
</style>
