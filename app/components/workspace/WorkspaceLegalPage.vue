<script setup lang="ts">
import WorkspaceShell from './WorkspaceShell.vue'
import AccessCosmos from './AccessCosmos.vue'

defineProps<{
  document: {
    title: string
    description: string
    updated: string
    sections: Array<{ id: string; title: string; paragraphs: string[]; bullets?: string[] }>
  }
}>()
</script>

<template>
  <WorkspaceShell variant="auth" skip-label="Skip to policy" class="legal-shell">
    <template #background><AccessCosmos /></template>
    <template #header>
      <NuxtLink to="/login" class="legal-back">
        <SiteIcon name="lock" :size="15" /> Back to sign in
      </NuxtLink>
    </template>
    <article class="legal-document" aria-labelledby="legal-title">
      <header class="legal-heading">
        <span class="legal-eyebrow">Matrix Fellows · Account &amp; community</span>
        <h1 id="legal-title">{{ document.title }}</h1>
        <p class="legal-description">{{ document.description }}</p>
        <p class="legal-updated">Last updated {{ document.updated }}</p>
      </header>
      <div class="legal-layout">
        <aside class="legal-index">
          <nav class="legal-desktop-index" aria-label="On this page">
            <p class="legal-index-label">On this page</p>
            <a v-for="section in document.sections" :key="section.id" :href="`#${section.id}`">
              {{ section.title }}
            </a>
          </nav>
          <details class="legal-mobile-index">
            <summary>On this page <SiteIcon name="down" :size="14" /></summary>
            <nav aria-label="Policy sections">
              <a v-for="section in document.sections" :key="section.id" :href="`#${section.id}`">{{
                section.title
              }}</a>
            </nav>
          </details>
        </aside>
        <div class="legal-reading">
          <section
            v-for="(section, index) in document.sections"
            :id="section.id"
            :key="section.id"
            class="legal-section"
            :aria-labelledby="`${section.id}-title`"
          >
            <div class="legal-section-heading">
              <span class="legal-section-number" aria-hidden="true">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              <h2 :id="`${section.id}-title`">{{ section.title }}</h2>
            </div>
            <p v-for="(paragraph, paragraphIndex) in section.paragraphs" :key="paragraphIndex">
              {{ paragraph }}
            </p>
            <ul v-if="section.bullets?.length">
              <li v-for="(bullet, bulletIndex) in section.bullets" :key="bulletIndex">
                {{ bullet }}
              </li>
            </ul>
          </section>
        </div>
      </div>
      <footer class="legal-footer">
        <span>Clear expectations. Thoughtful collaboration.</span>
        <nav aria-label="Account policies">
          <NuxtLink
            to="/privacy"
            :aria-current="document.title === 'Privacy policy' ? 'page' : undefined"
            >Privacy</NuxtLink
          >
          <NuxtLink
            to="/terms"
            :aria-current="document.title === 'Terms of service' ? 'page' : undefined"
            >Terms</NuxtLink
          >
          <NuxtLink to="/login">Sign in <SiteIcon name="right" :size="14" /></NuxtLink>
        </nav>
      </footer>
    </article>
  </WorkspaceShell>
</template>

