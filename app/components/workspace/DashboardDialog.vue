<script setup lang="ts">
const props = defineProps<{ title: string; compact?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
let previousFocus: HTMLElement | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null
const closing = ref(false)
const celebratory = ref(false)
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
/** Mark a successful save before the caller closes the panel. */
function celebrate() {
  if (closing.value) return
  celebratory.value = true
}
defineExpose({ close, celebrate })
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
      :class="{
        'dashboard-dialog--compact': compact,
        'dashboard-dialog--closing': closing,
        'dashboard-dialog--celebrating': celebratory,
      }"
      aria-labelledby="dashboard-dialog-title"
      @cancel.prevent="close"
      @click="backdrop"
    >
      <span class="dashboard-dialog__glow" aria-hidden="true" />
      <span class="dashboard-dialog__grain" aria-hidden="true" />
      <span class="dashboard-dialog__sparkles" aria-hidden="true">
        <i v-for="index in 8" :key="index" :style="{ '--spark-index': index }" />
      </span>
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
  background:
    radial-gradient(34rem 20rem at 100% 0%, rgb(216 185 119 / 8%), transparent 70%),
    linear-gradient(145deg, rgb(244 241 233 / 6%), rgb(244 241 233 / 2.4%) 50%, transparent 82%),
    rgb(18 19 27 / 78%);
  backdrop-filter: blur(30px) saturate(1.16);
  color: #efeee8;
  box-shadow:
    0 32px 120px #0009,
    inset 0 1px rgb(255 255 255 / 8%);
  font-family: Manrope, sans-serif;
  overflow: auto;
  isolation: isolate;
  animation: panel-in 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}
.dashboard-dialog__glow,
.dashboard-dialog__grain,
.dashboard-dialog__sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}
.dashboard-dialog__glow {
  background: radial-gradient(ellipse at 100% 0%, rgb(244 241 233 / 8%), transparent 60%);
  opacity: 0.6;
  transition: opacity 650ms ease;
}
.dashboard-dialog__grain {
  background: url('/textures/glass-grain.svg') repeat;
  opacity: 0.09;
  mix-blend-mode: soft-light;
}
.dashboard-dialog__sparkles i {
  position: absolute;
  left: var(--spark-left);
  top: var(--spark-top);
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgb(228 187 114 / 75%);
  box-shadow: 0 0 12px rgb(228 187 114 / 50%);
  opacity: 0;
}
.dashboard-dialog__sparkles i:nth-child(1) {
  --spark-left: 8%;
  --spark-top: 14%;
  --spark-x: -8px;
  --spark-y: -18px;
}
.dashboard-dialog__sparkles i:nth-child(2) {
  --spark-left: 24%;
  --spark-top: 28%;
  --spark-x: 6px;
  --spark-y: -22px;
}
.dashboard-dialog__sparkles i:nth-child(3) {
  --spark-left: 41%;
  --spark-top: 11%;
  --spark-x: -6px;
  --spark-y: -20px;
}
.dashboard-dialog__sparkles i:nth-child(4) {
  --spark-left: 58%;
  --spark-top: 35%;
  --spark-x: 8px;
  --spark-y: -18px;
}
.dashboard-dialog__sparkles i:nth-child(5) {
  --spark-left: 74%;
  --spark-top: 16%;
  --spark-x: -6px;
  --spark-y: -24px;
}
.dashboard-dialog__sparkles i:nth-child(6) {
  --spark-left: 87%;
  --spark-top: 45%;
  --spark-x: 6px;
  --spark-y: -20px;
}
.dashboard-dialog__sparkles i:nth-child(7) {
  --spark-left: 32%;
  --spark-top: 70%;
  --spark-x: -7px;
  --spark-y: -18px;
}
.dashboard-dialog__sparkles i:nth-child(8) {
  --spark-left: 68%;
  --spark-top: 78%;
  --spark-x: 7px;
  --spark-y: -22px;
}
.dashboard-dialog--celebrating .dashboard-dialog__glow {
  opacity: 1;
  animation: dialog-glow 850ms ease-out both;
}
.dashboard-dialog--celebrating .dashboard-dialog__sparkles i {
  animation: dialog-spark 720ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--spark-index) * 35ms);
}
.dashboard-dialog header,
.dashboard-dialog-body {
  position: relative;
  z-index: 1;
}
.dashboard-dialog::backdrop {
  background: #080910a8;
  backdrop-filter: blur(12px);
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
  transition:
    transform 180ms ease,
    background 180ms ease,
    border-color 180ms ease;
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
  from {
    opacity: 1;
    transform: none;
  }
  to {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
}
.dashboard-dialog--closing {
  animation: panel-out 0.18s ease-in forwards;
  pointer-events: none;
}
@keyframes dialog-glow {
  0% {
    transform: scale(0.88);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}
@keyframes dialog-spark {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.6);
  }
  35% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(var(--spark-x), var(--spark-y)) scale(0);
  }
}
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
  .dashboard-dialog--closing {
    animation: none;
  }
  .dashboard-dialog::backdrop {
    backdrop-filter: none;
  }
  .dashboard-dialog header button {
    transition: none;
  }
  .dashboard-dialog--celebrating .dashboard-dialog__glow,
  .dashboard-dialog--celebrating .dashboard-dialog__sparkles i {
    animation: none;
  }
  .dashboard-dialog--celebrating .dashboard-dialog__glow {
    opacity: 1;
  }
}
</style>
