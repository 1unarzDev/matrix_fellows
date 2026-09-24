<template>
  <NuxtLink
    to="/guides/find-a-research-idea"
    class="group/unknown relative flex h-32 w-32 items-center justify-center rounded-full outline-offset-[14px]"
    aria-label="The unexplored — find a research idea worth pursuing"
  >
    <div
      class="pointer-events-none absolute -inset-7 rounded-full bg-[radial-gradient(circle,#eac27916,transparent_68%)] opacity-0 transition-opacity duration-[2200ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:opacity-100 group-focus-visible/unknown:opacity-100 motion-reduce:transition-none"
    />
    <svg
      viewBox="0 0 160 160"
      fill="none"
      class="absolute -inset-4 h-40 w-40 overflow-visible text-paper/20"
      stroke="currentColor"
      stroke-width=".8"
    >
      <circle
        cx="80"
        cy="80"
        r="64"
        class="origin-center transition-[transform,stroke] duration-[2200ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:scale-[1.035] group-hover/unknown:stroke-acid/35 group-focus-visible/unknown:scale-[1.035] group-focus-visible/unknown:stroke-acid/35 motion-reduce:transform-none motion-reduce:transition-none"
      />
      <circle
        cx="80"
        cy="80"
        r="76"
        stroke-dasharray="1 6"
        class="origin-center transition-[transform,stroke] duration-[2400ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:rotate-12 group-hover/unknown:stroke-acid/35 group-focus-visible/unknown:rotate-12 group-focus-visible/unknown:stroke-acid/35 motion-reduce:transform-none motion-reduce:transition-none"
      />
      <g
        class="origin-center -rotate-30 transition-transform duration-[2400ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:-rotate-25 group-focus-visible/unknown:-rotate-25 motion-reduce:group-hover/unknown:-rotate-30 motion-reduce:group-focus-visible/unknown:-rotate-30 motion-reduce:transition-none"
      >
        <ellipse
          cx="80"
          cy="80"
          rx="62"
          ry="23"
          pathLength="1"
          stroke-dasharray="1"
          stroke-dashoffset="1"
          class="stroke-acid/45 transition-[stroke-dashoffset] duration-[2400ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:[stroke-dashoffset:0] group-focus-visible/unknown:[stroke-dashoffset:0] motion-reduce:transition-none"
        />
        <circle
          cx="142"
          cy="80"
          r="2"
          class="fill-acid/70 stroke-none opacity-0 transition-opacity duration-[2200ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:opacity-100 group-focus-visible/unknown:opacity-100 motion-reduce:transition-none"
        />
      </g>
      <path
        d="M80 66v9m0 10v9M66 80h9m10 0h9"
        class="origin-center stroke-paper/45 transition-[stroke] duration-[2200ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:stroke-acid/75 group-focus-visible/unknown:stroke-acid/75 motion-reduce:transition-none"
      />
      <circle
        cx="80"
        cy="80"
        r="2"
        class="fill-acid stroke-none opacity-0 transition-opacity duration-[2200ms] ease-[cubic-bezier(.45,0,.25,1)] group-hover/unknown:opacity-100 group-focus-visible/unknown:opacity-100 motion-reduce:transition-none"
      />
    </svg>
    <span
      class="absolute left-[calc(100%+1.25rem)] top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap"
    >
      <span
        aria-hidden="true"
        class="h-px w-5 bg-paper/20 transition-[width,background-color] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover/unknown:w-7 group-hover/unknown:bg-acid/45 group-focus-visible/unknown:w-7 group-focus-visible/unknown:bg-acid/45 motion-reduce:transition-none"
      />
      <span class="relative ml-3 flex items-center text-left">
        <span
          class="text-[8px] uppercase tracking-[.25em] text-paper/40 transition-[color,transform] duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover/unknown:translate-x-1 group-hover/unknown:-translate-y-[6px] group-hover/unknown:text-acid/80 group-focus-visible/unknown:translate-x-1 group-focus-visible/unknown:-translate-y-[6px] group-focus-visible/unknown:text-acid/80 motion-reduce:transform-none motion-reduce:transition-none"
          >The unexplored</span
        >
        <span
          aria-hidden="true"
          class="absolute left-0 top-[calc(50%+3px)] flex -translate-x-1 items-center gap-1.5 text-[8px] tracking-[.08em] text-paper/0 opacity-0 transition-[color,opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover/unknown:translate-x-1 group-hover/unknown:text-paper/55 group-hover/unknown:opacity-100 group-focus-visible/unknown:translate-x-1 group-focus-visible/unknown:text-paper/55 group-focus-visible/unknown:opacity-100 motion-reduce:transform-none motion-reduce:transition-none"
          >Find your question <SiteIcon :size="9"
        /></span>
      </span>
    </span>
  </NuxtLink>
</template>
