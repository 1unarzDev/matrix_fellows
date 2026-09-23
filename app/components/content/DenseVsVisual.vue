<template>
  <figure class="my-8 grid gap-4 sm:grid-cols-2">
    <div class="min-w-0 rounded-2xl border border-rose-200/15 bg-rose-200/[.025] p-5">
      <p class="text-[10px] uppercase tracking-[.16em] text-rose-100/55">Dense paragraph</p>
      <p class="mt-4 text-[11px] leading-4 text-paper/42">
        Samples were prepared and then measured using the sensor after calibration. Multiple
        readings were taken under the various conditions and the measurements were recorded in a
        spreadsheet before an average was calculated and the method was repeated for the remaining
        samples while attempting to maintain all relevant conditions throughout the full procedure.
      </p>
    </div>
    <div class="min-w-0 rounded-2xl border border-acid/22 bg-acid/[.025] p-5">
      <p class="text-[10px] uppercase tracking-[.16em] text-acid/65">Visible process</p>
      <div class="mt-5 flex flex-wrap items-center gap-2 text-center text-xs text-paper/65">
        <span class="rounded border border-paper/12 p-2">Calibrate</span><span>→</span
        ><span class="rounded border border-paper/12 p-2">Measure ×5</span><span>→</span
        ><span class="rounded border border-paper/12 p-2">Log raw data</span><span>→</span
        ><span class="rounded border border-paper/12 p-2">Compare</span>
      </div>
      <p class="mt-5 text-xs leading-5 text-paper/38">
        The caption states what stayed constant and how summary values were calculated.
      </p>
    </div>
  </figure>
</template>
