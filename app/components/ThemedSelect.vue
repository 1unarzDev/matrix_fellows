<script setup lang="ts">
const props = defineProps<{ modelValue: string; options: readonly string[]; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const open = ref(false)
const active = ref(0)
let search = '',
  lastTyped = 0
async function focusOption(index: number) {
  active.value = (index + props.options.length) % props.options.length
  await nextTick()
  root.value?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active.value]?.focus()
}
function close(returnFocus = false) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}
function show() {
  open.value = true
  void focusOption(Math.max(0, props.options.indexOf(props.modelValue)))
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
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    void focusOption(
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? props.options.length - 1
          : active.value + (event.key === 'ArrowDown' ? 1 : -1),
    )
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
    event.preventDefault()
    const now = Date.now()
    search = now - lastTyped > 700 ? event.key : search + event.key
    lastTyped = now
    const index = props.options.findIndex((option) =>
      option.toLowerCase().startsWith(search.toLowerCase()),
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
  <div ref="root" class="relative z-20 w-full sm:w-56" @focusout="focusOut">
    <button
      ref="trigger"
      type="button"
      :aria-label="`${label}: ${modelValue}`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="id"
      class="tactile flex w-full items-center justify-between gap-2 rounded-xl border border-paper/15 bg-paper/[.025] px-3 py-3.5 text-left text-xs text-paper/85 hover:border-acid/45 hover:bg-paper/5 sm:px-4 sm:text-sm"
      @click="open ? close() : show()"
      @keydown.down.prevent="show"
      @keydown.up.prevent="show"
    >
      <span class="min-w-0 truncate">{{ modelValue }}</span>
      <SiteIcon
        name="down"
        :size="14"
        class="shrink-0 text-acid transition-transform duration-500 motion-reduce:transition-none"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <Transition
      enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <div
        v-if="open"
        :id="id"
        role="listbox"
        :aria-label="label"
        class="absolute inset-x-0 top-full mt-2 origin-top overflow-hidden rounded-2xl border border-acid/25 bg-[#19202b]/95 p-1.5 shadow-[0_16px_50px_#0008,0_0_24px_#ae9afa12] backdrop-blur-xl"
        @keydown="keyboard"
      >
        <button
          v-for="(option, index) in options"
          :key="option"
          type="button"
          role="option"
          :aria-selected="modelValue === option"
          :tabindex="active === index ? 0 : -1"
          class="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-[transform,translate,background-color] duration-800 ease-[cubic-bezier(.4,0,.2,1)] hover:translate-x-0.5 hover:bg-white/5 focus:bg-acid/10 focus:outline-none motion-reduce:transform-none motion-reduce:translate-none motion-reduce:transition-none"
          :class="modelValue === option ? 'bg-acid/10 text-acid' : 'text-paper/70'"
          @click="choose(option)"
          @focus="active = index"
        >
          {{ option
          }}<span v-if="modelValue === option" aria-hidden="true" class="text-acid">✓</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
