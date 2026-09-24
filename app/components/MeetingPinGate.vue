<script setup lang="ts">
const props = defineProps<{ busy?: boolean; error?: string }>()
const emit = defineEmits<{ unlock: [pin: string] }>()
const pin = ref('')
const input = ref<HTMLInputElement>()
const submitting = ref(false)

const update = (value: string) => {
  pin.value = value.replace(/\D/g, '').slice(0, 8)
  if (pin.value.length === 8 && !props.busy && !submitting.value) {
    submitting.value = true
    emit('unlock', pin.value)
    setTimeout(() => (submitting.value = false), 450)
  }
}
watch(
  () => props.error,
  (value) => {
    if (value) pin.value = ''
  },
)
</script>

<template>
  <section class="pin-gate" :class="{ 'pin-gate--error': error }">
    <div class="pin-gate__orb" aria-hidden="true" />
    <div class="relative">
      <p class="text-[9px] uppercase tracking-[.2em] text-acid">Meeting studio</p>
      <h3 class="mt-3 font-display text-3xl tracking-[-.045em]">Shape the next gathering.</h3>
      <p class="mt-4 max-w-md text-sm leading-6 text-paper/52">
        Enter the organizer PIN to schedule, revise, or archive meetings. This unlocks meeting
        details only; member responses remain behind owner sign-in.
      </p>

      <label class="mt-9 block">
        <span class="sr-only">Eight-digit meeting organizer PIN</span>
        <span class="pin-digits" aria-hidden="true" @click="input?.focus()">
          <span
            v-for="index in 8"
            :key="index"
            class="pin-digit"
            :class="{
              'pin-digit--filled': pin.length >= index,
              'pin-digit--cursor': pin.length === index - 1 && !busy,
            }"
          >
            <Transition name="pin-pop" mode="out-in">
              <span v-if="pin[index - 1]" :key="`${index}-${pin[index - 1]}`">{{
                pin[index - 1]
              }}</span>
              <span v-else :key="`${index}-empty`" class="pin-digit__empty">·</span>
            </Transition>
          </span>
        </span>
        <input
          ref="input"
          :value="pin"
          type="password"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]*"
          maxlength="8"
          class="pin-input"
          :disabled="busy"
          @input="update(($event.target as HTMLInputElement).value)"
        />
      </label>
      <div class="mt-5 flex min-h-11 items-center justify-between gap-4">
        <p aria-live="polite" class="text-xs" :class="error ? 'text-rose-200' : 'text-paper/32'">
          {{ error || (busy ? 'Verifying securely…' : 'Eight digits · meeting access only') }}
        </p>
        <button
          type="button"
          :disabled="pin.length !== 8 || busy"
          class="rounded-full border border-acid/30 bg-acid/[.07] px-5 py-2.5 text-xs text-acid hover:-translate-y-0.5 hover:border-acid/55 hover:bg-acid/[.11] disabled:translate-y-0 disabled:opacity-30"
          @click="emit('unlock', pin)"
        >
          {{ busy ? 'Opening…' : 'Unlock' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pin-gate {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(244 241 233 / 10%);
  border-radius: 1.75rem;
  padding: clamp(1.35rem, 5vw, 2.25rem);
  background: linear-gradient(145deg, rgb(244 241 233 / 5.5%), rgb(197 192 235 / 2.5%));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 6%),
    0 30px 80px rgb(0 0 0 / 18%);
  backdrop-filter: blur(24px) saturate(125%);
}
.pin-gate__orb {
  position: absolute;
  width: 15rem;
  height: 15rem;
  right: -7rem;
  top: -8rem;
  border-radius: 999px;
  background: radial-gradient(circle, rgb(197 192 235 / 15%), transparent 68%);
  animation: pin-breathe 5s ease-in-out infinite alternate;
}
.pin-digits {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: clamp(0.3rem, 1.5vw, 0.55rem);
  cursor: text;
}
.pin-digit {
  position: relative;
  display: grid;
  min-width: 0;
  aspect-ratio: 0.8;
  place-items: center;
  border: 1px solid rgb(244 241 233 / 10%);
  border-radius: 0.75rem;
  color: rgb(244 241 233 / 28%);
  background: rgb(244 241 233 / 2.8%);
  font-family: var(--font-mono, monospace);
  font-size: clamp(0.9rem, 4vw, 1.2rem);
  transition:
    border-color 280ms ease,
    background-color 280ms ease,
    transform 500ms cubic-bezier(0.16, 1.3, 0.3, 1),
    box-shadow 400ms ease;
}
.pin-digit--filled {
  color: var(--color-paper);
  border-color: rgb(197 192 235 / 32%);
  background: rgb(197 192 235 / 7%);
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgb(84 71 123 / 12%),
    inset 0 1px 0 rgb(255 255 255 / 8%);
}
.pin-digit--cursor::after {
  content: '';
  position: absolute;
  width: 1px;
  height: 1.1rem;
  background: var(--color-acid);
  box-shadow: 0 0 8px currentColor;
  animation: pin-caret 1s steps(1) infinite;
}
.pin-digit__empty {
  opacity: 0.45;
}
.pin-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.pin-pop-enter-active {
  transition:
    opacity 220ms ease,
    transform 480ms cubic-bezier(0.16, 1.35, 0.3, 1);
}
.pin-pop-leave-active {
  transition: opacity 120ms ease;
}
.pin-pop-enter-from {
  opacity: 0;
  transform: translateY(7px) scale(0.7);
}
.pin-pop-leave-to {
  opacity: 0;
}
.pin-gate--error .pin-digits {
  animation: pin-shake 420ms ease;
}
@keyframes pin-caret {
  50% {
    opacity: 0;
  }
}
@keyframes pin-breathe {
  to {
    transform: translate(-1rem, 1rem) scale(1.08);
  }
}
@keyframes pin-shake {
  25% {
    transform: translateX(-5px);
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pin-gate__orb,
  .pin-digit--cursor::after,
  .pin-gate--error .pin-digits {
    animation: none;
  }
  .pin-digit,
  .pin-pop-enter-active,
  .pin-pop-leave-active {
    transition: none;
  }
}
</style>