<style scoped>
.legal-shell :deep(.workspace-main) {
  align-items: start;
  padding-top: 22px;
  outline: none;
}
.legal-back {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 2px;
  min-height: 44px;
  font-size: 12px;
  color: #ccc7d4;
  text-decoration: none;
  transition: color 180ms ease;
}
.legal-back:hover {
  color: #edcf98;
}
.legal-document {
  width: min(100%, 1080px);
  border: 1px solid #eee1ff20;
  border-radius: 28px;
  background: linear-gradient(135deg, #171820, #101219);
  box-shadow:
    inset 0 1px 0 #fff8ec0a,
    0 28px 100px #00000045;
  overflow: clip;
  animation: policy-enter 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.legal-heading {
  padding: clamp(28px, 5vw, 58px);
  padding-bottom: 30px;
  border-bottom: 1px solid #e9ddf013;
  background: radial-gradient(ellipse at 90% 0, #af8bda0c, transparent 65%);
}
.legal-eyebrow {
  display: block;
  font-size: 10px;
  line-height: 1.6;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #d3b987;
}
.legal-heading h1 {
  font-family: Manrope, sans-serif;
  font-size: clamp(29px, 4.6vw, 46px);
  line-height: 1.12;
  letter-spacing: -0.045em;
  font-weight: 500;
  margin: 18px 0;
  color: #f0ede8;
}
.legal-description {
  max-width: 640px;
  font-size: 15px;
  line-height: 1.75;
  color: #c2beca;
  margin: 0;
}
.legal-updated {
  margin: 18px 0 0;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: #aba6b5;
}
.legal-layout {
  display: grid;
  grid-template-columns: 225px minmax(0, 1fr);
  gap: 38px;
  padding: 38px clamp(28px, 5vw, 58px) 46px;
}
.legal-index nav {
  position: sticky;
  top: 28px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.legal-mobile-index {
  display: none;
}
.legal-index-label {
  margin: 0 0 12px;
  color: #a7a1b2;
  font-size: 10px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.legal-index a {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 10px;
  margin-left: -10px;
  border-radius: 8px;
  color: #c4becd;
  font-size: 12px;
  line-height: 1.5;
  text-decoration: none;
  transition:
    background 180ms ease,
    color 180ms ease;
}
.legal-index a:hover {
  color: #efd59e;
  background: #dac79e09;
}
.legal-section {
  scroll-margin-top: 28px;
}
.legal-section + .legal-section {
  margin-top: 32px;
  padding-top: 29px;
  border-top: 1px solid #e9ddf010;
}
.legal-section-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 13px;
}
.legal-section-number {
  font-size: 10px;
  color: #b49b6d;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.legal-reading h2 {
  font-family: Manrope, sans-serif;
  font-size: 18px;
  line-height: 1.4;
  letter-spacing: -0.02em;
  margin: 0;
  font-weight: 500;
  color: #eeebe5;
}
.legal-reading p,
.legal-reading li {
  font-size: 14px;
  line-height: 1.85;
  color: #c3becb;
  overflow-wrap: anywhere;
}
.legal-reading p {
  margin: 0 0 13px;
}
.legal-reading p:last-child {
  margin-bottom: 0;
}
.legal-reading ul {
  margin: 12px 0 0;
  padding-left: 19px;
}
.legal-reading li + li {
  margin-top: 8px;
}
.legal-reading li::marker {
  color: #b6a17c;
}
.legal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 20px clamp(28px, 5vw, 58px);
  border-top: 1px solid #e9ddf013;
  background: #08090e24;
}
.legal-footer > span {
  color: #aba5b4;
  font-size: 11px;
  line-height: 1.6;
}
.legal-footer nav {
  display: flex;
  align-items: center;
  gap: 20px;
}
.legal-footer a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  color: #c9c1d0;
  font-size: 12px;
  text-decoration: none;
  transition: color 180ms ease;
}
.legal-footer a:hover,
.legal-footer a[aria-current='page'] {
  color: #e7c891;
}
a:focus-visible {
  outline: 2px solid #d8b977;
  outline-offset: 4px;
  border-radius: 5px;
}
@keyframes policy-enter {
  from {
    opacity: 0;
    transform: translateY(9px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (max-width: 760px) {
  .legal-shell :deep(.workspace-main) {
    padding: 12px 14px 50px;
  }
  .legal-document {
    border-radius: 22px;
  }
  .legal-heading {
    padding: 29px 23px 25px;
  }
  .legal-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 26px;
    padding: 25px 23px 32px;
  }
  .legal-index nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .legal-index-label {
    flex-basis: 100%;
    margin-bottom: 6px;
  }
  .legal-index .legal-desktop-index {
    display: none;
  }
  .legal-mobile-index {
    display: block;
  }
  .legal-mobile-index summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    color: #d3b987;
    font-size: 12px;
    cursor: pointer;
    list-style: none;
  }
  .legal-mobile-index summary::-webkit-details-marker {
    display: none;
  }
  .legal-mobile-index summary:focus-visible {
    outline: 2px solid #d8b977;
    outline-offset: 4px;
  }
  .legal-mobile-index[open] summary {
    margin-bottom: 8px;
  }
  .legal-mobile-index[open] summary svg {
    transform: rotate(180deg);
  }
  .legal-index a {
    min-height: 44px;
    font-size: 11px;
    padding: 6px 8px;
    margin: 0 0 0 -8px;
  }
  .legal-index {
    padding-bottom: 22px;
    border-bottom: 1px solid #e9ddf013;
  }
  .legal-description {
    font-size: 14px;
  }
  .legal-footer {
    padding: 17px 23px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .legal-document {
    animation: none;
  }
  a {
    transition: none;
  }
}
</style>
