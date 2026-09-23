<template>
  <figure class="my-8 space-y-2 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="mb-5 text-[10px] uppercase tracking-[.18em] text-paper/38">
      Do not skip a rung
    </figcaption>
    <div
      v-for="(item, index) in [
        ['Result', 'What the measurements show'],
        ['Interpretation', 'What the result may explain or support'],
        ['Potential impact', 'What could improve if the finding generalizes'],
        ['Demonstrated impact', 'What has been shown in actual use'],
      ]"
      :key="item[0]"
      class="grid gap-2 rounded-xl border border-paper/10 p-4 sm:grid-cols-[2rem_9rem_1fr]"
    >
      <span class="text-xs text-acid/55">0{{ index + 1 }}</span
      ><strong class="text-sm font-medium text-paper">{{ item[0] }}</strong
      ><span class="text-sm text-paper/48">{{ item[1] }}</span>
    </div>
  </figure>
</template>
