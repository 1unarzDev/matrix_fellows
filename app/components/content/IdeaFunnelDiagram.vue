<template>
  <figure class="my-8 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="text-[10px] uppercase tracking-[.18em] text-paper/38">
      From interest to testable question
    </figcaption>
    <div
      class="mt-6 grid gap-3 text-sm sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr] sm:items-center"
    >
      <div class="rounded-xl border border-paper/12 p-4">
        <span class="text-paper/35">Topic</span>
        <p class="mt-2 text-paper">Robots</p>
      </div>
      <span aria-hidden="true" class="rotate-90 text-center text-acid/50 sm:rotate-0">→</span>
      <div class="rounded-xl border border-paper/12 p-4">
        <span class="text-paper/35">System</span>
        <p class="mt-2 text-paper">Navigation</p>
      </div>
      <span aria-hidden="true" class="rotate-90 text-center text-acid/50 sm:rotate-0">→</span>
      <div class="rounded-xl border border-paper/12 p-4">
        <span class="text-paper/35">Failure</span>
        <p class="mt-2 text-paper">Dynamic obstacles</p>
      </div>
      <span aria-hidden="true" class="rotate-90 text-center text-acid/50 sm:rotate-0">→</span>
      <div class="rounded-xl border border-acid/30 bg-acid/[.035] p-4">
        <span class="text-acid/65">Question</span>
        <p class="mt-2 leading-6 text-paper">
          Does adding predicted pedestrian motion reduce collision rate versus a reactive baseline
          in crowded simulations?
        </p>
      </div>
    </div>
  </figure>
</template>
