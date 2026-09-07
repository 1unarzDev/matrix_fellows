<script setup lang="ts">
import type { Meeting } from '#shared/types/content'
import { displayDate } from '#shared/utils/opportunities'
defineProps<{ meeting: Meeting }>()
</script>

<template>
  <article class="grid gap-10 py-16 md:grid-cols-[1.2fr_1fr]">
    <div>
      <div class="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-acid">
        <span class="h-1.5 w-1.5 rounded-full bg-acid" /> Next gathering
      </div>
      <h3 class="font-display text-3xl leading-tight tracking-[-.04em] sm:text-4xl">
        {{ meeting.title }}
      </h3>
      <p class="mt-5 max-w-sm text-sm leading-relaxed text-paper/55">
        A space to share what you’re working on, explore something new, and ask better questions.
      </p>
      <a
        v-if="meeting.url"
        :href="meeting.url"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-7 inline-flex items-center gap-6 border-b border-acid/40 pb-2 text-xs text-acid"
        >Save your spot <SiteIcon :size="15" /></a
      ><span v-else class="mt-7 inline-block text-xs text-paper/40"
        >Gathering details will be announced here.</span
      >
    </div>
    <div class="rounded-xl border border-paper/15 bg-paper/[.025] p-6 sm:p-8">
      <dl class="grid grid-cols-[70px_1fr] gap-x-4 gap-y-5 text-sm">
        <dt class="text-paper/40">When</dt>
        <dd>
          {{ meeting.date ? displayDate(meeting.date) : 'Date forthcoming'
          }}<span v-if="meeting.time" class="mt-1 block text-xs text-paper/55"
            >{{ meeting.time }} · {{ meeting.timezone }}</span
          >
        </dd>
        <dt class="text-paper/40">Where</dt>
        <dd>{{ meeting.location || 'Location forthcoming' }}</dd>
      </dl>
      <div class="mt-6 border-t border-paper/10 pt-5">
        <p class="mb-3 text-[10px] uppercase tracking-[.17em] text-paper/40">On the table</p>
        <ul class="space-y-2">
          <li v-for="topic in meeting.topics" :key="topic" class="flex gap-3 text-sm text-paper/70">
            <span class="text-acid/60">↗</span>{{ topic }}
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>
