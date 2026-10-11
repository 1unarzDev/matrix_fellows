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
const passkeySetupRequested = ref(false)
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
    passkeySetupRequested.value = false
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
  if (!security.value?.passkeys.length) {
    passkeySetupRequested.value = true
    notice.value = supported.value ? 'No passkey is registered on this account yet.' : 'Passkeys are not available on this device.'
    return
  }
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
      <p class="ws-muted">Choose a method to verify your account.</p>
      <p v-if="error" class="security-error" role="alert">{{ error }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>
      <template v-if="security">
        <section class="security-verification" aria-labelledby="security-verification-title">
          <div class="security-verification__heading">
            <h3 id="security-verification-title">Verify to continue</h3>
            <span class="security-verification__status" :class="{ 'is-ready': security.fresh }">
              {{ security.fresh ? 'Verified' : 'Needed' }}
            </span>
          </div>
          <div class="security-methods">
            <button class="security-method" type="button" :disabled="busy" @click="sendSignInEmail">
              <span class="security-method__icon" aria-hidden="true"><SiteIcon name="mail" :size="15" /></span>
              <strong>Email link</strong><small>{{ security.email }}</small>
            </button>
            <button class="security-method" type="button" :disabled="busy" @click="signInWithProvider('google')">
              <span class="security-method__icon" aria-hidden="true">G</span>
              <strong>Google</strong><small v-if="!providers.google">Not configured</small>
            </button>
            <button class="security-method" type="button" :disabled="busy" @click="signInWithProvider('azure')">
              <span class="security-method__icon" aria-hidden="true"><SiteIcon name="dashboard" :size="13" /></span>
              <strong>Microsoft</strong><small v-if="!providers.azure">Not configured</small>
            </button>
            <button class="security-method" type="button" aria-label="Passkey" :disabled="busy" @click="verifyWithPasskey">
              <span class="security-method__icon" aria-hidden="true"><SiteIcon name="lock" :size="14" /></span>
              <strong>Passkey</strong><small v-if="!(supported && security.passkeyAvailable)">Works when passkeys are enabled</small>
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
        <div v-if="passkeySetupRequested" class="passkey-setup-prompt">
          <p>{{ supported ? 'Set up a passkey on this device for faster sign-in.' : 'Passkeys are not available on this device.' }}</p>
          <button v-if="supported" class="ws-button ws-button--primary" :disabled="busy || !security.fresh" @click="addPasskey">
            Set up a passkey
          </button>
        </div>
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
.passkey-setup-prompt { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 14px; padding: 12px 0 0; border-top: 1px solid rgb(255 255 255 / 8%); }
.passkey-setup-prompt p { margin: 0; color: rgb(244 241 233 / 48%); font-size: 11px; line-height: 1.5; }
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
  margin-top: 1.25rem;
  padding-top: 1.1rem;
  border-top: 1px solid rgb(255 255 255 / 10%);
}
.security-verification__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.security-verification__heading h3 { margin: 0; font-size: 15px; font-weight: 500; letter-spacing: -.02em; }
.security-verification__status {
  color: rgb(244 241 233 / 38%);
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.security-verification__status.is-ready { color: rgb(180 211 190 / 72%); }
.security-methods { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; margin-top: .7rem; }
.security-method {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 11px 10px;
  border: 0;
  border-right: 1px solid rgb(255 255 255 / 8%);
  border-radius: 0;
  background: transparent;
  color: rgb(244 241 233 / 78%);
  text-align: left;
  cursor: pointer;
  transition: color 220ms ease, background-color 220ms ease;
}
.security-method:last-child { border-right: 0; }
.security-method:hover, .security-method:focus-visible { background: rgb(255 255 255 / 4%); color: #f4f1e9; }
.security-method:focus-visible { outline: 1px solid rgb(216 185 119 / 58%); outline-offset: -1px; }
.security-method:disabled { opacity: .5; cursor: wait; }
.security-method__icon { display: grid; place-items: center; width: 25px; height: 25px; flex: 0 0 auto; color: rgb(244 241 233 / 56%); font-size: 12px; font-weight: 600; }
.security-method strong { align-self: center; font-size: 11px; font-weight: 500; }
.security-method small { grid-column: 2; overflow: hidden; margin-top: -4px; color: rgb(244 241 233 / 38%); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
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
  color: rgb(216 185 119 / 62%);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.settings-password-card__mark { display: none; }
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
  .security-methods { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .security-method:nth-child(2) { border-right: 0; }
  .security-method:nth-child(-n + 2) { border-bottom: 1px solid rgb(255 255 255 / 8%); }
}
@media (prefers-reduced-motion: reduce) {
  .security-method { transition: none; }
}
</style>
