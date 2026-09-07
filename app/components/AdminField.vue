<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    modelValue: string
    multiline?: boolean
    type?: string
    placeholder?: string
  }>(),
  { type: 'text', placeholder: '' },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <label class="block"
    ><span class="mb-2 block text-[11px] text-paper/55">{{ label }}</span
    ><textarea
      v-if="multiline"
      :value="modelValue"
      :placeholder="placeholder"
      rows="4"
      class="w-full rounded-lg border border-paper/15 bg-white/[.035] px-3 py-2.5 text-sm text-paper outline-none focus:border-acid/60"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" /><input
      v-else
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-paper/15 bg-white/[.035] px-3 py-2.5 text-sm text-paper outline-none focus:border-acid/60"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  /></label>
</template>
