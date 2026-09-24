<script setup lang="ts">
type SelectOption = string | { value: string; label: string; description?: string }

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly SelectOption[]
    label: string
    align?: 'left' | 'right'
    compact?: boolean
    fullWidth?: boolean
  }>(),
  { align: 'left', compact: false, fullWidth: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const menu = ref<HTMLElement>()
const open = ref(false)
const active = ref(0)
const placement = ref<'up' | 'down'>('down')
let search = ''
let lastTyped = 0

const normalized = computed(() =>
  props.options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  ),
)
const current = computed(
  () =>
    normalized.value.find((option) => option.value === props.modelValue) || {
      value: props.modelValue,
      label: props.modelValue,
    },
)

async function focusOption(index: number) {
  if (!normalized.value.length) return
  active.value = (index + normalized.value.length) % normalized.value.length
  await nextTick()
  root.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active.value]?.focus()
}
function close(returnFocus = false) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}
function positionMenu() {
  if (!root.value || !trigger.value || !menu.value) return
  const triggerBounds = trigger.value.getBoundingClientRect()
  const menuHeight = menu.value.getBoundingClientRect().height
  let topBoundary = 8
  let bottomBoundary = window.innerHeight - 8

  for (let ancestor = root.value.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor)
    if (!/(auto|scroll|hidden|clip)/.test(`${style.overflow} ${style.overflowY}`)) continue
    const bounds = ancestor.getBoundingClientRect()
    topBoundary = Math.max(topBoundary, bounds.top)
    bottomBoundary = Math.min(bottomBoundary, bounds.bottom)
  }

  const spaceAbove = triggerBounds.top - topBoundary - 8
  const spaceBelow = bottomBoundary - triggerBounds.bottom - 8
  placement.value = spaceBelow < menuHeight && spaceAbove > spaceBelow ? 'up' : 'down'
}
async function show(direction: 1 | -1 = 1) {
  open.value = true
  const selected = normalized.value.findIndex((option) => option.value === props.modelValue)
  const fallback = direction > 0 ? 0 : normalized.value.length - 1
  active.value = selected >= 0 ? selected : fallback
  await nextTick()
  positionMenu()
  await nextTick()
  menu.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active.value]?.focus({
    preventScroll: true,
  })
}
function choose(value: string) {
  emit('update:modelValue', value)
  close(true)
}
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  } else if (event.key === 'Tab') {
    close()
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    void focusOption(
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? normalized.value.length - 1
          : active.value + (event.key === 'ArrowDown' ? 1 : -1),
    )
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
    event.preventDefault()
    const now = Date.now()
    search = now - lastTyped > 700 ? event.key : search + event.key
    lastTyped = now
    const index = normalized.value.findIndex((option) =>
      option.label.toLowerCase().startsWith(search.toLowerCase()),
    )
    if (index >= 0) void focusOption(index)
  }
}
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}
function focusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) close()
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <div
    ref="root"
    class="themed-select relative z-20 w-full"
    :class="compact ? 'w-auto' : fullWidth ? 'sm:w-full' : 'sm:w-56'"
    @focusout="focusOut"
  >
    <button
      ref="trigger"
      type="button"
      :aria-label="`${label}: ${current?.label || modelValue}`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="id"
      class="themed-select__trigger flex min-h-11 w-full items-center justify-between gap-3 border border-paper/15 bg-paper/[.025] text-left text-paper/85"
      :class="
        compact ? 'rounded-full px-5 text-xs' : 'rounded-xl px-3 py-3.5 text-xs sm:px-4 sm:text-sm'
      "
      @click="open ? close() : show()"
      @keydown.down.prevent="show(1)"
      @keydown.up.prevent="show(-1)"
    >
      <span class="min-w-0 truncate">{{ current?.label || modelValue }}</span>
      <SiteIcon name="down" :size="14" class="themed-select__chevron shrink-0 text-acid" />
    </button>

    <Transition name="select-pop">
      <div
        v-if="open"
        ref="menu"
        :id="id"
        role="listbox"
        :aria-label="label"
        class="themed-select__menu absolute min-w-full overflow-hidden rounded-2xl p-2.5"
        :class="[
          align === 'right' ? 'right-0' : 'left-0',
          placement === 'up'
            ? 'themed-select__menu--up bottom-full mb-2 origin-bottom'
            : 'top-full mt-2 origin-top',
        ]"
        @keydown="keyboard"
      >
        <button
          v-for="(option, index) in normalized"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="modelValue === option.value"
          :tabindex="active === index ? 0 : -1"
          class="themed-select__option group flex min-h-12 w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left focus:outline-none"
          :class="modelValue === option.value ? 'bg-acid/10 text-acid' : 'text-paper/70'"
          :style="`--option-index:${index}`"
          @click="choose(option.value)"
          @focus="active = index"
        >
          <span
            class="themed-select__indicator h-2 w-2 shrink-0 rounded-full border border-current"
            :class="
              modelValue === option.value ? 'bg-acid shadow-[0_0_9px_#eac27980]' : 'opacity-35'
            "
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block text-sm">{{ option.label }}</span>
            <span
              v-if="option.description"
              class="mt-0.5 block text-[10px] leading-4 text-paper/40"
            >
              {{ option.description }}
            </span>
          </span>
          <span v-if="modelValue === option.value" aria-hidden="true" class="text-xs text-acid"
            >✓</span
          >
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.themed-select__trigger {
  transform: translate3d(0, 0, 0);
  transition:
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 260ms ease,
    background-color 260ms ease,
    box-shadow 360ms ease;
}
.themed-select__trigger:hover,
.themed-select__trigger[aria-expanded='true'] {
  border-color: color-mix(in srgb, var(--color-acid) 46%, transparent);
  background: color-mix(in srgb, var(--color-paper) 5%, transparent);
  box-shadow: 0 9px 28px rgb(0 0 0 / 13%);
  transform: translate3d(0, -1px, 0);
}
.themed-select__trigger:active {
  transform: translate3d(0, 0, 0) scale(0.985);
  transition-duration: 90ms;
}
.themed-select__chevron {
  transform: rotate(0deg);
  transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
.themed-select__trigger[aria-expanded='true'] .themed-select__chevron {
  transform: rotate(180deg);
}
.themed-select__menu {
  width: max-content;
  max-width: min(22rem, calc(100vw - 2rem));
  border: 1px solid color-mix(in srgb, var(--color-paper) 14%, transparent);
  background:
    radial-gradient(
      85% 70% at 100% 0%,
      color-mix(in srgb, var(--color-acid) 5%, transparent),
      transparent 72%
    ),
    color-mix(in srgb, var(--color-paper) 3.5%, var(--color-ink));
  box-shadow:
    0 18px 55px rgb(0 0 0 / 42%),
    inset 0 1px 0 color-mix(in srgb, var(--color-paper) 5%, transparent);
  backdrop-filter: blur(12px);
}
.themed-select__option {
  opacity: 0;
  transform: translate3d(0, -5px, 0);
  animation: option-arrive 260ms cubic-bezier(0.22, 1, 0.36, 1)
    calc(var(--option-index) * 24ms + 35ms) forwards;
  transition:
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms ease,
    background-color 180ms ease;
}
.themed-select__option:hover,
.themed-select__option:focus-visible {
  color: var(--color-acid);
  background: color-mix(in srgb, var(--color-acid) 9%, transparent);
  transform: translate3d(3px, 0, 0);
}
.themed-select__indicator {
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease,
    background-color 180ms ease;
}
.themed-select__option:hover .themed-select__indicator,
.themed-select__option:focus-visible .themed-select__indicator {
  opacity: 0.8;
  transform: scale(1.2);
}
.select-pop-enter-active {
  transition:
    opacity 220ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    clip-path 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.select-pop-leave-active {
  transition:
    opacity 140ms ease,
    transform 180ms ease,
    clip-path 180ms ease;
}
.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  clip-path: inset(0 0 100% 0 round 1rem);
  transform: translate3d(0, -7px, 0) scale(0.98);
}
.themed-select__menu--up.select-pop-enter-from,
.themed-select__menu--up.select-pop-leave-to {
  transform: translate3d(0, 7px, 0) scale(0.98);
}
.select-pop-enter-to,
.select-pop-leave-from {
  opacity: 1;
  clip-path: inset(0 0 0 0 round 1rem);
  transform: translate3d(0, 0, 0) scale(1);
}
@keyframes option-arrive {
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .themed-select__trigger,
  .themed-select__chevron,
  .themed-select__option,
  .themed-select__indicator,
  .select-pop-enter-active,
  .select-pop-leave-active {
    animation: none !important;
    opacity: 1;
    transform: none !important;
    transition: none !important;
  }
  .select-pop-enter-from,
  .select-pop-leave-to {
    clip-path: none;
  }
}
</style>
