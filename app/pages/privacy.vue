<script setup lang="ts">
import WorkspaceLegalPage from '~/components/workspace/WorkspaceLegalPage.vue'
import { privacyPolicy } from '#shared/data/legal'

useSeoMeta({
  title: 'Privacy Policy | Matrix Fellows',
  description: privacyPolicy.description,
  ogTitle: 'Privacy Policy | Matrix Fellows',
  ogDescription: privacyPolicy.description,
  ogUrl: 'https://matrixfellows.com/privacy',
})
useHead({ link: [{ rel: 'canonical', href: 'https://matrixfellows.com/privacy' }] })
</script>

<template><WorkspaceLegalPage :document="privacyPolicy" /></template>
