<script setup lang="ts">
import { usePasskey, passkeySupported, accountError } from '~/utils/passkeys'
useSeoMeta({ title: 'Sign in or create an account | Matrix Fellows', robots: 'noindex, nofollow' })
const email = ref('')
const token = ref('')
const sent = ref(false)
const busy = ref(false)
const error = ref('')
const configured = ref(true)
const checking = ref(true)
const providers = ref({ google: false, azure: false, passkey: false })
const password = ref('')
const confirmPassword = ref('')
const passwordMode = ref<'signin' | 'signup' | 'recover' | 'reset'>('signin')
const notice = ref('')
const supportsPasskey = ref(false)
const method = ref<'link' | 'password'>('link')
const emailInput = ref<HTMLInputElement | null>(null)
const tokenInput = ref<HTMLInputElement | null>(null)
const stateHeight = ref<number | null>(null)
const stateContainer = ref<HTMLElement | null>(null)
const userInitiated = ref(false)
const morphingPassword = ref(false)
const needsConfirmation = computed(() => ['signup', 'reset'].includes(passwordMode.value))
let passwordMorphTimer: ReturnType<typeof setTimeout> | undefined
let stateObserver: ResizeObserver | undefined
let passkeyController: AbortController | undefined
const route = useRoute()
function focusState() {
  if (
    !checking.value &&
    configured.value &&
    (userInitiated.value || window.matchMedia('(pointer: fine)').matches)
  )
    (sent.value ? tokenInput.value : emailInput.value)?.focus({ preventScroll: true })
}
function measureState(element: Element) {
  stateHeight.value = (element as HTMLElement).offsetHeight
  stateObserver?.disconnect()
  stateObserver?.observe(element)
}
onBeforeUnmount(() => {
  clearTimeout(passwordMorphTimer)
  stateObserver?.disconnect()
  passkeyController?.abort()
})
function resetEmail() {
  sent.value = false
  token.value = ''
  error.value = ''
}
function selectMethod(value: 'link' | 'password') {
  if (busy.value) return
  method.value = value
  error.value = ''
}
function continueEmail() {
  if (method.value === 'link') void login('email')
  else void submitPassword()
}
async function submitPassword() {
  if (busy.value) return
  error.value = ''
  notice.value = ''
  if (
    ['signup', 'reset'].includes(passwordMode.value) &&
    password.value !== confirmPassword.value
  ) {
    error.value = 'Your passwords do not match.'
    return
  }
  busy.value = true
  try {
    await $fetch('/api/workspace/auth/password', {
      method: 'POST',
      body: {
        action: passwordMode.value,
        ...(passwordMode.value !== 'reset' ? { email: email.value.trim() } : {}),
        ...(passwordMode.value !== 'recover' ? { password: password.value } : {}),
      },
    })
    if (passwordMode.value === 'signin') await navigateTo('/dashboard')
    else if (passwordMode.value === 'reset') {
      passwordMode.value = 'signin'
      await navigateTo('/login', { replace: true })
      notice.value = 'Password updated. Sign in with your new password.'
    } else
      notice.value =
        passwordMode.value === 'signup'
          ? 'Check your email to confirm your account. Open the link in this browser.'
          : 'If this email has an account, a reset link is on its way. Open it in this browser.'
    password.value = ''
    confirmPassword.value = ''
  } catch (cause) {
    error.value = accountError(cause)
  } finally {
    busy.value = false
  }
}
function changePasswordMode(value: typeof passwordMode.value) {
  if (busy.value) return
  clearTimeout(passwordMorphTimer)
  morphingPassword.value = true
  passwordMorphTimer = setTimeout(() => {
    morphingPassword.value = false
  }, 420)
  passwordMode.value = value
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  notice.value = ''
}
async function signInPasskey() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  passkeyController = new AbortController()
  try {
    await usePasskey(false, passkeyController.signal)
    await navigateTo('/dashboard')
  } catch (cause) {
    error.value = accountError(cause)
  } finally {
    busy.value = false
  }
}
async function login(provider: 'google' | 'azure' | 'email') {
  if (busy.value || (provider === 'email' && method.value !== 'link')) return
  userInitiated.value = true
  busy.value = true
  error.value = ''
  try {
    const response = await $fetch<{ url?: string; sent?: boolean }>('/api/workspace/auth/login', {
      method: 'POST',
      body: { provider, ...(provider === 'email' ? { email: email.value.trim() } : {}) },
    })
    if (response.url) window.location.assign(response.url)
    else if (response.sent) sent.value = true
  } catch (cause: any) {
    error.value =
      cause?.data?.message ||
      cause?.data?.statusMessage ||
      'We could not send your link. Please try again.'
  } finally {
    busy.value = false
  }
}
async function verify() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/workspace/auth/callback', {
      method: 'POST',
      body: { email: email.value.trim(), token: token.value },
    })
    await navigateTo('/dashboard')
  } catch (cause: any) {
    error.value =
      cause?.data?.message ||
      cause?.data?.statusMessage ||
      'That code could not be verified. Check your email and try again.'
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  supportsPasskey.value = passkeySupported()
  stateObserver = new ResizeObserver((entries) => {
    const element = entries[0]?.target as HTMLElement | undefined
    if (element?.isConnected) stateHeight.value = element.offsetHeight
  })
  await nextTick()
  const initial = stateContainer.value?.firstElementChild
  if (initial) measureState(initial)
  try {
    const session = await $fetch<{ configured: boolean; authenticated: boolean }>(
      '/api/workspace/auth/session',
    )
    configured.value = session.configured
    if (route.query.recovery === '1') {
      method.value = 'password'
      passwordMode.value = 'reset'
      try {
        await $fetch('/api/workspace/auth/security?recovery=1')
      } catch {
        passwordMode.value = 'recover'
        error.value = 'Your reset link expired. Request another below.'
      }
    } else if (session.authenticated && route.query.reauth !== '1') await navigateTo('/dashboard')
    if (session.configured) {
      try {
        providers.value = await $fetch<typeof providers.value>('/api/workspace/auth/providers')
      } catch {
        /* Email remains available independently of OAuth. */
      }
    }
    if (route.query.error)
      error.value = 'Sign-in did not complete. Please verify your email and try again.'
    if (route.query.password === 'updated')
      notice.value = 'Password updated. Sign in again to continue.'
    if (route.query.reauth === '1')
      notice.value = 'Sign in again to unlock account security settings for five minutes.'
  } catch {
    error.value = 'Unable to check sign-in availability. Please refresh and try again.'
    configured.value = false
  } finally {
    checking.value = false
  }
})
</script>

