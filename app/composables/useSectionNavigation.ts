export function useSectionNavigation(sectionIds: () => readonly string[]) {
  const activeSection = ref('')
  let frame = 0

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
    if (!frame) frame = requestAnimationFrame(updateActiveSection)
  }

  function navigateToSection(event: Event, id: string) {
    event.preventDefault()
    const section = document.getElementById(id)
    if (!section) return
    activeSection.value = id
    history.replaceState(null, '', `#${id}`)
    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
  }

  onMounted(() => {
    const ids = sectionIds()
    const hash = window.location.hash.slice(1)
    activeSection.value = ids.includes(hash) ? hash : ids[0] || ''
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })
    scheduleUpdate()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', scheduleUpdate)
    window.removeEventListener('resize', scheduleUpdate)
    if (frame) cancelAnimationFrame(frame)
  })

  return { activeSection, navigateToSection }
}
