<script setup lang="ts">
const preview = useTemplateRef<HTMLElement>('preview')
const revealed = ref(false)
let revealObserver: IntersectionObserver | undefined

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealed.value = true
    return
  }
  revealObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      revealed.value = true
      revealObserver?.disconnect()
    },
    { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
  )
  if (preview.value) revealObserver.observe(preview.value)
})

onBeforeUnmount(() => revealObserver?.disconnect())

const officers = [
  {
    name: 'Liam Bray',
    role: 'Founder',
    image: '/officers/liam.webp',
    width: 1100,
    height: 733,
    position: '50% 58%',
  },
  {
    name: 'Nicholas Cheng',
    role: 'Co-Founder / VP',
    image: '/officers/nicholas.webp',
    width: 576,
    height: 864,
    position: '50% 42%',
  },
  {
    name: 'Alysia Bui',
    role: 'Secretary',
    image: '/officers/alysia.webp',
    width: 648,
    height: 864,
    position: '50% 45%',
  },
  {
    name: 'Nu Nu',
    role: 'Treasurer',
    image: '/officers/nu-nu.webp',
    width: 486,
    height: 864,
    position: '50% 42%',
  },
] as const
</script>

<template>
  <section
    ref="preview"
    class="officer-preview"
    :class="{ 'officer-preview--active': revealed }"
    aria-labelledby="officer-preview-title"
  >
    <header class="officer-preview__header">
      <div>
        <p class="officer-preview__eyebrow">The people behind the invitation</p>
        <h3 id="officer-preview-title" class="officer-preview__title">Meet the officers.</h3>
      </div>
      <p class="officer-preview__intro">
        Students building a place where ambitious questions can become shared work.
      </p>
    </header>

    <div class="officer-preview__grid">
      <article
        v-for="(officer, index) in officers"
        :key="officer.name"
        class="officer-card"
        :style="{ '--officer-delay': `${index * 75}ms` }"
      >
        <div class="officer-card__portrait">
          <img
            :src="officer.image"
            :alt="`Portrait of ${officer.name}`"
            :width="officer.width"
            :height="officer.height"
            loading="lazy"
            decoding="async"
            :style="{ objectPosition: officer.position }"
          />
          <span class="officer-card__wash" aria-hidden="true" />
          <span class="officer-card__index" aria-hidden="true">0{{ index + 1 }}</span>
        </div>
        <div class="officer-card__caption">
          <h4>{{ officer.name }}</h4>
          <p>{{ officer.role }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.officer-preview {
  width: min(68rem, calc(100vw - 3rem));
  margin: clamp(5rem, 10vh, 8rem) auto 0;
  text-align: left;
}
.officer-preview__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding-inline: 0.2rem;
}
.officer-preview__eyebrow {
  margin-bottom: 0.7rem;
  color: rgb(231 223 247 / 52%);
  font-size: 0.5625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.officer-preview__title {
  font-family: var(--font-display);
  color: rgb(244 241 233 / 92%);
  font-size: clamp(1.7rem, 3vw, 2.35rem);
  line-height: 1;
  letter-spacing: -0.045em;
}
.officer-preview__intro {
  max-width: 22rem;
  color: rgb(244 241 233 / 48%);
  font-size: 0.75rem;
  line-height: 1.65;
  text-wrap: balance;
}
.officer-preview__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(0.75rem, 1.8vw, 1.25rem);
}
.officer-card {
  --officer-delay: 0ms;
  min-width: 0;
  transform-origin: 50% 90%;
  transition:
    opacity 640ms cubic-bezier(0.22, 0.72, 0.2, 1) var(--officer-delay),
    transform 760ms cubic-bezier(0.16, 1, 0.3, 1) var(--officer-delay);
}
[data-ready='true'] .officer-preview:not(.officer-preview--active) .officer-card {
  opacity: 0;
  transform: translate3d(0, 18px, 0) scale(0.985);
  transition: none;
}
.officer-card__portrait {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid rgb(231 223 247 / 14%);
  border-radius: clamp(1rem, 2vw, 1.45rem);
  background: rgb(235 229 246 / 4%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 6%),
    0 18px 42px rgb(3 5 9 / 16%);
  isolation: isolate;
  transition:
    transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 360ms ease,
    box-shadow 620ms cubic-bezier(0.16, 1, 0.3, 1);
}
.officer-card__portrait::after {
  position: absolute;
  z-index: 3;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(180deg, rgb(7 11 17 / 4%) 42%, rgb(7 10 15 / 45%) 100%),
    radial-gradient(18rem 12rem at 78% 12%, rgb(213 194 238 / 7%), transparent 65%);
  transition: opacity 520ms ease;
}
.officer-card__portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(0.82) saturate(0.42) contrast(1.04) brightness(0.9);
  transform: scale(1.015);
  transition:
    filter 720ms cubic-bezier(0.22, 0.72, 0.2, 1),
    transform 820ms cubic-bezier(0.16, 1, 0.3, 1);
}
.officer-card__wash {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(145deg, rgb(148 190 207 / 8%), transparent 45%, rgb(194 166 225 / 9%));
  mix-blend-mode: screen;
  transition: opacity 560ms ease;
}
.officer-card__index {
  position: absolute;
  z-index: 4;
  right: 0.8rem;
  top: 0.8rem;
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  border: 1px solid rgb(244 241 233 / 18%);
  border-radius: 999px;
  color: rgb(244 241 233 / 62%);
  background: rgb(8 12 17 / 26%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%);
  backdrop-filter: blur(8px);
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  transition:
    color 320ms ease,
    background-color 420ms ease,
    transform 620ms cubic-bezier(0.16, 1, 0.3, 1);
}
.officer-card__caption {
  padding: 1rem 0.2rem 0.2rem;
  transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
.officer-card__caption h4 {
  color: rgb(244 241 233 / 90%);
  font-family: var(--font-display);
  font-size: clamp(1rem, 1.8vw, 1.25rem);
  letter-spacing: -0.035em;
}
.officer-card__caption p {
  margin-top: 0.35rem;
  color: rgb(213 201 236 / 48%);
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  transition: color 320ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .officer-card:hover .officer-card__portrait {
    border-color: rgb(228 199 151 / 30%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 10%),
      0 24px 55px rgb(4 5 10 / 24%),
      0 0 30px rgb(201 169 225 / 7%);
    transform: translate3d(0, -6px, 0) rotate(0.25deg);
  }
  .officer-card:nth-child(even):hover .officer-card__portrait {
    transform: translate3d(0, -6px, 0) rotate(-0.25deg);
  }
  .officer-card:hover .officer-card__portrait img {
    filter: grayscale(0.05) saturate(0.9) contrast(1.015) brightness(0.98) sepia(0.04);
    transform: scale(1.055);
  }
  .officer-card:hover .officer-card__portrait::after,
  .officer-card:hover .officer-card__wash {
    opacity: 0.42;
  }
  .officer-card:hover .officer-card__index {
    color: rgb(255 235 199 / 86%);
    background: rgb(92 62 44 / 24%);
    transform: scale(1.08) rotate(5deg);
  }
  .officer-card:hover .officer-card__caption {
    transform: translate3d(0, -2px, 0);
  }
  .officer-card:hover .officer-card__caption p {
    color: rgb(228 199 151 / 66%);
  }
}
@media (max-width: 639px) {
  .officer-preview {
    width: min(100%, 31rem);
    margin-top: 5rem;
  }
  .officer-preview__header {
    display: block;
    margin-bottom: 1.25rem;
  }
  .officer-preview__intro {
    margin-top: 0.8rem;
    max-width: 19rem;
  }
  .officer-preview__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.45rem 0.75rem;
  }
  .officer-card__portrait img {
    filter: grayscale(0.55) saturate(0.58) contrast(1.025) brightness(0.93);
  }
  .officer-card__caption {
    padding-top: 0.8rem;
  }
  .officer-card__caption p {
    font-size: 0.5rem;
    letter-spacing: 0.12em;
  }
}
@media (prefers-reduced-motion: reduce) {
  .officer-card,
  .officer-card__portrait,
  .officer-card__portrait img,
  .officer-card__wash,
  .officer-card__index,
  .officer-card__caption {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
