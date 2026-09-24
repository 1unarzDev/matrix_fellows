<script setup lang="ts">
import {
  joinGoalSchema,
  joinGoals,
  joinGrades,
  joinIdentitySchema,
  joinInterestSchema,
  joinInterests,
  joinPermissionSchema,
  joinSchema,
  joinStages,
} from '#shared/utils/join'

const emit = defineEmits<{ close: [] }>()
const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const dialog = ref<HTMLDialogElement>()
const heading = ref<HTMLElement>()
const contentScroller = ref<HTMLElement>()
const visible = ref(props.embedded)
const hydrated = ref(false)
const step = ref(0)
const busy = ref(false)
const sent = ref(false)
const error = ref('')
const typing = ref(false)
const movingForward = ref(true)
const transitioning = ref(false)
let typingTimer: ReturnType<typeof setTimeout> | undefined
let previousFocus: HTMLElement | null = null
let wasLocked = false
const draft = useState('join-draft', () => ({
  requestId: '',
  name: '',
  email: '',
  grade: 'Choose your grade',
  interests: [] as string[],
  interestOther: '',
  goals: [] as string[],
  stage: '',
  note: '',
  studentId: '',
  parentName: '',
  parentEmail: '',
  parentPermission: false,
  consent: false,
  website: '',
}))
const titles = [
  'A name behind the curiosity.',
  'What draws you in?',
  'Where do you want research to take you?',
  'Permission to participate.',
]
const stepLabels = [
  'Introduce yourself',
  'Follow your curiosity',
  'Choose your direction',
  'Permission',
]
const hasOtherInterest = computed(() =>
  draft.value.interests.includes('Other science or research area'),
)
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
async function settleStep() {
  transitioning.value = false
  await focusHeading()
}
function startStepTransition() {
  transitioning.value = true
}
async function scrollToStepStart() {
  await nextTick()
  contentScroller.value?.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
function disableLeavingStep(element: Element) {
  const step = element as HTMLElement
  step.inert = true
  step.setAttribute('aria-hidden', 'true')
}
async function next() {
  error.value = ''
  const result = [joinIdentitySchema, joinInterestSchema, joinGoalSchema][step.value]?.safeParse(
    draft.value,
  )
  if (result && !result.success) {
    error.value = result.error.issues[0]!.message
    return
  }
  movingForward.value = true
  step.value++
  await scrollToStepStart()
}
async function back() {
  movingForward.value = false
  step.value--
  error.value = ''
  await scrollToStepStart()
}
async function submit() {
  if (busy.value) return
  error.value = ''
  const permission = joinPermissionSchema.safeParse(draft.value)
  if (!permission.success) {
    error.value = permission.error.issues[0]!.message
    return
  }
  const parsed = joinSchema.safeParse(draft.value)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]!.message
    return
  }
  busy.value = true
  try {
    await $fetch('/api/join', { method: 'POST', body: parsed.data, retry: 0 })
    movingForward.value = true
    sent.value = true
    await scrollToStepStart()
  } catch (err) {
    error.value =
      (err as { data?: { statusMessage?: string } }).data?.statusMessage ||
      'Your response wasn’t confirmed. Please try again; your answers are still here.'
  } finally {
    busy.value = false
  }
}
watch(hasOtherInterest, (selected) => {
  if (!selected) draft.value.interestOther = ''
})
function close() {
  if (busy.value) return
  if (props.embedded) {
    void navigateTo('/')
    return
  }
  visible.value = false
}
function trapFocus(event: KeyboardEvent) {
  if (props.embedded) return
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
  hydrated.value = true
  if (!draft.value.requestId) draft.value.requestId = crypto.randomUUID()
  if (props.embedded) return
  previousFocus = document.activeElement as HTMLElement
  wasLocked = document.body.classList.contains('overflow-hidden')
  document.body.classList.add('overflow-hidden')
  dialog.value?.showModal()
  visible.value = true
  await focusHeading()
})
onBeforeUnmount(() => {
  clearTimeout(typingTimer)
  if (!props.embedded) {
    if (!wasLocked) document.body.classList.remove('overflow-hidden')
    previousFocus?.focus({ preventScroll: true })
  }
  if (sent.value) clearNuxtState('join-draft')
})
</script>

