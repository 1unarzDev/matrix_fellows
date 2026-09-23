<template>
  <header class="catalog-header relative z-10 border-b border-paper/10">
    <div class="mx-auto flex max-w-[90rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <NuxtLink
        to="/"
        class="catalog-header__brand flex items-center gap-3 text-sm text-paper/85"
        aria-label="Matrix Fellows home"
      >
        <MatrixMark class="h-7 w-7" />
        <span class="font-display tracking-[-.02em]">Matrix Fellows</span>
      </NuxtLink>
      <NuxtLink to="/#community" class="catalog-header__back text-xs text-paper/55"
        >Back to the journey</NuxtLink
      >
    </div>
  </header>
</template>

<style scoped>
.catalog-header {
  background: color-mix(in srgb, var(--color-ink) 84%, transparent);
  backdrop-filter: blur(12px);
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
@media (prefers-reduced-motion: reduce) {
  .catalog-header__brand,
  .catalog-header__back {
    transform: none !important;
    transition: none;
  }
}
</style>
