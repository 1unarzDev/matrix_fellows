<template>
  <figure class="my-8 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="text-[10px] uppercase tracking-[.18em] text-paper/38">
      Three different claims
    </figcaption>
    <div class="mt-6 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-paper/10 p-4">
        <p class="text-sm text-paper">Visibly large</p>
        <p class="mt-3 text-xs leading-5 text-paper/42">The plotted groups look far apart.</p>
      </div>
      <div class="rounded-xl border border-paper/10 p-4">
        <p class="text-sm text-paper">Statistically supported</p>
        <p class="mt-3 text-xs leading-5 text-paper/42">
          The design and uncertainty support a difference beyond the chosen model’s noise
          assumptions.
        </p>
      </div>
      <div class="rounded-xl border border-acid/25 bg-acid/[.03] p-4">
        <p class="text-sm text-paper">Practically meaningful</p>
        <p class="mt-3 text-xs leading-5 text-paper/42">
          The effect is large enough to matter in the real decision or system.
        </p>
      </div>
    </div>
    <p class="mt-5 text-xs leading-5 text-paper/38">
      A project may satisfy one, two, all three—or none. Report them separately.
    </p>
  </figure>
</template>
