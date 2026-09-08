<script setup lang="ts">
import { joinGoals, joinGrades, joinInterests, joinSchema, joinStages } from '#shared/utils/join'

const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const heading = ref<HTMLElement>()
const visible = ref(false)
const step = ref(0)
const busy = ref(false)
const sent = ref(false)
const error = ref('')
const typing = ref(false)
let typingTimer: ReturnType<typeof setTimeout> | undefined
let previousFocus: HTMLElement | null = null
let wasLocked = false
const draft = useState('join-draft', () => ({
  requestId: '',
  name: '',
  email: '',
  grade: 'Choose your grade',
  interests: [] as string[],
  goals: [] as string[],
  stage: '',
  note: '',
  consent: false,
  website: '',
}))
const titles = [
  'A name behind the curiosity.',
  'What draws you in?',
  'Your next chapter starts here.',
]
const completion = computed(
  () =>
    [
      draft.value.name.trim(),
      draft.value.email.includes('@'),
      draft.value.grade !== 'Choose your grade',
    ].filter(Boolean).length,
)
function input() {
  typing.value = true
  clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    typing.value = false
  }, 650)
}
function toggle(field: 'interests' | 'goals', value: string) {
  const values = draft.value[field]
  draft.value[field] = values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}
async function focusHeading() {
  await nextTick()
  heading.value?.focus({ preventScroll: true })
}
function next() {
  error.value = ''
  if (step.value === 0) {
    const result = joinSchema.pick({ name: true, email: true, grade: true }).safeParse(draft.value)
    if (!result.success) {
      error.value = result.error.issues[0]!.message
      return
    }
  }
  if (step.value === 1) {
    const result = joinSchema.pick({ interests: true, stage: true }).safeParse(draft.value)
    if (!result.success) {
      error.value = result.error.issues[0]!.message
      return
    }
  }
  step.value++
}
function back() {
  step.value--
  error.value = ''
}
async function submit() {
  if (busy.value) return
  error.value = ''
  const parsed = joinSchema.safeParse(draft.value)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]!.message
    return
  }
  busy.value = true
  try {
    await $fetch('/api/join', { method: 'POST', body: parsed.data, retry: 0 })
    sent.value = true
  } catch (err) {
    error.value =
      (err as { data?: { statusMessage?: string } }).data?.statusMessage ||
      'Your response wasn’t confirmed. Please try again; your answers are still here.'
  } finally {
    busy.value = false
  }
}
function close() {
  if (!busy.value) visible.value = false
}
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const elements = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
    ) || [],
  ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0)
  const first = elements[0],
    last = elements.at(-1)
  if (!first || !last) {
    event.preventDefault()
    return
  }
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === heading.value)
  ) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
