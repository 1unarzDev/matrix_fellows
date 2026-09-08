<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    modelValue: string
    multiline?: boolean
    type?: string
    placeholder?: string
    maxlength?: number
  }>(),
  { type: 'text', placeholder: '' },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <label class="group block"
    ><span
      class="mb-2.5 block text-[11px] tracking-wide text-paper/55 transition-colors duration-700 group-focus-within:text-acid motion-reduce:transition-none"
      >{{ label }}</span
    ><textarea
      v-if="multiline"
      :value="modelValue"
      :placeholder="placeholder"
      rows="4"
      :maxlength="maxlength"
      class="w-full rounded-xl border border-paper/10 bg-paper/[.025] px-4 py-3 text-base text-paper outline-none transition-[border-color,background-color,box-shadow] duration-700 ease-[cubic-bezier(.45,0,.25,1)] placeholder:text-paper/25 hover:border-paper/25 focus:border-acid/45 focus:bg-acid/[.035] focus:shadow-[0_0_24px_#c5c0eb08] sm:text-sm motion-reduce:transition-none"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" /><input
      v-else
      :value="modelValue"
      :type="type"
      :maxlength="maxlength"
      :placeholder="placeholder"
      class="w-full min-w-0 rounded-xl border border-paper/10 bg-paper/[.025] px-4 py-3 text-base text-paper outline-none transition-[border-color,background-color,box-shadow] duration-700 ease-[cubic-bezier(.45,0,.25,1)] placeholder:text-paper/25 hover:border-paper/25 focus:border-acid/45 focus:bg-acid/[.035] focus:shadow-[0_0_24px_#c5c0eb08] sm:text-sm motion-reduce:transition-none"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  /></label>
</template>
