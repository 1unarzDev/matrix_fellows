<template>
  <figure class="my-8 grid gap-4 sm:grid-cols-2">
    <div class="rounded-2xl border border-[#8fc6e8]/20 bg-[#8fc6e8]/[.035] p-5">
      <p class="text-[10px] uppercase tracking-[.16em] text-[#9dd5f4]/65">Scientific question</p>
      <p class="mt-4 font-display text-xl tracking-[-.025em]">
        What effect does <span class="text-acid">X</span> have on
        <span class="text-acid">Y</span> under <span class="text-acid">Z</span>?
      </p>
      <p class="mt-4 text-xs leading-5 text-paper/42">
        Use when the goal is to estimate, compare, explain, or test a relationship.
      </p>
    </div>
    <div class="rounded-2xl border border-[#a9d7c0]/20 bg-[#a9d7c0]/[.03] p-5">
      <p class="text-[10px] uppercase tracking-[.16em] text-[#b7e8cf]/65">Engineering problem</p>
      <p class="mt-4 font-display text-xl tracking-[-.025em]">
        Design <span class="text-acid">X</span> within constraints <span class="text-acid">Y</span>,
        then evaluate metric <span class="text-acid">Z</span>.
      </p>
      <p class="mt-4 text-xs leading-5 text-paper/42">
        Use when the contribution is an artifact, system, process, or implementation.
      </p>
    </div>
  </figure>
</template>
