<script setup lang="ts">
const { guestIds, owner, ready, available, pending, error, mergeGuest, refresh } =
  useSavedOpportunities()
const transferred = ref(false)
async function transfer() {
  transferred.value = await mergeGuest()
}
</script>

<template>
  <aside
    v-if="ready && ((owner && guestIds.length) || error || !available || transferred)"
    class="save-notice"
    aria-label="Saved opportunities"
  >
    <template v-if="error || !available">
      <p role="alert">
        {{
          error || 'Browser storage is unavailable. Sign in to save opportunities to your account.'
        }}
      </p>
      <button v-if="error" type="button" :disabled="pending" @click="refresh">Retry</button>
      <NuxtLink v-else to="/login">Sign in</NuxtLink>
    </template>
    <template v-else-if="owner && guestIds.length">
      <div>
        <strong>Keep your browser saves</strong>
        <p>
          Your account collection is active. Add {{ guestIds.length }} browser saves without
          creating commitments.
        </p>
      </div>
      <button type="button" :disabled="pending" @click="transfer">
        {{ pending ? 'Adding…' : 'Add to account' }}
      </button>
    </template>
    <p v-else role="status">Browser saves added to your account. Your plan is unchanged.</p>
  </aside>
</template>

<style scoped>
.save-notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-block: 20px;
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, var(--color-acid) 20%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--color-acid) 3%, var(--color-ink));
  font-size: 12px;
  line-height: 1.7;
}
.save-notice strong {
  font-weight: 500;
  color: var(--color-paper);
}
.save-notice p {
  margin: 0;
  color: color-mix(in srgb, var(--color-paper) 70%, transparent);
}
.save-notice :is(button, a) {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid color-mix(in srgb, var(--color-acid) 24%, transparent);
  border-radius: 999px;
  color: var(--color-acid);
  text-decoration: none;
  transition:
    background 200ms,
    border-color 200ms;
}
.save-notice :is(button, a):hover {
  background: color-mix(in srgb, var(--color-acid) 7%, transparent);
  border-color: var(--color-acid);
}
.save-notice :is(button, a):focus-visible {
  outline: 2px solid var(--color-acid);
  outline-offset: 3px;
}
.save-notice button:disabled {
  opacity: 0.5;
}
@media (prefers-reduced-motion: reduce) {
  .save-notice :is(button, a) {
    transition: none;
  }
}
</style>
