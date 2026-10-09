<script setup lang="ts">
import { usePasskey, passkeySupported, accountError } from '~/utils/passkeys'
type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string }
const security = ref<{ passkeys: Passkey[]; passkeyAvailable: boolean; fresh: boolean } | null>(
  null,
)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const password = ref('')
const confirmation = ref('')
const names = reactive<Record<string, string>>({})
const supported = ref(false)
let controller: AbortController | undefined
onBeforeUnmount(() => controller?.abort())
async function addPasskey() {
  controller = new AbortController()
  await perform(() => usePasskey(true, controller!.signal), 'Passkey added.')
}
async function load() {
  error.value = ''
  try {
    security.value = await $fetch<{
      passkeys: Passkey[]
      passkeyAvailable: boolean
      fresh: boolean
    }>('/api/workspace/auth/security' as string)
    for (const key of security.value!.passkeys) names[key.id] = key.friendly_name || 'My passkey'
  } catch (cause) {
    error.value = accountError(cause)
  }
}
async function perform(action: () => Promise<unknown>, message: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await action()
    notice.value = message
    await load()
  } catch (cause) {
    error.value = accountError(cause)
  } finally {
    busy.value = false
  }
}
async function changePassword() {
  if (password.value !== confirmation.value) {
    error.value = 'Your passwords do not match.'
    return
  }
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch<{ ok: boolean }>('/api/workspace/auth/password' as string, {
      method: 'POST',
      body: { action: 'change', password: password.value },
    })
    password.value = ''
    confirmation.value = ''
    await navigateTo('/login?password=updated')
  } catch (cause) {
    error.value = accountError(cause)
  } finally {
    busy.value = false
  }
}
async function remove(key: Passkey) {
  if (
    !window.confirm(
      `Remove ${key.friendly_name || 'this passkey'}? You can still sign in by email.`,
    )
  )
    return
  await perform(
    () =>
      $fetch<{ ok: boolean }>('/api/workspace/auth/passkey' as string, {
        method: 'POST',
        body: { action: 'delete', id: key.id },
      }),
    'Passkey removed.',
  )
}
onMounted(() => {
  supported.value = passkeySupported()
  void load()
})
</script>
<template>
  <section class="account-security" aria-labelledby="account-security-title">
    <p class="ws-kicker">Your account</p>
    <h2 id="account-security-title">Sign-in &amp; security</h2>
    <div class="ws-panel">
      <p class="ws-muted">
        Passkeys use your device’s fingerprint, face recognition, or security key. Email sign-in
        remains available for recovery.
      </p>
      <p v-if="error" class="security-error" role="alert">{{ error }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="security && !security.fresh" class="ws-muted">
        For your protection, <NuxtLink to="/login?reauth=1">sign in again</NuxtLink> before changing
        these settings.
      </p>
      <template v-if="security">
        <div v-for="key in security.passkeys" :key="key.id" class="security-key">
          <label :for="`key-${key.id}`"
            >Passkey name<input
              :id="`key-${key.id}`"
              v-model="names[key.id]"
              maxlength="120"
              :disabled="busy || !security.fresh"
          /></label>
          <small class="ws-muted">Added {{ new Date(key.created_at).toLocaleDateString() }}</small>
          <div class="ws-actions">
            <button
              class="ws-button"
              :disabled="busy || !security.fresh || !names[key.id]?.trim()"
              @click="
                perform(
                  () =>
                    $fetch<{ ok: boolean }>('/api/workspace/auth/passkey' as string, {
                      method: 'POST',
                      body: { action: 'rename', id: key.id, name: names[key.id] },
                    }),
                  'Passkey renamed.',
                )
              "
            >
              Rename</button
            ><button
              class="ws-button ws-button--danger"
              :disabled="busy || !security.fresh"
              @click="remove(key)"
            >
              Remove
            </button>
          </div>
        </div>
        <p v-if="!security.passkeyAvailable" class="ws-muted">
          Passkeys are currently unavailable. You can still use email or password.
        </p>
        <p v-else-if="!security.passkeys.length" class="ws-muted">No passkeys registered yet.</p>
        <button
          class="ws-button ws-button--primary"
          :disabled="busy || !security.fresh || !security.passkeyAvailable || !supported"
          @click="addPasskey"
        >
          Add a passkey
        </button>
        <form class="security-password" @submit.prevent="changePassword">
          <h3>Set or change password</h3>
          <label for="security-password"
            >New password<input
              id="security-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="12"
              maxlength="128"
              :disabled="busy || !security.fresh"
              placeholder="At least 12 characters"
          /></label>
          <label for="security-confirm"
            >Confirm password<input
              id="security-confirm"
              v-model="confirmation"
              type="password"
              autocomplete="new-password"
              required
              minlength="12"
              maxlength="128"
              :disabled="busy || !security.fresh"
          /></label>
          <p class="ws-muted">You’ll sign in again after changing your password.</p>
          <button class="ws-button" :disabled="busy || !security.fresh">Update password</button>
        </form>
      </template>
      <button v-else-if="error" class="ws-button" @click="load">Retry account settings</button>
      <p v-else class="ws-muted" role="status">Loading account security…</p>
    </div>
  </section>
</template>
<style scoped>
.account-security {
  margin-bottom: 2rem;
}
.security-key,
.security-password {
  border-top: 1px solid var(--ws-border, #ffffff1a);
  padding-top: 1.25rem;
  margin-top: 1.25rem;
  display: grid;
  gap: 0.85rem;
}
label {
  display: grid;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: #e7e7ed;
}
input {
  background: #10131ddb;
  border: 1px solid #ffffff24;
  border-radius: 10px;
  color: #f3f3f7;
  padding: 0.8rem;
  font: inherit;
  width: 100%;
  max-width: 32rem;
}
input:focus-visible {
  outline: 2px solid #a5b9ed;
  outline-offset: 3px;
}
.security-error {
  color: #ffc5c1;
}
a {
  text-decoration: underline;
  color: #becbf3;
}
@media (prefers-reduced-motion: no-preference) {
  input {
    transition: border-color 160ms;
  }
}
</style>
