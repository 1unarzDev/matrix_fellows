<template>
  <header class="relative z-10 border-b border-paper/10">
    <div class="mx-auto flex max-w-[90rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <NuxtLink
        to="/"
        class="flex items-center gap-3 text-sm text-paper/85"
        aria-label="Matrix Fellows home"
      >
        <MatrixMark class="h-7 w-7" />
        <span class="font-display tracking-[-.02em]">Matrix Fellows</span>
      </NuxtLink>
      <NuxtLink to="/#community" class="text-xs text-paper/55 hover:text-acid"
        >Back to the journey</NuxtLink
      >
    </div>
  </header>
</template>
