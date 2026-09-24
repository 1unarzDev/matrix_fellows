<script setup lang="ts">
const visible = ref(false)
const destination = ref('')
const nuxtApp = useNuxtApp()
const router = useRouter()
let showTimer: ReturnType<typeof setTimeout> | undefined

const begin = (path: string) => {
  destination.value = path
  clearTimeout(showTimer)
  // Avoid flashing an indicator when a prefetched route resolves immediately.
  showTimer = setTimeout(() => {
    visible.value = true
  }, 110)
}

const finish = () => {
  clearTimeout(showTimer)
  showTimer = undefined
  if (visible.value) requestAnimationFrame(() => (visible.value = false))
}

const removeGuard = router.beforeEach((to, from) => {
  if (to.path !== from.path) begin(to.path)
})
const removeFailureGuard = router.afterEach((_to, _from, failure) => {
  if (failure) finish()
})
const removeErrorGuard = router.onError(finish)

nuxtApp.hook('page:finish', finish)

onBeforeUnmount(() => {
  clearTimeout(showTimer)
  removeGuard()
  removeFailureGuard()
  removeErrorGuard()
  nuxtApp.hooks.removeHook('page:finish', finish)
})

const label = computed(() =>
  destination.value === '/join'
    ? 'Making a connection'
    : destination.value.startsWith('/guides')
      ? 'Opening field notes'
      : 'Following the horizon',
)
</script>

<template>
  <Transition name="route-veil">
    <div
      v-if="visible"
      data-route-veil
      aria-hidden="true"
      class="pointer-events-none fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-[#101413]"
    >
      <div
        class="absolute inset-0 bg-[radial-gradient(60%_48%_at_82%_4%,rgba(94,91,127,.18),transparent_72%),radial-gradient(48%_46%_at_3%_42%,rgba(78,111,107,.12),transparent_72%)]"
      />
      <div class="relative -translate-y-3">
        <OrbitalLoader tone="cool" :label="label" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.route-veil-enter-active {
  transition: opacity 180ms ease-out;
}

.route-veil-leave-active {
  transition: opacity 340ms cubic-bezier(0.22, 1, 0.36, 1);
}

.route-veil-enter-from,
.route-veil-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .route-veil-enter-active,
  .route-veil-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
