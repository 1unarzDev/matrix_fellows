<template>
  <figure
    class="my-8 overflow-hidden rounded-2xl bg-paper/[.02] p-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)]"
  >
    <div class="grid gap-2 sm:grid-cols-2">
      <div class="rounded-xl bg-paper/[.025] p-5 sm:p-6">
        <p class="text-[10px] uppercase tracking-[.16em] text-paper/38">Result</p>
        <p class="mt-4 text-lg leading-7 text-paper">
          The motion-aware controller reduced median error from 14.2% to 10.8% on the held-out test
          set.
        </p>
      </div>
      <div class="rounded-xl bg-acid/[.025] p-5 sm:p-6">
        <p class="text-[10px] uppercase tracking-[.16em] text-acid/65">Interpretation</p>
        <p class="mt-4 text-lg leading-7 text-paper">
          The result supports better performance on this dataset; it does not yet establish
          performance in other populations or real deployment.
        </p>
      </div>
    </div>
  </figure>
</template>
