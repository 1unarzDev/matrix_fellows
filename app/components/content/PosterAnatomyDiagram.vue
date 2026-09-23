<template>
  <figure class="my-8 rounded-2xl border border-paper/12 bg-paper/[.02] p-5 sm:p-7">
    <figcaption class="text-[10px] uppercase tracking-[.18em] text-paper/38">
      Annotated poster anatomy
    </figcaption>
    <div
      class="mt-6 grid gap-2 rounded-xl border border-paper/15 bg-[#e9e6dc] p-3 text-[#18201e] shadow-[0_20px_70px_#0005] sm:grid-cols-3 sm:p-5"
    >
      <div class="sm:col-span-3 rounded bg-[#d5d1c4] p-4">
        <p class="font-display text-xl font-medium">Question-led title</p>
        <p class="mt-1 text-xs opacity-60">Name · school · collaborators as required</p>
      </div>
      <div class="space-y-2">
        <div class="rounded bg-white/65 p-3">
          <strong class="text-sm">Why it matters</strong>
          <p class="mt-1 text-[10px]">Only the background needed to understand the question.</p>
        </div>
        <div class="rounded bg-white/65 p-3">
          <strong class="text-sm">Question / goal</strong>
          <p class="mt-1 text-[10px]">One prominent, measurable sentence.</p>
        </div>
      </div>
      <div class="space-y-2">
        <div class="rounded border-2 border-[#42756b] bg-white p-3">
          <strong class="text-sm">Method diagram</strong>
          <div class="mt-3 flex items-center justify-between text-[9px]">
            <span>Input</span><span>→</span><span>Process</span><span>→</span><span>Measure</span>
          </div>
        </div>
        <div class="rounded border-2 border-[#6d5f8d] bg-white p-3">
          <strong class="text-sm">Main result</strong>
          <div class="mt-3 flex h-20 items-end gap-2">
            <span class="h-8 w-5 bg-[#8aa49e]" /><span class="h-16 w-5 bg-[#6d5f8d]" /><span
              class="h-12 w-5 bg-[#8aa49e]"
            />
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="rounded bg-white/65 p-3">
          <strong class="text-sm">Interpretation</strong>
          <p class="mt-1 text-[10px]">What the result supports—not more.</p>
        </div>
        <div class="rounded bg-white/65 p-3">
          <strong class="text-sm">Limits & next step</strong>
          <p class="mt-1 text-[10px]">Make uncertainty visible.</p>
        </div>
      </div>
      <div class="sm:col-span-3 rounded bg-[#d5d1c4] px-3 py-2 text-[9px]">
        Concise references · acknowledgments · required safety/approval identifiers
      </div>
    </div>
  </figure>
</template>
