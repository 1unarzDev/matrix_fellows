<template>
  <header class="relative z-10 border-b border-paper/10">
    <div class="mx-auto flex max-w-[86rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <NuxtLink
        to="/"
        class="flex items-center gap-3 text-sm text-paper/85"
        aria-label="Matrix Fellows home"
      >
        <MatrixMark class="h-7 w-7" />
        <span class="font-display tracking-[-.02em]">Matrix Fellows</span>
      </NuxtLink>
      <nav aria-label="Resource navigation" class="flex items-center gap-5 text-xs">
        <NuxtLink to="/opportunities" class="hidden text-paper/48 hover:text-paper sm:block"
          >Opportunities</NuxtLink
        >
        <NuxtLink to="/guides" class="text-paper/70 hover:text-acid">Research guides</NuxtLink>
        <NuxtLink to="/#community" class="hidden text-paper/48 hover:text-paper md:block"
          >Back to the journey</NuxtLink
        >
      </nav>
    </div>
  </header>
</template>