<template>
  <WorkspaceShell variant="auth">
    <template #background><WorkspaceAccessCosmos /></template>
    <template #header
      ><NuxtLink to="/" class="login-home"
        >Back to the society<SiteIcon name="arrow" :size="14" /></NuxtLink
    ></template>
    <section class="login-panel" aria-labelledby="login-title" :aria-busy="busy || checking">
      <h1 id="login-title">
        {{
          sent
            ? 'Check your inbox.'
            : method === 'password' && passwordMode === 'reset'
              ? 'Reset your password.'
              : 'Welcome to Matrix.'
        }}
      </h1>
      <p class="login-intro">
        {{
          sent
            ? 'Your next step is in your email.'
            : method === 'password' && passwordMode === 'reset'
              ? 'Choose a strong password for your account.'
              : 'Sign in or create your account.'
        }}
      </p>
      <Transition name="auth-alert"
        ><p v-if="error" role="alert" class="login-error">{{ error }}</p></Transition
      >
      <p v-if="notice" class="login-helper" role="status">{{ notice }}</p>
      <div
        ref="stateContainer"
        class="login-state"
        :class="{ 'login-state--morphing': morphingPassword }"
        :style="stateHeight === null ? undefined : { height: `${stateHeight}px` }"
      >
        <Transition name="auth-state" mode="out-in" @enter="measureState" @after-enter="focusState">
          <div v-if="checking" key="checking" class="login-checking" role="status">
            <span class="login-spinner" aria-hidden="true" />Checking secure access…
          </div>
          <div v-else-if="!configured" key="unconfigured" class="login-unavailable">
            Sign-in is temporarily unavailable. Please try again later.
          </div>
          <form v-else-if="!sent" key="email" class="login-form" @submit.prevent="continueEmail">
            <div
              v-if="passwordMode !== 'reset'"
              class="login-methods"
              role="group"
              aria-label="Email sign-in method"
            >
              <span
                class="login-method-highlight"
                :class="{ 'is-password': method === 'password' }"
                aria-hidden="true"
              />
              <button
                type="button"
                :aria-pressed="method === 'link'"
                :disabled="busy"
                @click="selectMethod('link')"
              >
                Email link
              </button>
              <button
                type="button"
                :aria-pressed="method === 'password'"
                :disabled="busy"
                @click="selectMethod('password')"
              >
                Password
              </button>
            </div>
            <label v-if="passwordMode !== 'reset'" for="login-email">Account email</label>
            <div v-if="passwordMode !== 'reset'" class="login-input-wrap">
              <SiteIcon name="mail" :size="17" /><input
                id="login-email"
                ref="emailInput"
                v-model="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                required
                placeholder="you@example.org"
                :disabled="busy"
              />
            </div>
            <div class="login-method-stage">
              <Transition name="auth-method">
                <div v-if="method === 'link'" key="link" class="login-method-body">
                  <button class="login-primary" :disabled="busy" type="submit">
                    <span>{{ busy ? 'Sending your link…' : 'Continue with email' }}</span
                    ><span v-if="busy" class="login-spinner" aria-hidden="true" /><SiteIcon
                      v-else
                      name="right"
                      :size="16"
                    />
                  </button>
                  <p class="login-helper">We’ll email a secure sign-in link. No password needed.</p>
                </div>
                <div v-else key="password" class="login-method-body">
                  <label v-if="passwordMode !== 'recover'" for="login-password">{{
                    passwordMode === 'reset' ? 'New password' : 'Password'
                  }}</label>
                  <div v-if="passwordMode !== 'recover'" class="login-input-wrap">
                    <SiteIcon name="lock" :size="17" /><input
                      id="login-password"
                      v-model="password"
                      type="password"
                      :disabled="busy"
                      :autocomplete="
                        passwordMode === 'signin' ? 'current-password' : 'new-password'
                      "
                      :minlength="passwordMode === 'signin' ? 1 : 12"
                      maxlength="128"
                      required
                      :placeholder="
                        passwordMode === 'signin' ? 'Your password' : 'At least 12 characters'
                      "
                    />
                  </div>
                  <div
                    class="login-confirmation"
                    :class="{ 'is-expanded': needsConfirmation }"
                    :inert="!needsConfirmation"
                    :aria-hidden="!needsConfirmation"
                  >
                    <div class="login-confirmation-inner">
                      <label for="login-password-confirm">Confirm password</label>
                      <div class="login-input-wrap">
                        <SiteIcon name="lock" :size="17" /><input
                          id="login-password-confirm"
                          v-model="confirmPassword"
                          type="password"
                          autocomplete="new-password"
                          :required="needsConfirmation"
                          minlength="12"
                          maxlength="128"
                          :disabled="busy || !needsConfirmation"
                          placeholder="Repeat your password"
                        />
                      </div>
                    </div>
                  </div>
                  <button class="login-primary" type="submit" :disabled="busy">
                    <Transition name="auth-copy" mode="out-in"
                      ><span :key="busy ? 'busy' : passwordMode">
                        {{
                          busy
                            ? 'Please wait…'
                            : passwordMode === 'signin'
                              ? 'Sign in with password'
                              : passwordMode === 'signup'
                                ? 'Create account'
                                : passwordMode === 'recover'
                                  ? 'Send reset link'
                                  : 'Update password'
                        }}
                      </span></Transition
                    >
                  </button>
                  <div class="login-password-actions" v-if="passwordMode !== 'reset'">
                    <button
                      type="button"
                      class="login-change"
                      :disabled="busy"
                      @click="changePasswordMode(passwordMode === 'signin' ? 'signup' : 'signin')"
                    >
                      <Transition name="auth-copy" mode="out-in"
                        ><span :key="passwordMode === 'signin' ? 'signup' : 'signin'">{{
                          passwordMode === 'signin' ? 'Create an account' : 'Back to sign in'
                        }}</span></Transition
                      >
                    </button>
                    <button
                      type="button"
                      class="login-change login-forgot"
                      :class="{ 'is-hidden': passwordMode !== 'signin' }"
                      :inert="passwordMode !== 'signin'"
                      :aria-hidden="passwordMode !== 'signin'"
                      :disabled="busy || passwordMode !== 'signin'"
                      @click="changePasswordMode('recover')"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            <div v-if="passwordMode !== 'reset'" class="login-alternatives">
              <span class="login-or">or continue with</span>
              <div class="login-providers">
                <button
                  :disabled="busy || !providers.google"
                  type="button"
                  aria-label="Continue with Google"
                  @click="login('google')"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.4 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.3a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 2.9-4.3 2.9-7.5ZM12 22c2.7 0 4.9-.9 6.5-2.3L15.3 17c-.9.6-2 .9-3.3.9-2.6 0-4.8-1.7-5.6-4H3.1v2.6A10 10 0 0 0 12 22ZM6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14ZM12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10c.8-2.3 3-3.9 5.6-3.9Z"
                    /></svg
                  ><span>Google<small v-if="!providers.google">Not configured</small></span>
                </button>
                <button
                  :disabled="busy || !providers.azure"
                  type="button"
                  aria-label="Continue with Microsoft"
                  @click="login('azure')"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M0 0h9v9H0zm11 0h9v9h-9zM0 11h9v9H0zm11 0h9v9h-9z" /></svg
                  ><span>Microsoft<small v-if="!providers.azure">Not configured</small></span>
                </button>
              </div>
              <button
                class="login-passkey"
                type="button"
                :disabled="busy || !providers.passkey || !supportsPasskey"
                aria-label="Sign in with a passkey"
                @click="signInPasskey"
              >
                <SiteIcon name="lock" :size="15" /><span>Use a passkey</span
                ><small v-if="!supportsPasskey">Browser unavailable</small
                ><small v-else-if="!providers.passkey">Not configured</small>
              </button>
            </div>
          </form>
          <div v-else key="sent" class="login-sent">
            <p class="login-recipient" role="status">
              We sent a secure link to <strong>{{ email }}</strong>
            </p>
            <p class="login-helper">
              Open the link to continue. If your email includes a six-digit code, you can enter it
              below.
            </p>
            <form class="login-form" @submit.prevent="verify">
              <label for="login-code">Email verification code</label
              ><input
                id="login-code"
                ref="tokenInput"
                v-model="token"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="[0-9]{6}"
                maxlength="6"
                required
                class="login-code"
                placeholder="000000"
                :disabled="busy"
              /><button class="login-primary" :disabled="busy || token.length !== 6" type="submit">
                <span>{{ busy ? 'Verifying…' : 'Verify code' }}</span
                ><span v-if="busy" class="login-spinner" aria-hidden="true" /><SiteIcon
                  v-else
                  name="right"
                  :size="16"
                />
              </button>
            </form>
            <button class="login-change" :disabled="busy" @click="resetEmail">
              Use another email
            </button>
          </div>
        </Transition>
      </div>
      <p class="login-footnote">
        <SiteIcon name="lock" :size="12" />Club participation approval is separate.
      </p>
      <p class="login-legal">
        By creating an account or using member tools, you agree to our
        <NuxtLink to="/terms">Terms of service</NuxtLink>. Read our
        <NuxtLink to="/privacy">Privacy policy</NuxtLink>.
      </p>
    </section>
  </WorkspaceShell>
