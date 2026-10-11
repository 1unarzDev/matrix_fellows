<script setup lang="ts">
const props = defineProps<{ title: string; compact?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
let previousFocus: HTMLElement | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null
const closing = ref(false)
onBeforeMount(() => {
  previousFocus = document.activeElement as HTMLElement
})
onMounted(() => {
  dialog.value?.showModal()
})
onBeforeUnmount(() => dialog.value?.close())
onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
})
onUnmounted(() =>
  nextTick(() => {
    if (previousFocus?.isConnected) previousFocus.focus()
  }),
)
function close() {
  if (closing.value) return
  closing.value = true
  closeTimer = setTimeout(() => emit('close'), 180)
}
function backdrop(event: MouseEvent) {
  if (!dialog.value || event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    close()
}
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="dashboard-dialog"
      :class="{ 'dashboard-dialog--compact': compact, 'dashboard-dialog--closing': closing }"
      aria-labelledby="dashboard-dialog-title"
      @cancel.prevent="close"
      @click="backdrop"
    >
      <header>
        <h2 id="dashboard-dialog-title">{{ props.title }}</h2>
        <button aria-label="Close panel" @click="close">×</button>
      </header>
      <div class="dashboard-dialog-body"><slot /></div></dialog
  ></Teleport>
</template>
<style scoped>
.dashboard-dialog {
  --wb-ink: #efeee8;
  --wb-muted: #b0adb8;
  --wb-line: #ffffff13;
  --wb-gold: #d8b977;
  margin: auto;
  inset: 0;
  width: min(700px, calc(100% - 32px));
  max-height: calc(100svh - 48px);
  padding: 0;
  border: 1px solid #ffffff24;
  border-radius: 20px;
  background: rgb(23 24 33 / 88%);
  backdrop-filter: blur(24px) saturate(1.12);
  color: #efeee8;
  box-shadow: 0 32px 120px #0009, inset 0 1px rgb(255 255 255 / 8%);
  font-family: Manrope, sans-serif;
  overflow: auto;
  animation: panel-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.dashboard-dialog::backdrop {
  background: #080910a8;
  backdrop-filter: blur(5px);
}
.dashboard-dialog--compact {
  width: min(540px, calc(100% - 32px));
}
.dashboard-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 28px;
  background: rgb(23 24 33 / 76%);
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid #ffffff12;
}
.dashboard-dialog h2 {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.025em;
  margin: 0;
}
.dashboard-dialog header button {
  width: 44px;
  height: 44px;
  background: #ffffff04;
  border: 1px solid #ffffff1c;
  border-radius: 50%;
  color: #efeee8;
  font-size: 24px;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
}
.dashboard-dialog header button:hover {
  transform: scale(1.05);
  border-color: rgb(216 185 119 / 45%);
  background: rgb(216 185 119 / 9%);
}
.dashboard-dialog header button:focus-visible {
  outline: 2px solid #d8b977;
  outline-offset: 3px;
}
.dashboard-dialog-body {
  padding: 28px;
  font-size: 14px;
  line-height: 1.7;
}
@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes panel-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(10px) scale(.985); }
}
.dashboard-dialog--closing { animation: panel-out .18s ease-in forwards; pointer-events: none; }
@media (max-width: 560px) {
  .dashboard-dialog {
    width: calc(100% - 16px);
    max-height: calc(100svh - 24px);
    border-radius: 16px;
  }
  .dashboard-dialog header,
  .dashboard-dialog-body {
    padding: 20px;
  }
  .dashboard-dialog h2 {
    font-size: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dashboard-dialog {
    animation: none;
  }
  .dashboard-dialog--closing { animation: none; }
  .dashboard-dialog::backdrop {
    backdrop-filter: none;
  }
  .dashboard-dialog header button { transition: none; }
}
</style>
