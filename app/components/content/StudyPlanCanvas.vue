<template>
  <figure class="my-8 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="text-[10px] uppercase tracking-[.18em] text-paper/38">
      A study plan that can survive contact with reality
    </figcaption>
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(item, index) in [
          'Question & success metric',
          'Evidence & sample',
          'Baseline / control',
          'What stays constant',
          'Pilot & logging',
          'Stop rule & backup',
        ]"
        :key="item"
        class="rounded-xl border border-paper/10 p-4"
      >
        <p class="text-[9px] text-acid/55">0{{ index + 1 }}</p>
        <p class="mt-2 text-sm text-paper/72">{{ item }}</p>
      </div>
    </div>
  </figure>
</template>
