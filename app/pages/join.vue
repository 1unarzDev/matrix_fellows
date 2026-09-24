<script setup lang="ts">
const siteUrl = useRuntimeConfig().public.siteUrl
const canonical = 'https://matrixfellows.com/join'
const socialImage = new URL('/og/join.png?v=join-1', siteUrl).href

useSeoMeta({
  title: 'Join Matrix Fellows | Student research community',
  description:
    'Join Matrix Fellows and the Martin High School Research Society. Find collaborators, practical guidance, research opportunities, and a path from curiosity to real work.',
  ogTitle: 'Bring your question. We’ll help you move it forward.',
  ogDescription:
    'Join Matrix Fellows — a student research community for turning curiosity into projects, papers, competitions, and experience.',
  ogType: 'website',
  ogUrl: canonical,
  ogImage: socialImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogImageAlt: 'Join Matrix Fellows — bring your question and find a way forward.',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Join Matrix Fellows',
  twitterDescription: 'Bring your question. We’ll help you move it forward.',
  twitterImage: socialImage,
  twitterImageAlt: 'Join Matrix Fellows — bring your question and find a way forward.',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Matrix Fellows',
            item: 'https://matrixfellows.com/',
          },
          { '@type': 'ListItem', position: 2, name: 'Join', item: canonical },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div class="join-page min-h-screen overflow-x-clip bg-ink text-paper">
    <a
      href="#join-form"
      class="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-acid px-5 py-3 text-sm text-ink focus:translate-y-0"
    >
      Skip to form
    </a>

    <div class="join-atmosphere" aria-hidden="true">
      <div class="join-atmosphere__field" />
      <div class="join-atmosphere__aurora join-atmosphere__aurora--one" />
      <div class="join-atmosphere__aurora join-atmosphere__aurora--two" />
      <div class="join-atmosphere__stars" />
    </div>
    <ScienceAccent theme="mechanics" />

    <main
      class="relative z-[1] mx-auto grid max-w-[90rem] gap-12 px-5 pb-24 pt-12 sm:px-8 lg:grid-cols-[minmax(17rem,.78fr)_minmax(34rem,1.22fr)] lg:items-start lg:gap-16 lg:px-12 lg:pt-20 xl:gap-24"
    >
      <section class="join-intro lg:sticky lg:top-28 lg:pt-4">
        <div class="join-kicker">
          <span class="join-kicker__pulse" aria-hidden="true" />
          <span>Martin High School Research Society</span>
        </div>
        <h1
          class="mt-7 max-w-2xl font-display text-5xl leading-[.98] tracking-[-.065em] sm:text-6xl lg:text-[4.65rem]"
        >
          Bring your question.
          <span class="join-title-accent">We’ll help you move it forward.</span>
        </h1>
        <p class="mt-7 max-w-xl text-sm leading-7 text-paper/58 sm:text-[15px]">
          You do not need a polished idea or prior experience. Tell us what pulls at your curiosity,
          and we’ll help you find people, practical next steps, and opportunities to make something
          real.
        </p>

        <div class="join-promises mt-9 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <article class="join-promise">
            <SiteIcon name="compass" :size="17" />
            <div>
              <h2>Find direction</h2>
              <p>Turn a broad interest into a clear next experiment.</p>
            </div>
          </article>
          <article class="join-promise">
            <SiteIcon name="atom" :size="17" />
            <div>
              <h2>Build together</h2>
              <p>Meet students who want to question, test, and create.</p>
            </div>
          </article>
          <article class="join-promise">
            <SiteIcon name="spark" :size="17" />
            <div>
              <h2>Go somewhere</h2>
              <p>Prepare for fairs, workshops, programs, and real experience.</p>
            </div>
          </article>
        </div>

        <div class="join-privacy mt-7 flex items-start gap-3">
          <span class="join-privacy__icon"><SiteIcon name="lock" :size="14" /></span>
          <p>
            Your response stays with authorized organizers. We never publish individual answers or
            use them for sponsor profiling.
          </p>
        </div>
      </section>

      <section id="join-form" aria-label="Matrix Fellows membership form" class="scroll-mt-24">
        <JoinForm embedded />
      </section>
    </main>

    <footer class="relative z-[1] px-5 pb-10 text-center text-[11px] text-paper/32 sm:px-8">
      Matrix Fellows is the broader student-research initiative. The Martin High School Research
      Society is its community at Martin.
    </footer>
  </div>
</template>

<style scoped>
.join-page {
  --color-acid: #c5c0eb;
  background:
    radial-gradient(72rem 48rem at 86% 4%, rgb(100 88 148 / 0.13), transparent 68%),
    radial-gradient(56rem 40rem at -8% 72%, rgb(49 119 112 / 0.11), transparent 72%), #101413;
}
.join-atmosphere {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.join-atmosphere__field {
  position: absolute;
  inset: 0;
  opacity: 0.55;
  background:
    linear-gradient(
      115deg,
      transparent 0 46%,
      rgb(197 192 235 / 0.022) 46.1% 46.25%,
      transparent 46.35%
    ),
    radial-gradient(circle at 78% 18%, rgb(197 192 235 / 0.09) 0 1px, transparent 1.5px),
    radial-gradient(circle at 17% 67%, rgb(143 220 207 / 0.08) 0 1px, transparent 1.45px);
  background-size:
    auto,
    19rem 17rem,
    23rem 21rem;
  mask-image: linear-gradient(to bottom, black, transparent 92%);
}
.join-atmosphere__aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.55;
  will-change: transform;
}
.join-atmosphere__aurora--one {
  width: min(54rem, 76vw);
  height: min(35rem, 48vw);
  right: -17rem;
  top: -13rem;
  background: radial-gradient(ellipse, rgb(137 121 198 / 0.15), transparent 70%);
  animation: join-drift-one 18s ease-in-out infinite alternate;
}
.join-atmosphere__aurora--two {
  width: min(42rem, 65vw);
  height: min(34rem, 56vw);
  bottom: -18rem;
  left: -12rem;
  background: radial-gradient(ellipse, rgb(67 153 139 / 0.11), transparent 72%);
  animation: join-drift-two 22s ease-in-out infinite alternate;
}
.join-atmosphere__stars {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  background-image:
    radial-gradient(circle at 31% 18%, rgb(255 255 255 / 42%) 0 0.7px, transparent 1px),
    radial-gradient(circle at 72% 52%, rgb(210 201 255 / 34%) 0 0.6px, transparent 1px),
    radial-gradient(circle at 12% 83%, rgb(170 232 220 / 30%) 0 0.7px, transparent 1px);
  background-size:
    29rem 25rem,
    37rem 31rem,
    41rem 39rem;
  animation: join-stars 24s ease-in-out infinite alternate;
}
.join-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(197 192 235 / 0.72);
}
.join-kicker__pulse {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: var(--color-acid);
  box-shadow: 0 0 0 0 rgb(197 192 235 / 20%);
  animation: join-pulse 2.8s ease-out infinite;
}
.join-title-accent {
  display: block;
  color: transparent;
  background: linear-gradient(100deg, #dce8ee, #c5c0eb 55%, #9bd8d1);
  background-clip: text;
  filter: drop-shadow(0 0 24px rgb(176 157 235 / 0.1));
}
.join-promise {
  display: flex;
  min-height: 6.7rem;
  gap: 0.8rem;
  padding: 1rem;
  border: 1px solid rgb(244 241 233 / 0.1);
  border-radius: 1rem;
  color: rgb(197 192 235 / 0.8);
  background: rgb(244 241 233 / 0.022);
  box-shadow: inset 0 1px rgb(255 255 255 / 0.025);
  transition:
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 280ms ease,
    background-color 280ms ease,
    box-shadow 420ms ease;
}
.join-promise:hover {
  transform: translate3d(0, -4px, 0) scale(1.01);
  border-color: rgb(197 192 235 / 0.25);
  background: rgb(197 192 235 / 0.045);
  box-shadow:
    0 12px 36px rgb(0 0 0 / 0.14),
    0 0 22px rgb(197 192 235 / 0.035);
}
.join-promise h2 {
  font-size: 0.75rem;
  color: rgb(244 241 233 / 0.82);
}
.join-promise p {
  margin-top: 0.3rem;
  font-size: 0.65rem;
  line-height: 1.55;
  color: rgb(244 241 233 / 0.42);
}
.join-privacy {
  max-width: 31rem;
  font-size: 0.68rem;
  line-height: 1.65;
  color: rgb(244 241 233 / 0.4);
}
.join-privacy__icon {
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(244 241 233 / 0.09);
  border-radius: 50%;
  color: rgb(197 192 235 / 0.65);
}
@keyframes join-drift-one {
  to {
    transform: translate3d(-4%, 5%, 0) scale(1.06);
  }
}
@keyframes join-drift-two {
  to {
    transform: translate3d(6%, -4%, 0) scale(1.08);
  }
}
@keyframes join-stars {
  to {
    transform: translate3d(0.8rem, -0.5rem, 0);
    opacity: 0.55;
  }
}
@keyframes join-pulse {
  55%,
  100% {
    box-shadow: 0 0 0 0.65rem rgb(197 192 235 / 0);
  }
}
@media (max-width: 1023px) {
  .join-intro {
    text-align: center;
  }
  .join-kicker,
  .join-privacy {
    margin-inline: auto;
  }
  .join-intro > p {
    margin-inline: auto;
  }
  .join-privacy {
    text-align: left;
  }
}
@media (max-width: 639px) {
  .join-promises {
    grid-template-columns: 1fr;
  }
  .join-promise {
    min-height: 0;
    text-align: left;
  }
}
@media (prefers-reduced-motion: reduce) {
  .join-atmosphere__aurora,
  .join-atmosphere__stars,
  .join-kicker__pulse {
    animation: none;
  }
  .join-promise {
    transition: none;
  }
  .join-promise:hover {
    transform: none;
  }
}
</style>