function finishClose() {
  dialog.value?.close()
  emit('close')
}
onMounted(async () => {
  previousFocus = document.activeElement as HTMLElement
  wasLocked = document.body.classList.contains('overflow-hidden')
  document.body.classList.add('overflow-hidden')
  if (!draft.value.requestId) draft.value.requestId = crypto.randomUUID()
  dialog.value?.showModal()
  visible.value = true
  await focusHeading()
})
onBeforeUnmount(() => {
  clearTimeout(typingTimer)
  if (!wasLocked) document.body.classList.remove('overflow-hidden')
  previousFocus?.focus({ preventScroll: true })
  if (sent.value) clearNuxtState('join-draft')
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      aria-labelledby="join-title"
      class="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 font-sans text-paper outline-none backdrop:bg-transparent [--color-acid:#c5c0eb]"
      @cancel.prevent="close"
      @keydown="trapFocus"
    >
      <Transition
        appear
        enter-active-class="transition-opacity duration-700 ease-out [&>section]:transition-[transform,opacity] [&>section]:duration-700 [&>section]:ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none motion-reduce:[&>section]:transition-none"
        enter-from-class="opacity-0 [&>section]:translate-y-10 [&>section]:scale-95 motion-reduce:[&>section]:transform-none"
        enter-to-class="opacity-100 [&>section]:translate-y-0 [&>section]:scale-100"
        leave-active-class="transition-opacity duration-500 ease-in-out motion-reduce:transition-none"
        leave-to-class="opacity-0"
        @after-leave="finishClose"
      >
        <div
          v-if="visible"
          class="flex h-full items-center justify-center bg-ink/65 p-3 sm:p-8"
          @click.self="close"
        >
          <section
            data-lenis-prevent
            class="relative isolate flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-paper/20 bg-[#141b24]/90 shadow-[0_30px_120px_#00000080,inset_0_1px_0_#ffffff12] backdrop-blur-xl sm:max-h-[calc(100dvh-4rem)] sm:rounded-[2rem]"
          >
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-linear-to-br from-white/[.045] via-transparent to-[#abc7df]/[.025]"
            />
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-[url('/textures/glass-grain.svg')] bg-repeat opacity-[.09] mix-blend-soft-light"
            />
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#a8a1ed22,transparent_60%)] transition-opacity duration-1000 motion-reduce:transition-none"
              :class="typing ? 'opacity-100' : 'opacity-45'"
            />
            <header
              class="relative flex shrink-0 items-center justify-between px-6 pb-4 pt-6 sm:px-9 sm:pt-8"
            >
              <div class="flex items-center gap-3">
                <MatrixMark :size="28" class="text-acid" /><span
                  class="text-[10px] uppercase tracking-[.2em] text-paper/60"
                  >Become a fellow</span
                >
              </div>
              <button
                type="button"
                aria-label="Close join form"
                :disabled="busy"
                class="grid h-11 w-11 place-items-center rounded-full border border-paper/10 text-paper/60 transition-[background-color,transform,color] duration-700 ease-[cubic-bezier(.45,0,.25,1)] hover:scale-105 hover:bg-acid/10 hover:text-paper focus-visible:outline-acid disabled:opacity-30 motion-reduce:transform-none motion-reduce:transition-none"
                @click="close"
              >
                <SiteIcon name="close" :size="16" />
              </button>
            </header>
            <div
              v-if="!sent"
              class="relative mx-6 mb-6 flex gap-2 sm:mx-9"
              aria-label="Form progress"
            >
              <div
                v-for="(_, index) in titles"
                :key="index"
                class="h-1 flex-1 overflow-hidden rounded-full bg-paper/10"
              >
                <div
                  class="h-full origin-left rounded-full bg-linear-to-r from-[#98ccdd] to-[#c5c0eb] transition-transform duration-1000 ease-[cubic-bezier(.45,0,.25,1)] motion-reduce:transition-none"
                  :class="index <= step ? 'scale-x-100' : 'scale-x-0'"
                />
              </div>
            </div>
            <div
              class="relative overflow-y-auto overscroll-contain px-6 pb-7 [scrollbar-width:thin] sm:px-9 sm:pb-9"
            >
              <Transition
                mode="out-in"
                enter-active-class="transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                enter-from-class="translate-y-5 opacity-0 motion-reduce:translate-y-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none"
                leave-to-class="-translate-y-2 opacity-0 motion-reduce:translate-y-0"
                @after-enter="focusHeading"
              >
                <div :key="sent ? 'sent' : step">
                  <p class="mb-3 text-[10px] uppercase tracking-[.18em] text-acid/65">
                    {{
                      sent
                        ? 'A new connection'
                        : `0${step + 1} / 03 · ${['Introduce yourself', 'Follow your curiosity', 'Find your place'][step]}`
                    }}
                  </p>
                  <h2
                    id="join-title"
                    ref="heading"
                    tabindex="-1"
                    class="max-w-lg font-display text-3xl leading-tight tracking-[-.04em] outline-none sm:text-4xl"
                  >
                    {{ sent ? 'You’re part of the possibility.' : titles[step] }}
                  </h2>
                  <template v-if="sent">
                    <p class="mt-5 text-sm leading-relaxed text-paper/65">
                      Thank you for reaching out. We’ve received your interest in Matrix Fellows. If
                      you’ve already joined with this email, your existing response is kept.
                    </p>
                    <p class="mt-4 text-sm text-paper/50">
                      Questions?
                      <a
                        href="mailto:contact@matrixfellows.com"
                        class="text-acid underline underline-offset-4"
                        >Contact us.</a
                      >
                    </p>
                    <button
                      class="tactile mt-8 rounded-full bg-acid px-6 py-3 text-sm text-ink"
                      @click="close"
                    >
                      Back to exploring <span aria-hidden="true">↗</span>
                    </button>
                  </template>
                  <form
                    v-else
                    class="mt-6"
                    novalidate
                    @submit.prevent="step < 2 ? next() : submit()"
                    @input="input"
                  >
                    <div v-if="step === 0" class="space-y-5">
                      <p class="text-sm leading-relaxed text-paper/55">
                        No publications or perfect ideas required. Just a question you want to
                        follow.
                      </p>
                      <AdminField v-model="draft.name" label="Your name" /><AdminField
                        v-model="draft.email"
                        label="Email"
                        type="email"
                      />
                      <div>
                        <p class="mb-2.5 text-[11px] tracking-wide text-paper/55">Grade level</p>
                        <ThemedSelect
                          v-model="draft.grade"
                          :options="joinGrades"
                          label="Grade level"
                        />
                      </div>
                      <div class="flex items-center gap-2" aria-hidden="true">
                        <span
                          v-for="i in 3"
                          :key="i"
                          class="h-1.5 w-1.5 rounded-full transition-[transform,background-color] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
                          :class="completion >= i ? 'scale-125 bg-acid' : 'bg-paper/20'"
                        /><span class="ml-2 text-[10px] text-paper/35"
                          >A little introduction goes a long way.</span
                        >
                      </div>
                    </div>
                    <div v-if="step === 1" class="space-y-6">
                      <fieldset>
                        <legend class="mb-3 text-xs text-paper/60">
                          What interests you? Choose any that fit.
                        </legend>
                        <div class="flex flex-wrap gap-2">
                          <button
                            v-for="interest in joinInterests"
                            :key="interest"
                            type="button"
                            :aria-pressed="draft.interests.includes(interest)"
                            class="rounded-2xl border px-4 py-3 text-left text-xs transition-[transform,background-color,border-color,box-shadow] duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-[1.025] hover:border-acid/45 focus-visible:outline-acid motion-reduce:transform-none motion-reduce:transition-none"
                            :class="
                              draft.interests.includes(interest)
                                ? 'border-acid/45 bg-acid/10 text-acid shadow-[0_0_22px_#c5c0eb0c]'
                                : 'border-paper/15 text-paper/65'
                            "
                            @click="toggle('interests', interest)"
                          >
                            {{ interest }}
                          </button>
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend class="mb-3 text-xs text-paper/60">
                          What’s your current research experience?
                        </legend>
                        <div class="grid grid-cols-2 gap-2">
                          <button
                            v-for="stage in joinStages"
                            :key="stage"
                            type="button"
                            :aria-pressed="draft.stage === stage"
                            class="rounded-xl border p-3 text-left text-xs leading-relaxed transition-[background-color,border-color,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:translate-y-[-2px] focus-visible:outline-acid motion-reduce:transform-none motion-reduce:transition-none"
                            :class="
                              draft.stage === stage
                                ? 'border-acid/40 bg-acid/10 text-acid'
                                : 'border-paper/10 text-paper/55'
                            "
                            @click="draft.stage = stage"
                          >
                            {{ stage }}
                          </button>
                        </div>
                      </fieldset>
                    </div>
                    <div v-if="step === 2" class="space-y-5">
                      <fieldset>
                        <legend class="mb-3 text-xs text-paper/60">
                          What would you like to get out of meetings?
                        </legend>
                        <div class="flex flex-wrap gap-2">
                          <button
                            v-for="goal in joinGoals"
                            :key="goal"
                            type="button"
                            :aria-pressed="draft.goals.includes(goal)"
                            class="rounded-full border px-4 py-3 text-xs transition-[transform,background-color,border-color] duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-[1.025] focus-visible:outline-acid motion-reduce:transform-none motion-reduce:transition-none"
                            :class="
                              draft.goals.includes(goal)
                                ? 'border-acid/45 bg-acid/10 text-acid'
                                : 'border-paper/15 text-paper/65'
                            "
                            @click="toggle('goals', goal)"
                          >
                            {{ goal }}
                          </button>
                        </div>
                      </fieldset>
                      <div>
                        <AdminField
                          v-model="draft.note"
                          label="Anything else? · optional"
                          placeholder="Ideas for the club, feedback, or something you’d like to talk about…"
                          multiline
                          :maxlength="1000"
                        />
                        <p class="mt-2 text-right text-[10px] text-paper/35">
                          {{ draft.note.length }} / 1,000
                        </p>
                      </div>
                      <p class="text-[11px] leading-relaxed text-paper/50">
                        Your response is stored privately in our database and may be copied to an
                        organizer-only Google Sheet. We use it to contact you about Matrix Fellows.
                        Sponsor reports contain aggregate counts, not your name, email, or answers.
                        Please avoid sensitive personal details. Request removal at
                        contact@matrixfellows.com.
                      </p>
                      <label
                        class="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-paper/70"
                        ><input
                          v-model="draft.consent"
                          type="checkbox"
                          class="mt-0.5 h-4 w-4 shrink-0 accent-acid"
                        />I agree to this use of my response and to being contacted about Matrix
                        Fellows.</label
                      >
                    </div>
                    <label class="hidden" aria-hidden="true"
                      >Website<input v-model="draft.website" tabindex="-1" autocomplete="off"
                    /></label>
                    <p
                      v-if="error"
                      role="alert"
                      class="mt-5 rounded-xl border border-rose-200/15 bg-rose-200/5 p-3 text-xs leading-relaxed text-rose-200"
                    >
                      {{ error }}
                    </p>
                    <div class="mt-7 flex items-center justify-between gap-4">
                      <button
                        v-if="step"
                        type="button"
                        :disabled="busy"
                        class="min-h-11 px-2 text-xs text-paper/55 transition-colors duration-700 hover:text-paper disabled:opacity-30"
                        @click="back"
                      >
                        Back</button
                      ><span v-else class="text-[10px] text-paper/35">About a minute.</span>
                      <button
                        :disabled="busy"
                        class="group flex min-h-12 items-center gap-5 rounded-full bg-acid px-6 py-3 text-sm font-medium text-ink transition-[transform,box-shadow,background-color] duration-[900ms] ease-[cubic-bezier(.45,0,.25,1)] hover:scale-[1.035] hover:shadow-[0_5px_32px_#c5c0eb25] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acid disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        {{
                          busy
                            ? 'Sending your response…'
                            : step < 2
                              ? 'Continue'
                              : 'Join Matrix Fellows'
                        }}<SiteIcon
                          v-if="!busy"
                          :size="16"
                          class="transition-transform duration-700 group-hover:translate-x-1 motion-reduce:transform-none"
                        />
                      </button>
                    </div>
                  </form>
                </div>
              </Transition>
            </div>
          </section>
        </div>
      </Transition>
    </dialog>
  </Teleport>
</template>
