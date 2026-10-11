<script setup lang="ts">
import { usePasskey, passkeySupported, accountError } from '~/utils/passkeys'
type Passkey = { id: string; friendly_name?: string; created_at: string; last_used_at?: string }
type Provider = 'google' | 'azure'
const security = ref<{
  email: string
  passkeys: Passkey[]
  passkeyAvailable: boolean
  fresh: boolean
} | null>(
  null,
)
const providers = ref({ google: true, azure: true })
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
    const [nextSecurity, nextProviders] = await Promise.all([
      $fetch<{
        email: string
        passkeys: Passkey[]
        passkeyAvailable: boolean
        fresh: boolean
      }>('/api/workspace/auth/security' as string),
      $fetch<{ google: boolean; azure: boolean }>('/api/workspace/auth/providers' as string).catch(
        () => ({ google: false, azure: false }),
      ),
    ])
    security.value = nextSecurity
    providers.value = nextProviders
    for (const key of security.value!.passkeys) names[key.id] = key.friendly_name || 'My passkey'
  } catch (cause) {
    error.value = accountError(cause)
  }
}
async function sendSignInEmail() {
  if (busy.value || !security.value?.email) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await $fetch('/api/workspace/auth/login' as string, {
      method: 'POST',
      body: { provider: 'email', email: security.value.email },
    })
    notice.value = `A sign-in link is on its way to ${security.value.email}. Open it in this browser to continue.`
  } catch (cause) {
    error.value = accountError(cause)
  } finally {
    busy.value = false
  }
}
async function signInWithProvider(provider: Provider) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ url?: string }>('/api/workspace/auth/login' as string, {
      method: 'POST',
      body: { provider },
    })
    if (result.url) window.location.assign(result.url)
    else throw new Error('The sign-in provider did not return a redirect.')
  } catch (cause) {
    error.value = accountError(cause)
    busy.value = false
  }
}
async function verifyWithPasskey() {
  controller = new AbortController()
  await perform(() => usePasskey(false, controller!.signal), 'Identity verified. You can update security settings now.')
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
  <section class="account-security ws-panel settings-panel settings-security-panel" aria-labelledby="account-security-title">
    <div class="settings-panel__heading">
      <div>
        <p class="settings-panel__eyebrow">Your account</p>
        <h2 id="account-security-title">Sign-in &amp; security</h2>
      </div>
      <span class="settings-panel__icon" aria-hidden="true"><SiteIcon name="lock" :size="17" /></span>
    </div>
      <p class="ws-muted">
        Passkeys use your device’s fingerprint, face recognition, or security key. Email sign-in
        remains available for recovery.
      </p>
      <p v-if="error" class="security-error" role="alert">{{ error }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <template v-if="security">
        <section class="security-verification" aria-labelledby="security-verification-title">
          <div class="security-verification__heading">
            <div>
              <p class="settings-panel__eyebrow">Security check</p>
              <h3 id="security-verification-title">Choose how to verify your account</h3>
            </div>
            <span class="security-verification__status" :class="{ 'is-ready': security.fresh }">
              {{ security.fresh ? 'Verified' : 'Needed' }}
            </span>
          </div>
          <p class="ws-muted">
            Password changes need a recent sign-in. Use the option that is easiest on this device;
            the link and provider options return you to this dashboard.
          </p>
          <div class="security-methods">
            <button class="security-method" type="button" :disabled="busy" @click="sendSignInEmail">
              <span class="security-method__icon" aria-hidden="true"><SiteIcon name="mail" :size="16" /></span>
              <span><strong>Send an email</strong><small>{{ security.email }}</small></span>
            </button>
            <button class="security-method" type="button" :disabled="busy" @click="signInWithProvider('google')">
              <span class="security-method__icon security-method__icon--google" aria-hidden="true">G</span>
              <span><strong>Use Google</strong><small>{{ providers.google ? 'Continue with Google' : 'Set up Google in Supabase' }}</small></span>
            </button>
            <button class="security-method" type="button" :disabled="busy" @click="signInWithProvider('azure')">
              <span class="security-method__icon security-method__icon--microsoft" aria-hidden="true"><SiteIcon name="dashboard" :size="14" /></span>
              <span><strong>Use Microsoft</strong><small>{{ providers.azure ? 'Continue with Microsoft' : 'Set up Microsoft in Supabase' }}</small></span>
            </button>
            <button class="security-method" type="button" :disabled="busy" @click="verifyWithPasskey">
              <span class="security-method__icon" aria-hidden="true"><SiteIcon name="lock" :size="15" /></span>
              <span><strong>Use a passkey</strong><small>{{ supported && security.passkeyAvailable ? 'Use this device or security key' : 'Works when passkeys are enabled on this device' }}</small></span>
            </button>
          </div>
        </section>
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
        <button
          class="ws-button ws-button--primary"
          :disabled="busy || !security.fresh"
          @click="addPasskey"
        >
          {{ security.passkeys.length ? 'Add another passkey' : 'Set up a passkey' }}
        </button>
        <form class="security-password settings-password-card" @submit.prevent="changePassword">
          <div class="settings-password-card__heading">
            <div>
              <p class="settings-panel__eyebrow">Account recovery</p>
              <h3>Set or change password</h3>
            </div>
            <span class="settings-password-card__mark" aria-hidden="true">✦</span>
          </div>
          <label for="security-password"
            >New password<input
              id="security-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              minlength="12"
              maxlength="128"
              :disabled="busy"
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
              :disabled="busy"
          /></label>
          <p class="ws-muted">After saving, your current dashboard session will close and you’ll sign in again.</p>
          <button class="ws-button" :disabled="busy || !security.fresh">Update password</button>
        </form>
      </template>
      <button v-else-if="error" class="ws-button" @click="load">Retry account settings</button>
      <p v-else class="ws-muted" role="status">Loading account security…</p>
  </section>
</template>
<style scoped>
.account-security {
  margin-bottom: 2rem;
}
.settings-security-panel {
  background:
    radial-gradient(28rem 18rem at 100% 0%, rgb(228 187 114 / 8%), transparent 70%),
    linear-gradient(145deg, rgb(244 241 233 / 6%), rgb(244 241 233 / 2.4%) 48%, transparent 78%),
    rgb(10 12 16 / 54%);
}
.security-key,
.security-password {
  border-top: 1px solid var(--ws-border, #ffffff1a);
  padding-top: 1.25rem;
  margin-top: 1.25rem;
  display: grid;
  gap: 0.85rem;
}
.security-password {
  position: relative;
  overflow: hidden;
  padding: 1.35rem;
  border: 1px solid rgb(228 187 114 / 15%);
  border-radius: 20px;
  background: rgb(255 255 255 / 2.5%);
  backdrop-filter: blur(14px) saturate(112%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%);
}
.security-password > * {
  position: relative;
  z-index: 1;
}
.security-verification {
  margin-top: 1.4rem;
  padding: 1.25rem;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 20px;
  background: rgb(255 255 255 / 2%);
  backdrop-filter: blur(14px) saturate(112%);
}
.security-verification__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.security-verification__heading h3 { margin: 5px 0 0; font-size: 16px; font-weight: 500; }
.security-verification__status {
  flex: 0 0 auto;
  padding: 5px 9px;
  border: 1px solid rgb(228 187 114 / 28%);
  border-radius: 999px;
  color: #d8c189;
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.security-verification__status.is-ready { border-color: rgb(155 204 173 / 32%); color: #acd8ba; }
.security-methods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 1rem; }
.security-method {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 13px;
  background: rgb(255 255 255 / 1.5%);
  color: #e9e5ee;
  text-align: left;
  cursor: pointer;
  transition: border-color 220ms ease, background-color 220ms ease, transform 220ms ease;
}
.security-method:hover, .security-method:focus-visible { border-color: rgb(228 187 114 / 45%); background: rgb(228 187 114 / 6%); transform: translateY(-1px); }
.security-method:focus-visible { outline: 2px solid #d8b977; outline-offset: 2px; }
.security-method:disabled { opacity: .58; cursor: wait; transform: none; }
.security-method__icon { display: grid; place-items: center; width: 29px; height: 29px; flex: 0 0 auto; border: 1px solid rgb(228 187 114 / 25%); border-radius: 50%; color: #e4bb72; font-size: 13px; font-weight: 600; }
.security-method__icon--google { color: #c6d5ff; }
.security-method__icon--microsoft { color: #b9c9ff; }
.security-method span:last-child { display: grid; gap: 3px; min-width: 0; }
.security-method strong { font-size: 11px; font-weight: 500; }
.security-method small { overflow: hidden; color: #97919f; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.settings-password-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.settings-password-card__heading h3 {
  margin: 5px 0 0;
}
.settings-panel__eyebrow {
  margin: 0;
  color: #d8b977;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.settings-password-card__mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgb(228 187 114 / 22%);
  border-radius: 50%;
  color: #e4bb72;
  background: rgb(228 187 114 / 7%);
  box-shadow: 0 0 22px rgb(228 187 114 / 8%);
}
label {
  display: grid;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: #e7e7ed;
}
input {
  background: rgb(255 255 255 / 2.5%);
  border: 1px solid rgb(255 255 255 / 23%);
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
@media (max-width: 560px) {
  .security-methods { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .security-method { transition: none; }
}
</style>
