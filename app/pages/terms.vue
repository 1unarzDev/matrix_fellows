<script setup lang="ts">
import WorkspaceLegalPage from '~/components/workspace/WorkspaceLegalPage.vue'
import { termsOfService } from '#shared/data/legal'

useSeoMeta({
  title: 'Terms of Service | Matrix Fellows',
  description: termsOfService.description,
  ogTitle: 'Terms of Service | Matrix Fellows',
  ogDescription: termsOfService.description,
  ogUrl: 'https://matrixfellows.com/terms',
})
useHead({ link: [{ rel: 'canonical', href: 'https://matrixfellows.com/terms' }] })
</script>

<template><WorkspaceLegalPage :document="termsOfService" /></template>
