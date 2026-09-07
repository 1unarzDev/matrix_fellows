<template>
  <div class="group/unknown relative flex h-32 w-32 items-center justify-center" aria-hidden="true">
    <div
      class="pointer-events-none absolute -inset-7 rounded-full bg-[radial-gradient(circle,#eac2791c,transparent_68%)] opacity-0 transition-opacity duration-[1400ms] group-hover/unknown:opacity-100 motion-reduce:transition-none"
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
        class="origin-center transition-[transform,stroke] duration-[1400ms] ease-[cubic-bezier(.4,0,.2,1)] group-hover/unknown:scale-110 group-hover/unknown:stroke-acid/40 motion-reduce:transform-none motion-reduce:transition-none"
      />
      <circle
        cx="80"
        cy="80"
        r="76"
        stroke-dasharray="1 6"
        class="origin-center transition-[transform,stroke] duration-[1800ms] ease-[cubic-bezier(.4,0,.2,1)] group-hover/unknown:rotate-45 group-hover/unknown:stroke-acid/45 motion-reduce:transform-none motion-reduce:transition-none"
      />
      <g
        class="origin-center -rotate-45 transition-transform duration-[1600ms] ease-[cubic-bezier(.4,0,.2,1)] group-hover/unknown:rotate-0 motion-reduce:transform-none motion-reduce:transition-none"
      >
        <ellipse
          cx="80"
          cy="80"
          rx="62"
          ry="23"
          pathLength="1"
          stroke-dasharray="1"
          stroke-dashoffset="1"
          class="stroke-acid/65 transition-[stroke-dashoffset] duration-[1600ms] ease-[cubic-bezier(.4,0,.2,1)] group-hover/unknown:[stroke-dashoffset:0] motion-reduce:transition-none"
        />
        <circle
          cx="142"
          cy="80"
          r="2"
          class="fill-acid stroke-none opacity-0 transition-opacity delay-300 duration-1000 group-hover/unknown:opacity-100 motion-reduce:transition-none"
        />
      </g>
      <path
        d="M80 66v9m0 10v9M66 80h9m10 0h9"
        class="origin-center stroke-paper/45 transition-[transform,stroke] duration-1000 ease-[cubic-bezier(.4,0,.2,1)] group-hover/unknown:scale-125 group-hover/unknown:stroke-acid motion-reduce:transform-none motion-reduce:transition-none"
      />
      <circle
        cx="80"
        cy="80"
        r="2"
        class="fill-acid stroke-none opacity-0 transition-opacity duration-1000 group-hover/unknown:opacity-100 motion-reduce:transition-none"
      />
    </svg>
    <span
      class="absolute -bottom-8 whitespace-nowrap text-[8px] uppercase tracking-[.25em] text-paper/40 transition-[color,letter-spacing] duration-1000 ease-[cubic-bezier(.4,0,.2,1)] group-hover/unknown:tracking-[.32em] group-hover/unknown:text-acid/85 motion-reduce:transition-none"
      >The unexplored</span
    >
  </div>
</template>
