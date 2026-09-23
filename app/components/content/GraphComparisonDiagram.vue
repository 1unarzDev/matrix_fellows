<template>
  <figure class="my-8 grid gap-4 sm:grid-cols-2">
    <div class="rounded-2xl border border-rose-200/16 bg-rose-200/[.025] p-5">
      <p class="text-[10px] uppercase tracking-[.16em] text-rose-100/55">Hard to trust</p>
      <svg
        viewBox="0 0 320 190"
        role="img"
        aria-label="A misleading bar chart with a truncated axis, unlabeled bars, and 3D decoration"
        class="mt-4 w-full"
      >
        <path d="M42 20V158H300" fill="none" stroke="#f4f1e955" stroke-width="2" />
        <text x="8" y="30" fill="#f4f1e955" font-size="10">98</text>
        <text x="8" y="153" fill="#f4f1e955" font-size="10">96</text>
        <path d="M75 150h55V76H75zM178 150h55V36h-55z" fill="#cf8f8f88" />
        <path d="m130 76 12-9v74l-12 9zm103-40 12-9v114l-12 9z" fill="#855f6f88" />
        <text x="82" y="176" fill="#f4f1e955" font-size="10">Thing A</text>
        <text x="185" y="176" fill="#f4f1e955" font-size="10">Thing B</text>
      </svg>
      <p class="mt-3 text-xs leading-5 text-paper/38">
        Truncated scale, decorative depth, no units, no observations, no uncertainty.
      </p>
    </div>
    <div class="rounded-2xl border border-acid/22 bg-acid/[.025] p-5">
      <p class="text-[10px] uppercase tracking-[.16em] text-acid/70">Evidence first</p>
      <svg
        viewBox="0 0 320 190"
        role="img"
        aria-label="A clear dot plot showing individual observations, group means, and confidence intervals"
        class="mt-4 w-full"
      >
        <path d="M42 18V158H300M42 158H300" fill="none" stroke="#f4f1e955" stroke-width="2" />
        <g fill="#9ec8bcaa">
          <circle
            v-for="(p, i) in [
              [90, 126],
              [79, 113],
              [97, 105],
              [84, 119],
              [101, 98],
              [214, 75],
              [225, 83],
              [208, 68],
              [232, 91],
              [218, 62],
            ]"
            :key="i"
            :cx="p[0]"
            :cy="p[1]"
            r="5"
          />
        </g>
        <path d="M65 112h50M90 94v36M194 77h50M219 58v38" stroke="#eac279" stroke-width="3" />
        <text x="70" y="177" fill="#f4f1e988" font-size="10">Baseline</text>
        <text x="198" y="177" fill="#f4f1e988" font-size="10">New method</text>
        <text x="2" y="88" fill="#f4f1e988" font-size="9" transform="rotate(-90 10 88)">
          Error rate (%)
        </text>
      </svg>
      <p class="mt-3 text-xs leading-5 text-paper/42">
        Labeled units, honest scale, observations, summary, uncertainty, and sample size in the
        caption.
      </p>
    </div>
  </figure>
</template>
