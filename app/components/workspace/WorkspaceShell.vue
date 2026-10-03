<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="workspace-shell">
    <a href="#workspace-main" class="workspace-skip">Skip to workspace</a>
    <div class="workspace-glow" aria-hidden="true" />
    <ScienceAccent theme="astronomy" />
    <header class="workspace-header">
      <NuxtLink to="/" class="workspace-brand group" aria-label="Matrix Fellows home">
        <span class="workspace-mark"><MatrixMark class="h-6 w-6" /></span>
        <span class="workspace-wordmark"><span>Matrix</span><strong>Fellows</strong></span>
      </NuxtLink>
      <slot name="header" />
    </header>
    <main id="workspace-main" class="workspace-main" tabindex="-1">
      <div class="workspace-heading">
        <p class="workspace-eyebrow">Research grows through connection</p>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.workspace-shell {
  min-height: 100svh;
  background: #111316;
  color: #efeee8;
  position: relative;
  isolation: isolate;
  --color-acid: #d8b977;
  --ws-muted: #aaa8b1;
  --ws-purple: #b9a3ed;
}
.workspace-glow {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 85% 5%, #8b68b619, transparent 45%),
    radial-gradient(ellipse at 5% 80%, #c2a76c0c, transparent 45%);
}
.workspace-shell::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.12;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.94' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='.18' filter='url(%23n)'/%3E%3C/svg%3E");
}
.workspace-skip {
  position: fixed;
  left: 20px;
  top: -100px;
  z-index: 100;
  padding: 12px 20px;
  border-radius: 20px;
  background: #d8b977;
  color: #17131b;
  font-size: 12px;
}
.workspace-skip:focus-visible {
  top: 15px;
}
.workspace-header {
  min-height: 86px;
  padding: 20px clamp(20px, 4vw, 60px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background: transparent;
}
.workspace-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  text-decoration: none;
  color: inherit;
  font-family: Manrope, sans-serif;
  font-size: 14px;
  min-height: 44px;
  flex-shrink: 0;
  transition:
    color 180ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.workspace-wordmark {
  line-height: 1;
}
.workspace-wordmark > span {
  display: block;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #efeee866;
}
.workspace-wordmark strong {
  display: block;
  margin-top: 4px;
  font-weight: 400;
  letter-spacing: -0.025em;
}
.workspace-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #efeee821;
  background: #efeee806;
  box-shadow: inset 0 1px 0 #efeee80a;
  transition:
    color 180ms ease,
    border-color 240ms ease,
    background-color 240ms ease,
    box-shadow 320ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.workspace-brand:hover,
.workspace-brand:focus-visible {
  color: #efeee8;
  transform: translate3d(2px, 0, 0);
}
.workspace-brand:hover .workspace-mark,
.workspace-brand:focus-visible .workspace-mark {
  color: var(--color-acid);
  border-color: #d8b97761;
  background: #d8b9770d;
  box-shadow: 0 0 22px #d8b97717;
  transform: rotate(-4deg) scale(1.04);
}
.workspace-main {
  max-width: 1440px;
  margin: auto;
  padding: 44px clamp(20px, 4vw, 60px) 90px;
  position: relative;
}
.workspace-heading {
  margin-bottom: 30px;
  max-width: 800px;
}
.workspace-heading h1 {
  font-family: Manrope, sans-serif;
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1.1;
  letter-spacing: -0.055em;
  margin: 12px 0 16px;
}
.workspace-heading > p:last-child:not(:first-child) {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ws-muted);
}
.workspace-eyebrow {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #ccb57e;
}
:deep(.ws-panel) {
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid #e1d8f013;
  border-radius: 28px;
  background:
    radial-gradient(ellipse at 100% 0%, #b9a3ed0a, transparent 65%),
    linear-gradient(135deg, #e0d5f009, #e0d5f003);
  backdrop-filter: blur(24px);
  box-shadow:
    inset 0 1px 0 #ffffff07,
    0 20px 70px #00000012;
  min-width: 0;
  transition:
    border-color 0.4s,
    box-shadow 0.4s;
}
:deep(.ws-panel:hover) {
  border-color: #e1d8f023;
  box-shadow: 0 20px 70px #00000018;
}
:deep(h2) {
  font-family: Manrope, sans-serif;
  font-size: 23px;
  letter-spacing: -0.035em;
  line-height: 1.3;
  margin: 0 0 12px;
}
:deep(h3) {
  font-size: 15px;
  line-height: 1.4;
  font-weight: 500;
  margin: 0 0 10px;
}
:deep(p) {
  line-height: 1.8;
}
:deep(.ws-muted) {
  color: var(--ws-muted);
  font-size: 13px;
}
:deep(.ws-kicker) {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #ccb57e;
  margin-bottom: 10px;
}
:deep(.ws-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  padding: 11px 20px;
  border: 1px solid #c7b6ea22;
  background: #d1c4ef08;
  border-radius: 15px;
  font-size: 12px;
  color: #e7e2ef;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
    background 0.35s,
    box-shadow 0.35s,
    border-color 0.35s;
}
:deep(.ws-button:hover:not(:disabled)) {
  transform: translateY(-2px);
  background: #d1c4ef13;
  border-color: #c7b6ea50;
  box-shadow: 0 5px 24px #a995dc10;
}
:deep(.ws-button:active:not(:disabled)) {
  transform: translateY(0) scale(0.98);
}
:deep(.ws-button:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}
:deep(.ws-button--primary) {
  background: #d7bd8720;
  border-color: #d7bd8750;
  color: #eddbb4;
}
:deep(.ws-button--danger) {
  color: #efb4b4;
  border-color: #efb4b435;
}
:deep(.ws-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 22px;
}
:deep(.ws-field) {
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-size: 12px;
  color: #c3c0cb;
  margin-bottom: 19px;
}
:deep(.ws-field input),
:deep(.ws-field textarea) {
  width: 100%;
  border: 1px solid #cfc6e91e;
  border-radius: 14px;
  background: #10111655;
  padding: 13px 15px;
  color: #f1edf6;
  font: inherit;
  line-height: 1.7;
  outline: none;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}
:deep(.ws-field input:focus),
:deep(.ws-field textarea:focus) {
  border-color: #b7a1df70;
  box-shadow: 0 0 0 3px #b7a1df10;
}
:deep(.ws-field textarea) {
  resize: vertical;
  min-height: 106px;
}
:deep(.ws-field small) {
  font-size: 11px;
  color: #97949f;
  line-height: 1.6;
}
:deep(.ws-grid) {
  display: grid;
  gap: 22px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
:deep(.ws-stack) {
  display: grid;
  gap: 18px;
}
:deep(.ws-chip) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #b8a3df25;
  border-radius: 100px;
  padding: 6px 13px;
  color: #c7b7e6;
  font-size: 10px;
  letter-spacing: 0.02em;
  background: #b8a3df07;
}
:deep(.ws-alert) {
  padding: 15px 19px;
  border: 1px solid #d8b97735;
  border-radius: 16px;
  color: #e3c991;
  background: #d8b97708;
  font-size: 13px;
  margin-bottom: 22px;
}
:deep(.ws-error) {
  color: #efb4b4;
  background: #efb4b408;
  border-color: #efb4b425;
}
:deep(.ws-success) {
  color: #c3d9c9;
  border-color: #c3d9c925;
  background: #c3d9c908;
}
:deep(.ws-empty) {
  padding: 48px 24px;
  text-align: center;
  border: 1px dashed #d5c9ed25;
  border-radius: 24px;
  color: #aaa6b3;
  font-size: 13px;
}
:deep(.ws-divider) {
  height: 1px;
  background: linear-gradient(90deg, transparent, #d5c9ed18, transparent);
  margin: 24px 0;
}
:deep(button:focus-visible),
:deep(a:focus-visible) {
  outline: 2px solid #d5bd83;
  outline-offset: 4px;
}
:deep(.ws-content-enter-active),
:deep(.ws-content-leave-active) {
  transition:
    opacity 0.24s ease,
    transform 0.48s cubic-bezier(0.16, 1, 0.3, 1);
}
:deep(.ws-content-enter-from),
:deep(.ws-content-leave-to) {
  opacity: 0;
  transform: translateY(7px);
}
@media (max-width: 700px) {
  .workspace-header {
    padding: 16px 20px;
    min-height: 76px;
  }
  .workspace-main {
    padding-top: 30px;
  }
  :deep(.ws-grid) {
    grid-template-columns: 1fr;
  }
  .workspace-heading {
    margin-bottom: 24px;
  }
  :deep(.ws-panel) {
    border-radius: 23px;
  }
  :deep(.ws-button) {
    padding-inline: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .workspace-brand,
  .workspace-mark {
    transform: none !important;
  }
  :deep(*),
  :deep(*::before),
  :deep(*::after) {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
