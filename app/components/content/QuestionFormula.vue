<template>
  <figure class="my-9 grid gap-4 sm:grid-cols-2">
    <section
      class="formula formula--science relative overflow-hidden rounded-2xl border p-5 sm:p-6"
    >
      <div class="relative flex items-center gap-3">
        <span class="formula__icon grid h-9 w-9 place-items-center rounded-full border">
          <SiteIcon name="atom" :size="17" />
        </span>
        <div>
          <p class="text-[9px] uppercase tracking-[.17em] text-paper/38">Investigate</p>
          <p class="mt-1 text-xs font-medium text-[#a9daf1]">Scientific question</p>
        </div>
      </div>
      <p class="relative mt-5 font-display text-xl leading-8 tracking-[-.025em] text-paper">
        How does <span class="formula__token">a factor</span> affect
        <span class="formula__token">an outcome</span> under
        <span class="formula__token">defined conditions</span>?
      </p>
      <p class="relative mt-5 text-xs leading-5 text-paper/45">
        Best for estimating, comparing, explaining, or testing a relationship.
      </p>
    </section>
    <section
      class="formula formula--engineering relative overflow-hidden rounded-2xl border p-5 sm:p-6"
    >
      <div class="relative flex items-center gap-3">
        <span class="formula__icon grid h-9 w-9 place-items-center rounded-full border">
          <SiteIcon name="spark" :size="16" />
        </span>
        <div>
          <p class="text-[9px] uppercase tracking-[.17em] text-paper/38">Create</p>
          <p class="mt-1 text-xs font-medium text-[#b7dfca]">Engineering problem</p>
        </div>
      </div>
      <p class="relative mt-5 font-display text-xl leading-8 tracking-[-.025em] text-paper">
        Design <span class="formula__token">a solution</span> within
        <span class="formula__token">real constraints</span>; evaluate it with
        <span class="formula__token">a success metric</span>.
      </p>
      <p class="relative mt-5 text-xs leading-5 text-paper/45">
        Best when the contribution is an artifact, system, process, or implementation.
      </p>
    </section>
  </figure>
</template>

<style scoped>
.formula::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(22rem 13rem at 100% 0%, var(--formula-glow), transparent 72%);
}
.formula--science {
  --formula-accent: #9dd5f4;
  --formula-glow: rgb(85 153 185 / 10%);
  border-color: rgb(157 213 244 / 21%);
  background: rgb(85 153 185 / 3%);
}
.formula--engineering {
  --formula-accent: #b7e8cf;
  --formula-glow: rgb(79 145 112 / 10%);
  border-color: rgb(183 232 207 / 19%);
  background: rgb(79 145 112 / 3%);
}
.formula__icon {
  color: var(--formula-accent);
  border-color: color-mix(in srgb, var(--formula-accent) 30%, transparent);
  background: color-mix(in srgb, var(--formula-accent) 6%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--formula-accent) 8%, transparent);
}
.formula__token {
  display: inline-block;
  margin: 0.1rem 0;
  border: 1px solid color-mix(in srgb, var(--formula-accent) 22%, transparent);
  border-radius: 999px;
  padding: 0.02rem 0.48rem 0.08rem;
  color: color-mix(in srgb, var(--formula-accent) 78%, var(--color-paper));
  background: color-mix(in srgb, var(--formula-accent) 5%, transparent);
  font-family: var(--font-sans);
  font-size: 0.72em;
  font-weight: 500;
  letter-spacing: 0;
  vertical-align: 0.08em;
}
</style>
