<script setup lang="ts">
import '~/assets/dashboard-controls.css'
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    skipLabel?: string
    variant?: 'dashboard' | 'auth'
  }>(),
  {
    variant: 'dashboard',
  },
)
</script>

<template>
  <div class="workspace-shell" :class="{ 'workspace-shell--auth': variant === 'auth' }">
    <a href="#workspace-main" class="workspace-skip">{{
      skipLabel || (variant === 'auth' ? 'Skip to sign-in' : 'Skip to dashboard')
    }}</a>
    <div class="workspace-glow" aria-hidden="true" />
    <div v-if="variant !== 'auth'" class="workspace-quasar" aria-hidden="true"><span class="workspace-quasar__jet workspace-quasar__jet--one" /><span class="workspace-quasar__jet workspace-quasar__jet--two" /><span class="workspace-quasar__core" /><span class="workspace-quasar__stars" /></div>
    <ScienceAccent v-if="variant !== 'auth'" theme="astronomy" />
    <div v-if="$slots.background" class="workspace-background" aria-hidden="true">
      <slot name="background" />
    </div>
    <header class="workspace-header">
      <NuxtLink to="/" class="workspace-brand group" aria-label="Matrix Fellows home">
        <span class="workspace-mark"><MatrixMark class="h-6 w-6" /></span>
        <span class="workspace-wordmark"><span>Matrix</span><strong>Fellows</strong></span>
      </NuxtLink>
      <slot name="header" />
    </header>
    <main id="workspace-main" class="workspace-main" tabindex="-1">
      <div v-if="variant !== 'auth'" class="workspace-heading workspace-heading--utility">
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
.workspace-shell--auth {
  display: flex;
  flex-direction: column;
  background: #090a10;
}
.workspace-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
.workspace-shell--auth .workspace-header {
  position: relative;
  z-index: 1;
}
.workspace-shell--auth .workspace-main {
  display: grid;
  place-items: center;
  flex: 1;
  width: 100%;
  margin: 0;
  max-width: none;
  padding: 36px 20px 100px;
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
.workspace-quasar {
  position: fixed;
  z-index: -1;
  top: -8vh;
  right: -9vw;
  width: min(76vw, 1040px);
  height: min(76vw, 1040px);
  pointer-events: none;
  opacity: .42;
  transform: rotate(-17deg);
  filter: saturate(.82);
  animation: quasar-drift 24s ease-in-out infinite alternate;
}
.workspace-quasar__core,
.workspace-quasar__jet,
.workspace-quasar__stars {
  position: absolute;
  inset: 0;
  display: block;
}
.workspace-quasar__core {
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 48% 50%, #fff5cf 0 1%, #ffc875 3%, #eb873d 8%, rgb(208 90 42 / 35%) 17%, transparent 37%),
    radial-gradient(ellipse at 50% 50%, transparent 25%, rgb(222 94 49 / 19%) 40%, transparent 64%);
  box-shadow: 0 0 46px rgb(255 172 92 / 25%), 0 0 135px rgb(230 86 48 / 16%);
  transform: rotate(14deg) scaleY(.32);
  animation: quasar-spin 30s linear infinite;
}
.workspace-quasar__core::before,
.workspace-quasar__core::after {
  content: '';
  position: absolute;
  inset: 25%;
  border-radius: 50%;
  border: 1px solid rgb(255 198 116 / 23%);
  box-shadow: 0 0 32px rgb(255 134 59 / 14%), inset 0 0 24px rgb(255 181 93 / 13%);
}
.workspace-quasar__core::after { inset: 33%; border-color: rgb(255 226 162 / 30%); transform: rotate(45deg) scaleX(1.8); }
.workspace-quasar__jet { left: 48%; right: auto; width: 2px; height: 125%; top: -13%; background: linear-gradient(transparent, rgb(255 178 109 / 9%), #fff4c6, rgb(255 166 88 / 12%), transparent); filter: blur(1px); opacity: .5; transform: rotate(25deg); }
.workspace-quasar__jet--two { width: 1px; opacity: .32; transform: rotate(-25deg); }
.workspace-quasar__stars { opacity: .55; background-image: radial-gradient(circle at 12% 28%, #fff 0 1px, transparent 1.6px), radial-gradient(circle at 82% 21%, #ffd8b0 0 1px, transparent 1.6px), radial-gradient(circle at 74% 74%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 24% 77%, #e0b8ff 0 1px, transparent 1.7px), radial-gradient(circle at 57% 13%, #fff 0 1px, transparent 1.4px); animation: quasar-shimmer 6s ease-in-out infinite alternate; }
@keyframes quasar-spin { to { transform: rotate(374deg) scaleY(.32); } }
@keyframes quasar-drift { from { transform: rotate(-17deg) translate3d(0,0,0) scale(.98); } to { transform: rotate(-12deg) translate3d(-2%,2%,0) scale(1.03); } }
@keyframes quasar-shimmer { from { opacity: .28; transform: scale(.98); } to { opacity: .7; transform: scale(1.02); } }
@media (max-width: 720px) { .workspace-quasar { top: 3vh; right: -42vw; width: 130vw; height: 130vw; opacity: .28; } }
@media (prefers-reduced-motion: reduce) { .workspace-quasar,.workspace-quasar__core,.workspace-quasar__stars { animation: none; } }
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
  opacity: 0;
  pointer-events: none;
}
.workspace-skip:focus-visible {
  top: 15px;
  opacity: 1;
  pointer-events: auto;
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
  padding: 16px clamp(20px, 4vw, 60px) 90px;
  position: relative;
}
.workspace-heading {
  margin-bottom: 30px;
  max-width: 800px;
}
.workspace-heading--utility {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.workspace-heading h1 {
  font-family: Manrope, sans-serif;
  font-size: clamp(24px, 3vw, 32px);
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
