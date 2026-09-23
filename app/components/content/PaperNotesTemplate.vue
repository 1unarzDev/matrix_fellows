<template>
  <figure class="my-8 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="text-[10px] uppercase tracking-[.18em] text-paper/38">
      One-page paper notes
    </figcaption>
    <div class="mt-6 grid gap-px overflow-hidden rounded-xl bg-paper/10 sm:grid-cols-2">
      <div
        v-for="item in [
          ['Problem', 'What are the authors trying to learn or build?'],
          ['Why it matters', 'Who or what changes if the work succeeds?'],
          ['Method', 'What did they do to produce evidence?'],
          ['Baseline / comparison', 'What is the result compared with?'],
          ['Data / sample', 'What cases were included—and left out?'],
          ['Strongest result', 'Write the main number or finding.'],
          ['Limitation', 'Where should the claim stop?'],
          ['Question it creates', 'What would you test or read next?'],
        ]"
        :key="item[0]"
        class="min-h-28 bg-[#111615] p-4"
      >
        <p class="text-xs font-medium text-paper/78">{{ item[0] }}</p>
        <p class="mt-3 text-[11px] leading-5 text-paper/35">{{ item[1] }}</p>
      </div>
    </div>
  </figure>
</template>
