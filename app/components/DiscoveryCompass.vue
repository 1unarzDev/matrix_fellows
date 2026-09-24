<template>
  <NuxtLink
    to="/guides/find-a-research-idea"
    class="discovery-compass group inline-flex min-h-12 items-center gap-4 rounded-full pr-3 text-xs text-paper/65 outline-offset-4 transition-colors duration-700 hover:text-paper/85 focus-visible:text-paper/85 motion-reduce:transition-none"
    aria-label="Find a research idea — explore the guide"
  >
    <span
      class="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-acid/20 bg-ink/15 shadow-[inset_0_0_0_1px_#fff0] transition-[transform,border-color,background-color,box-shadow] duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-6 group-hover:scale-105 group-hover:border-acid/45 group-hover:bg-acid/[.055] group-hover:shadow-[0_0_24px_#eac27918,inset_0_0_0_1px_#eac27910] group-focus-visible:rotate-6 group-focus-visible:scale-105 group-focus-visible:border-acid/45 group-focus-visible:bg-acid/[.055] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        class="absolute inset-1.5 rounded-full border border-dashed border-paper/10 transition-transform duration-1000 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-rotate-45 group-focus-visible:-rotate-45 motion-reduce:transform-none motion-reduce:transition-none"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        class="relative h-7 w-7 text-acid/80"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" class="stroke-paper/20" />
        <path
          d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"
          class="origin-center transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-[28deg] group-focus-visible:rotate-[28deg] motion-reduce:transform-none motion-reduce:transition-none"
        />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
    <span>Different disciplines. A shared instinct to explore.</span>
    <SiteIcon
      name="right"
      :size="12"
      class="-translate-x-1 text-acid/0 transition-[transform,color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0 group-hover:text-acid/70 group-focus-visible:translate-x-0 group-focus-visible:text-acid/70 motion-reduce:transform-none motion-reduce:transition-none"
    />
  </NuxtLink>
</template>