<template>
  <Teleport to="body" :disabled="embedded">
    <component
      :is="embedded ? 'div' : 'dialog'"
      ref="dialog"
      aria-labelledby="join-title"
      :data-join-form-ready="hydrated"
      class="font-sans text-paper outline-none [--color-acid:#c5c0eb]"
      :class="
        embedded
          ? 'join-embedded w-full'
          : 'fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-transparent'
      "
      @cancel.prevent="close"
      @keydown="trapFocus"
    >
      <Transition
        appear
        :name="embedded ? 'join-embedded-dialog' : 'join-dialog'"
        @after-leave="finishClose"
      >
        <div
          v-if="visible"
          class="join-backdrop flex items-center justify-center"
          :class="embedded ? 'w-full' : 'join-backdrop--modal h-full p-3 sm:p-8'"
          @click.self="!embedded && close()"
        >
          <section
            data-lenis-prevent
            class="join-panel relative isolate flex w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] sm:rounded-[2rem]"
            :class="
              embedded
                ? 'join-panel--embedded min-h-[38rem]'
                : 'join-panel--modal max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-4rem)]'
            "
          >
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-linear-to-br from-paper/[.04] via-transparent to-paper/[.012]"
            />
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-[url('/textures/glass-grain.svg')] bg-repeat opacity-[.13] mix-blend-soft-light"
            />
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#f4f1e90d,transparent_60%)] transition-opacity duration-1000 motion-reduce:transition-none"
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
                v-if="!embedded"
                type="button"
                aria-label="Close join form"
                :disabled="busy"
                class="join-close grid h-11 w-11 place-items-center rounded-full focus-visible:outline-acid disabled:opacity-30"
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
              ref="contentScroller"
              class="relative px-6 pb-7 sm:px-9 sm:pb-9"
              :class="embedded ? '' : 'overflow-y-auto overscroll-contain [scrollbar-width:thin]'"
            >
              <div class="join-step-stage">
                <Transition
                  :name="movingForward ? 'join-step-forward' : 'join-step-back'"
                  @before-enter="startStepTransition"
                  @before-leave="disableLeavingStep"
                  @after-enter="settleStep"
                >
                  <div :key="sent ? 'sent' : step" class="join-step">
                    <p class="mb-3 text-[10px] uppercase tracking-[.18em] text-acid/65">
                      {{ sent ? 'A new connection' : `0${step + 1} / 04 · ${stepLabels[step]}` }}
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
                        Thank you for reaching out. We’ve received your interest in Matrix Fellows.
                        If you’ve already joined with this email, your existing response is kept.
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
                        {{ embedded ? 'Return to the journey' : 'Back to exploring' }}
                        <span aria-hidden="true">↗</span>
                      </button>
                    </template>
                    <form
                      v-else
                      class="mt-6"
                      novalidate
                      @submit.prevent="step < 3 ? next() : submit()"
                      @input="input"
                    >
                      <div v-if="step === 0" class="space-y-5">
                        <p class="text-sm leading-relaxed text-paper/55">
                          No publications or perfect ideas required. Just a question you want to
                          follow.
                        </p>
                        <AdminField
                          v-model="draft.name"
                          label="Student full name"
                          autocomplete="section-student name"
                        /><AdminField
                          v-model="draft.email"
                          label="Student email"
                          type="email"
                          autocomplete="section-student email"
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
                          <Transition name="join-reveal">
                            <div v-if="hasOtherInterest" class="join-reveal mt-4">
                              <AdminField
                                v-model="draft.interestOther"
                                label="Which other area?"
                                placeholder="For example, neuroscience, geology, or agriculture"
                                :maxlength="160"
                              />
                            </div>
                          </Transition>
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
                            Which goals would you like Matrix Fellows to help you pursue?
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
                      </div>
                      <div v-if="step === 3" class="space-y-5">
                        <p class="text-sm leading-relaxed text-paper/55">
                          Enter the school and parent or guardian details your organizers need to
                          confirm club participation.
                        </p>
                        <AdminField
                          v-model="draft.studentId"
                          label="Student ID"
                          autocomplete="off"
                          inputmode="numeric"
                        />
                        <div class="grid gap-5 sm:grid-cols-2">
                          <AdminField
                            v-model="draft.parentName"
                            label="Parent or guardian full name"
                            autocomplete="section-parent name"
                          />
                          <AdminField
                            v-model="draft.parentEmail"
                            label="Parent or guardian email"
                            type="email"
                            autocomplete="section-parent email"
                          />
                        </div>
                        <div
                          class="space-y-4 rounded-2xl border border-paper/10 bg-paper/[.025] p-4"
                        >
                          <AnimatedCheckbox
                            v-model="draft.parentPermission"
                            label="My parent or guardian has given me permission to participate in Matrix Fellows."
                            description="This is your confirmation of permission; submitting the form does not independently verify their identity."
                          />
                          <div class="h-px bg-paper/[.07]" />
                          <AnimatedCheckbox
                            v-model="draft.consent"
                            label="I agree to this use of my response and to being contacted about Matrix Fellows."
                          />
                        </div>
                        <p class="text-[11px] leading-relaxed text-paper/50">
                          Your response—including student ID and parent or guardian contact—is
                          stored privately and may be copied to a restricted organizer sheet.
                          Sponsor reports contain aggregate counts only. Request removal at
                          contact@matrixfellows.com.
                        </p>
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
                          :disabled="busy || transitioning"
                          class="min-h-11 px-2 text-xs text-paper/55 transition-colors duration-700 hover:text-paper disabled:opacity-30"
                          @click="back"
                        >
                          Back</button
                        ><span v-else class="text-[10px] text-paper/35">About 1 min.</span>
                        <button
                          :disabled="busy || transitioning"
                          class="group flex min-h-12 items-center gap-5 rounded-full bg-acid px-6 py-3 text-sm font-medium text-ink transition-[transform,box-shadow,background-color] duration-[900ms] ease-[cubic-bezier(.45,0,.25,1)] hover:scale-[1.035] hover:shadow-[0_5px_32px_#c5c0eb25] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acid disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none"
                        >
                          {{
                            busy
                              ? 'Sending your response…'
                              : step < 3
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
            </div>
          </section>
        </div>
      </Transition>
    </component>
  </Teleport>
</template>

<style scoped>
.join-panel {
  border: 1px solid color-mix(in srgb, var(--color-paper) 20%, transparent);
  background:
    radial-gradient(
      38rem 24rem at 100% 0%,
      color-mix(in srgb, var(--color-acid) 7%, transparent),
      transparent 66%
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-paper) 8%, transparent),
      color-mix(in srgb, var(--color-paper) 2.8%, transparent) 48%,
      transparent 78%
    ),
    color-mix(in srgb, var(--color-ink) 52%, transparent);
  box-shadow:
    0 30px 120px rgb(0 0 0 / 50%),
    inset 0 1px 0 rgb(255 255 255 / 7%);
  -webkit-backdrop-filter: blur(36px) saturate(118%);
  backdrop-filter: blur(36px) saturate(118%);
}
.join-backdrop {
  background: color-mix(in srgb, var(--color-ink) 25%, transparent);
}
.join-backdrop--modal {
  background: rgb(5 8 8 / 76%);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
.join-panel--modal {
  --color-acid: #e4bb72;
  border-color: color-mix(in srgb, #e4bb72 18%, transparent);
  border-radius: 1.5rem;
  background:
    radial-gradient(28rem 18rem at 100% 0%, rgb(228 187 114 / 9%), transparent 70%),
    color-mix(in srgb, var(--color-paper) 3.6%, transparent);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 5%),
    0 18px 55px rgb(0 0 0 / 12%);
  -webkit-backdrop-filter: blur(18px) saturate(118%);
  backdrop-filter: blur(18px) saturate(118%);
  filter: drop-shadow(0 30px 70px rgb(0 0 0 / 45%));
  transition:
    opacity 260ms ease,
    translate 420ms cubic-bezier(0.16, 1, 0.3, 1),
    scale 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.join-embedded .join-backdrop {
  background: transparent;
}
.join-panel--embedded {
  box-shadow:
    0 32px 110px rgb(0 0 0 / 32%),
    0 0 72px color-mix(in srgb, var(--color-acid) 5%, transparent),
    inset 0 1px 0 rgb(255 255 255 / 8%);
}
@media (max-width: 639px) {
  .join-panel--embedded {
    border-color: color-mix(in srgb, var(--color-paper) 16%, transparent);
    border-radius: 1.5rem;
    background:
      radial-gradient(
        24rem 15rem at 105% -4%,
        color-mix(in srgb, var(--color-acid) 8%, transparent),
        transparent 68%
      ),
      radial-gradient(20rem 15rem at -12% 105%, rgb(104 176 167 / 0.045), transparent 70%),
      linear-gradient(
        150deg,
        color-mix(in srgb, var(--color-paper) 5.5%, transparent),
        color-mix(in srgb, var(--color-paper) 1.8%, transparent) 52%,
        transparent 82%
      ),
      color-mix(in srgb, var(--color-ink) 46%, transparent);
    box-shadow:
      0 24px 80px rgb(0 0 0 / 28%),
      0 0 54px color-mix(in srgb, var(--color-acid) 4%, transparent),
      inset 0 1px 0 rgb(255 255 255 / 6%);
    -webkit-backdrop-filter: blur(28px) saturate(122%);
    backdrop-filter: blur(28px) saturate(122%);
  }
}
.join-close {
  border: 1px solid rgb(244 241 233 / 15%);
  color: rgb(244 241 233 / 68%);
  background: rgb(15 20 19 / 72%);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  transition:
    color 180ms ease,
    background-color 220ms ease,
    transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.join-close:hover,
.join-close:focus-visible {
  color: #e4bb72;
  background: rgb(228 187 114 / 8%);
  transform: rotate(5deg) scale(1.04);
}
.join-dialog-enter-active,
.join-dialog-leave-active {
  transition: opacity 260ms ease;
}
.join-dialog-enter-from,
.join-dialog-leave-to,
.join-dialog-enter-from .join-panel,
.join-dialog-leave-to .join-panel {
  opacity: 0;
}
.join-dialog-enter-from .join-panel {
  translate: 0 10px;
  scale: 0.985;
}
.join-dialog-leave-to .join-panel {
  translate: 0 5px;
  scale: 0.992;
}
.join-embedded-dialog-enter-active,
.join-embedded-dialog-leave-active {
  transition: opacity 700ms ease-out;
}
.join-embedded-dialog-enter-active .join-panel,
.join-embedded-dialog-leave-active .join-panel {
  transition:
    opacity 700ms ease,
    translate 700ms cubic-bezier(0.22, 1, 0.36, 1),
    scale 700ms cubic-bezier(0.22, 1, 0.36, 1);
}
.join-embedded-dialog-enter-from,
.join-embedded-dialog-leave-to,
.join-embedded-dialog-enter-from .join-panel,
.join-embedded-dialog-leave-to .join-panel {
  opacity: 0;
}
.join-embedded-dialog-enter-from .join-panel {
  translate: 0 40px;
  scale: 0.95;
}
.join-step-stage {
  display: grid;
}
.join-step-stage > * {
  grid-area: 1 / 1;
  min-width: 0;
}
.join-step-forward-enter-active,
.join-step-forward-leave-active,
.join-step-back-enter-active,
.join-step-back-leave-active {
  transition:
    opacity 360ms ease,
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
}
.join-step-forward-enter-from,
.join-step-back-leave-to {
  opacity: 0;
  transform: translateX(14px) scale(0.992);
}
.join-step-forward-leave-to,
.join-step-back-enter-from {
  opacity: 0;
  transform: translateX(-14px) scale(0.992);
}
.join-step-forward-leave-active,
.join-step-back-leave-active {
  pointer-events: none;
}
.join-reveal-enter-active,
.join-reveal-leave-active {
  overflow: hidden;
  transition:
    opacity 240ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    max-height 420ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.join-reveal-enter-from,
.join-reveal-leave-to {
  max-height: 0;
  margin-top: 0;
  opacity: 0;
  transform: translateY(-6px);
}
.join-reveal-enter-to,
.join-reveal-leave-from {
  max-height: 7rem;
}
@media (prefers-reduced-motion: reduce) {
  .join-dialog-enter-active,
  .join-dialog-leave-active,
  .join-panel--modal,
  .join-embedded-dialog-enter-active,
  .join-embedded-dialog-leave-active,
  .join-embedded-dialog-enter-active .join-panel,
  .join-embedded-dialog-leave-active .join-panel,
  .join-close,
  .join-step-forward-enter-active,
  .join-step-forward-leave-active,
  .join-step-back-enter-active,
  .join-step-back-leave-active,
  .join-reveal-enter-active,
  .join-reveal-leave-active {
    transition: none;
    transform: none;
    translate: none;
    scale: 1;
  }
}
</style>
