<template>
  <figure class="my-8 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="text-[10px] uppercase tracking-[.18em] text-paper/38">
      One-page paper notes
    </figcaption>
    <div class="mt-6 grid gap-px overflow-hidden rounded-xl bg-paper/10 sm:grid-cols-2">
      <div
        v-for="item in [
          'Problem',
          'Why it matters',
          'Method',
          'Baseline / comparison',
          'Data / sample',
          'Strongest result',
          'Limitation',
          'Question it creates',
        ]"
        :key="item"
        class="min-h-24 bg-[#111615] p-4"
      >
        <p class="text-xs font-medium text-paper/72">{{ item }}</p>
        <div class="mt-4 h-px bg-paper/10" />
        <div class="mt-4 h-px w-4/5 bg-paper/8" />
      </div>
    </div>
  </figure>
</template>
