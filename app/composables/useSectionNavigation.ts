export function useSectionNavigation(sectionIds: () => readonly string[]) {
  const activeSection = ref('')
  let frame = 0
  let navigationTarget = ''
  let navigationTimer: ReturnType<typeof setTimeout> | undefined

  function releaseNavigation() {
    clearTimeout(navigationTimer)
    navigationTimer = undefined
    navigationTarget = ''
    scheduleUpdate()
  }

  function scheduleNavigationRelease() {
    clearTimeout(navigationTimer)
    navigationTimer = setTimeout(releaseNavigation, 180)
  }

  function updateActiveSection() {
    frame = 0
    const ids = sectionIds()
    if (!ids.length) return

    const marker = Math.max(112, window.innerHeight * 0.24)
    let next = ids[0]!
    for (const id of ids) {
      const section = document.getElementById(id)
      if (section && section.getBoundingClientRect().top <= marker) next = id
      else break
    }
    activeSection.value = next
  }

  function scheduleUpdate() {
    if (navigationTarget) {
      activeSection.value = navigationTarget
      scheduleNavigationRelease()
      return
    }
    if (!frame) frame = requestAnimationFrame(updateActiveSection)
  }

  function interruptNavigation(event?: Event) {
    if (!navigationTarget) return
    if (
      event instanceof KeyboardEvent &&
      !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'].includes(
        event.key,
      )
    )
      return
    releaseNavigation()
  }

  function navigateToSection(event: Event, id: string) {
    event.preventDefault()
    const section = document.getElementById(id)
    if (!section) return
    navigationTarget = id
    activeSection.value = navigationTarget
    history.replaceState(null, '', `#${id}`)
    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
    scheduleNavigationRelease()
  }

  onMounted(() => {
    const ids = sectionIds()
    const hash = window.location.hash.slice(1)
    activeSection.value = ids.includes(hash) ? hash : ids[0] || ''
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })
    window.addEventListener('wheel', interruptNavigation, { passive: true })
    window.addEventListener('touchstart', interruptNavigation, { passive: true })
    window.addEventListener('keydown', interruptNavigation)
    scheduleUpdate()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    window.removeEventListener('wheel', interruptNavigation)
    window.removeEventListener('touchstart', interruptNavigation)
    window.removeEventListener('keydown', interruptNavigation)
    clearTimeout(navigationTimer)
    if (frame) cancelAnimationFrame(frame)
  })

  return { activeSection, navigateToSection }
}
