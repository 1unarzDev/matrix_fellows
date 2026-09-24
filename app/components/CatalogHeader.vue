<script setup lang="ts">
const route = useRoute()
const activeResource = computed(() =>
  route.path === '/join'
    ? 'join'
    : route.path === '/meetings'
      ? 'meetings'
      : route.path.startsWith('/guides')
        ? 'guides'
        : route.path.startsWith('/opportunities')
          ? 'opportunities'
          : '',
)
</script>

<template>
  <header class="catalog-header relative z-20 border-b border-paper/10">
    <div class="catalog-header__line" aria-hidden="true" />
    <div
      class="mx-auto flex min-h-[4.75rem] max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-8 lg:px-12"
    >
      <NuxtLink
        to="/"
        class="catalog-header__brand group flex min-h-11 shrink-0 items-center gap-3 text-paper/85"
        aria-label="Matrix Fellows home"
      >
        <span class="catalog-header__mark grid h-9 w-9 place-items-center rounded-full">
          <MatrixMark class="h-6 w-6" />
        </span>
        <span class="hidden leading-none sm:block">
          <span class="block text-[9px] uppercase tracking-[.22em] text-paper/40">Matrix</span>
          <span class="mt-1 block font-display text-sm tracking-[-.025em]">Fellows</span>
        </span>
      </NuxtLink>
      <div class="flex min-w-0 items-center gap-3 sm:gap-5">
        <nav aria-label="Resource library" class="catalog-header__switcher">
          <NuxtLink
            to="/opportunities"
            aria-label="Opportunities"
            class="catalog-header__resource"
            :class="{ 'catalog-header__resource--active': activeResource === 'opportunities' }"
            :aria-current="activeResource === 'opportunities' ? 'page' : undefined"
          >
            <span class="catalog-header__dot" aria-hidden="true" />
            <span class="hidden min-[440px]:inline">Opportunities</span>
            <span class="min-[440px]:hidden">Openings</span>
          </NuxtLink>
          <NuxtLink
            to="/guides"
            aria-label="Guides"
            class="catalog-header__resource"
            :class="{ 'catalog-header__resource--active': activeResource === 'guides' }"
            :aria-current="activeResource === 'guides' ? 'page' : undefined"
          >
            <span class="catalog-header__dot" aria-hidden="true" /> Guides
          </NuxtLink>
          <NuxtLink
            to="/meetings"
            aria-label="Meetings"
            class="catalog-header__resource"
            :class="{ 'catalog-header__resource--active': activeResource === 'meetings' }"
            :aria-current="activeResource === 'meetings' ? 'page' : undefined"
          >
            <span class="catalog-header__dot" aria-hidden="true" />
            <span class="hidden min-[440px]:inline">Meetings</span>
            <span class="min-[440px]:hidden">Meet</span>
          </NuxtLink>
          <NuxtLink
            to="/join"
            aria-label="Join"
            class="catalog-header__resource"
            :class="{ 'catalog-header__resource--active': activeResource === 'join' }"
            :aria-current="activeResource === 'join' ? 'page' : undefined"
          >
            <span class="catalog-header__dot" aria-hidden="true" /> Join
          </NuxtLink>
        </nav>
        <NuxtLink
          to="/#community"
          class="catalog-header__back hidden items-center gap-1.5 text-xs md:inline-flex"
        >
          <SiteIcon name="right" :size="13" class="rotate-180" /> Journey
        </NuxtLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.catalog-header {
  background:
    radial-gradient(
      28rem 8rem at 24% -100%,
      color-mix(in srgb, var(--color-acid) 8%, transparent),
      transparent 72%
    ),
    color-mix(in srgb, var(--color-ink) 88%, transparent);
  box-shadow: 0 12px 50px rgb(0 0 0 / 9%);
  backdrop-filter: blur(16px) saturate(120%);
}
.catalog-header__line {
  position: absolute;
  right: 12%;
  bottom: -1px;
  left: 12%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--color-acid) 24%, transparent),
    transparent
  );
}
.catalog-header__mark {
  border: 1px solid color-mix(in srgb, var(--color-paper) 13%, transparent);
  background: color-mix(in srgb, var(--color-paper) 2.5%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-paper) 4%, transparent);
  transition:
    color 180ms ease,
    border-color 240ms ease,
    background-color 240ms ease,
    box-shadow 320ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.catalog-header__brand:hover .catalog-header__mark,
.catalog-header__brand:focus-visible .catalog-header__mark {
  color: var(--color-acid);
  border-color: color-mix(in srgb, var(--color-acid) 38%, transparent);
  background: color-mix(in srgb, var(--color-acid) 5%, transparent);
  box-shadow: 0 0 22px color-mix(in srgb, var(--color-acid) 9%, transparent);
  transform: rotate(-4deg) scale(1.04);
}
.catalog-header__switcher {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--color-paper) 11%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-paper) 2%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-paper) 3%, transparent);
}
.catalog-header__resource {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding-inline: 0.75rem;
  font-size: 0.6875rem;
  color: color-mix(in srgb, var(--color-paper) 48%, transparent);
  transition:
    color 180ms ease,
    background-color 220ms ease,
    box-shadow 320ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.catalog-header__resource:hover,
.catalog-header__resource:focus-visible {
  color: var(--color-paper);
  transform: translate3d(0, -1px, 0);
}
.catalog-header__resource--active {
  color: var(--color-paper);
  background: color-mix(in srgb, var(--color-paper) 5%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--color-paper) 5%, transparent),
    0 5px 18px rgb(0 0 0 / 12%);
}
.catalog-header__dot {
  width: 0.25rem;
  height: 0.25rem;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  transition:
    opacity 180ms ease,
    background-color 180ms ease,
    box-shadow 260ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.catalog-header__resource--active .catalog-header__dot {
  opacity: 1;
  background: var(--color-acid);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-acid) 65%, transparent);
  transform: scale(1.15);
}
.catalog-header__brand,
.catalog-header__back {
  transition:
    color 180ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    text-shadow 260ms ease;
}
.catalog-header__brand:hover,
.catalog-header__brand:focus-visible {
  color: var(--color-paper);
  transform: translate3d(2px, 0, 0);
}
.catalog-header__back:hover,
.catalog-header__back:focus-visible {
  color: var(--color-acid);
  text-shadow: 0 0 18px color-mix(in srgb, var(--color-acid) 20%, transparent);
  transform: translate3d(-3px, 0, 0);
}
@media (max-width: 439px) {
  .catalog-header__mark {
    width: 2rem;
    height: 2rem;
  }
  .catalog-header__switcher {
    gap: 0;
    padding: 0.125rem;
  }
  .catalog-header__resource {
    min-height: 2.25rem;
    gap: 0;
    padding-inline: 0.48rem;
    font-size: 0.625rem;
  }
  .catalog-header__dot {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .catalog-header__brand,
  .catalog-header__back,
  .catalog-header__mark,
  .catalog-header__resource,
  .catalog-header__dot {
    transform: none !important;
    transition: none;
  }
}
</style>