</template>

<style scoped>
.login-legal {
  margin: 18px 0 0;
  color: #aaa8b1;
  font-size: 11px;
  line-height: 1.8;
  text-align: center;
}
.login-legal a {
  color: #dfc68f;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 180ms ease;
}
.login-legal a:hover {
  color: #f4dfb7;
}
.login-legal a:focus-visible {
  outline: 2px solid #d8b977;
  outline-offset: 4px;
  border-radius: 2px;
}
.login-panel {
  width: min(100%, 430px);
  padding: clamp(24px, 4vw, 32px);
  border: 1px solid #dacdf222;
  border-radius: 30px;
  background: linear-gradient(140deg, #24232d9c, #11121bd1);
  backdrop-filter: blur(28px) saturate(115%);
  box-shadow:
    inset 0 1px 0 #ffffff0a,
    0 24px 90px #00000042;
  animation: auth-arrive 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.login-panel h1 {
  font-family: Manrope, sans-serif;
  font-size: clamp(26px, 4vw, 30px);
  line-height: 1.2;
  letter-spacing: -0.045em;
}
.login-intro {
  font-size: 13px;
  line-height: 1.8;
  color: #aaa8b5;
  margin: 10px 0 20px;
}
.login-form {
  display: grid;
  gap: 10px;
}
.login-form label {
  font-size: 12px;
  color: #d9d5de;
}
.login-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid #dacdf224;
  border-radius: 15px;
  background: #080b102f;
  color: #9e93b0;
  transition:
    border-color 240ms ease,
    box-shadow 320ms ease;
}
.login-input-wrap:focus-within {
  border-color: #c8b0ee65;
  box-shadow: 0 0 0 3px #c8b0ee0b;
}
.login-input-wrap input {
  width: 100%;
  min-width: 0;
  height: 52px;
  background: transparent;
  color: #eeedf2;
  border: 0;
  outline: 0;
  font-size: 16px;
}
.login-input-wrap input::placeholder {
  color: #8c8596;
}
.login-primary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  margin-top: 6px;
  padding: 14px 18px;
  border: 1px solid #d9bf8b55;
  border-radius: 15px;
  background: linear-gradient(120deg, #d8b97726, #d8b97715);
  color: #edd5a1;
  font-size: 13px;
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    background 300ms ease,
    box-shadow 400ms ease;
}
.login-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  background: #d8b9772d;
  box-shadow: 0 8px 25px #d8b9770c;
}
.login-primary:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.login-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  position: relative;
  isolation: isolate;
  padding: 4px;
  margin-bottom: 4px;
  border-radius: 15px;
  border: 1px solid #dacdf218;
  background: #080b102f;
}
.login-methods button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  font-size: 12px;
  color: #aaa0bb;
  transition: color 240ms ease;
  border-radius: 11px;
}
.login-methods button[aria-pressed='true'] {
  color: #e8d3a6;
}
.login-method-highlight {
  position: absolute;
  z-index: -1;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 11px;
  background: #d8b9770e;
  box-shadow:
    inset 0 0 0 1px #d8b97729,
    0 4px 15px #00000014;
  transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
.login-method-highlight.is-password {
  transform: translateX(100%);
}
.method-status {
  font-size: 9px;
  line-height: 1;
  color: #a79bb8;
}
.login-method-body {
  display: grid;
  gap: 8px;
  grid-area: 1 / 1;
  align-content: start;
  align-self: start;
}
.login-method-stage {
  display: grid;
}
.login-confirmation {
  display: grid;
  align-self: start;
  min-height: 0;
  grid-template-rows: minmax(0, 0fr);
  opacity: 0;
  margin-block: -4px;
  transform: translateY(-5px);
  transition:
    grid-template-rows 380ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 380ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms ease,
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
}
.login-confirmation.is-expanded {
  grid-template-rows: minmax(0, 1fr);
  opacity: 1;
  margin-block: 0;
  transform: none;
}
.login-confirmation-inner {
  min-height: 0;
  overflow: hidden;
}
.login-confirmation-inner > label {
  display: block;
  margin-bottom: 8px;
}
.login-confirmation.is-expanded .login-confirmation-inner {
  overflow: clip;
  overflow-clip-margin: 4px;
}
.login-state--morphing {
  height: auto !important;
  transition: none;
}
.login-forgot {
  transition:
    opacity 180ms ease,
    color 220ms ease,
    visibility 180ms;
}
.login-forgot.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.auth-copy-enter-active {
  transition:
    opacity 180ms ease,
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}
.auth-copy-leave-active {
  transition:
    opacity 90ms ease,
    transform 90ms ease;
}
.auth-copy-enter-from {
  opacity: 0;
  transform: translateY(3px);
}
.auth-copy-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
.login-password-actions .login-change {
  min-width: 0;
  min-height: 44px;
  padding-inline: 0;
  margin-inline: 0;
  text-align: left;
}
.login-method-body input:disabled {
  font-size: 12px;
}
.login-providers small {
  display: block;
  margin-top: 3px;
  font-size: 9px;
  color: #a89ab9;
}
.login-passkey {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  margin-top: 10px;
  min-height: 44px;
  color: #cac4d5;
  font-size: 12px;
  border: 1px solid #dacdf216;
  border-radius: 13px;
}
.login-passkey small {
  font-size: 9px;
  margin-left: auto;
  color: #b2a7c0;
}
.login-passkey {
  padding-inline: 14px;
}
.auth-method-enter-active,
.auth-method-leave-active {
  transition:
    opacity 180ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.auth-method-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.auth-method-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.login-helper {
  font-size: 11px;
  line-height: 1.8;
  color: #9792a1;
  margin-top: 4px;
}
.login-footnote {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  color: #aaa2b6;
  font-size: 11px;
  line-height: 1.6;
}
.login-home {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #c1b9d0;
  padding: 12px 0;
  transition:
    color 220ms ease,
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.login-home:hover {
  color: #e3c991;
  transform: translateX(2px);
}
.login-alternatives {
  margin-top: 8px;
}
.login-or {
  display: block;
  text-align: center;
  font-size: 10px;
  color: #898292;
  margin-bottom: 10px;
}
.login-providers {
  display: flex;
  gap: 10px;
}
.login-providers button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px;
  border: 1px solid #dacdf221;
  border-radius: 13px;
  color: #cac4d5;
  background: #d5c4ed04;
  font-size: 12px;
  transition:
    border-color 250ms ease,
    background 250ms ease,
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
}
.login-providers button:hover:not(:disabled) {
  border-color: #dacdf244;
  background: #d5c4ed0a;
  transform: translateY(-1px);
}
.login-checking {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 130px;
  color: #aba5b8;
  font-size: 12px;
}
.login-spinner {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 1px solid #d8b97725;
  border-top-color: #d8b977;
  border-radius: 50%;
  animation: auth-spin 900ms linear infinite;
}
.login-error,
.login-unavailable {
  padding: 14px 16px;
  border-radius: 14px;
  background: #e5a8b00a;
  color: #e5b4bb;
  font-size: 12px;
  line-height: 1.7;
  margin-bottom: 20px;
}
.login-recipient {
  font-size: 13px;
  line-height: 1.8;
  color: #bbb3ca;
  overflow-wrap: anywhere;
}
.login-recipient strong {
  display: block;
  font-weight: 500;
  color: #e8d4ac;
}
.login-sent > .login-helper {
  margin: 12px 0 24px;
}
.login-code {
  width: 100%;
  min-height: 56px;
  border: 1px solid #dacdf22d;
  border-radius: 15px;
  background: #080b1044;
  color: #ece8f4;
  letter-spacing: 0.42em;
  padding-left: 0.42em;
  text-align: center;
  font-size: 22px;
  outline: none;
  transition:
    border-color 240ms ease,
    box-shadow 320ms ease;
}
.login-code:focus-visible {
  border-color: #c8b0ee65;
  box-shadow: 0 0 0 3px #c8b0ee0b;
}
.login-state {
  overflow: clip;
  overflow-clip-margin: 4px;
  transition: height 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.login-change {
  display: block;
  margin: 20px auto 0;
  padding: 10px;
  color: #b8a7d6;
  font-size: 11px;
  transition: color 220ms ease;
}
.login-change:hover {
  color: #ddcff4;
}
.login-password-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.auth-state-enter-active,
.auth-state-leave-active {
  transition:
    opacity 220ms ease,
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.auth-state-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.auth-state-leave-to {
  opacity: 0;
  transform: translateY(-7px);
}
.auth-alert-enter-active,
.auth-alert-leave-active {
  transition:
    opacity 240ms ease,
    transform 320ms ease;
}
.auth-alert-enter-from,
.auth-alert-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@keyframes auth-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes auth-arrive {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 480px) {
  .login-panel {
    border-radius: 25px;
  }
  .login-home {
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
