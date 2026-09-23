<template>
  <figure class="my-8 grid gap-4 sm:grid-cols-3">
    <div
      v-for="item in [
        { time: '20 sec', parts: 'Problem → finding → why it matters' },
        { time: '60 sec', parts: 'Add method, baseline, and one limitation' },
        { time: '3 min', parts: 'Add evidence path, contribution, failure, and next step' },
      ]"
      :key="item.time"
      class="rounded-2xl border border-paper/12 bg-paper/[.02] p-5"
    >
      <p class="font-display text-2xl tracking-[-.04em] text-acid">{{ item.time }}</p>
      <p class="mt-4 text-sm leading-6 text-paper/55">{{ item.parts }}</p>
    </div>
  </figure>
</template>
