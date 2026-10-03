<script setup lang="ts">
useSeoMeta({ title: 'Officer sign-in | Matrix Fellows', robots: 'noindex, nofollow' })
const email = ref('')
const token = ref('')
const sent = ref(false)
const busy = ref(false)
const error = ref('')
const configured = ref(true)
const checking = ref(true)
function resetEmail() {
  sent.value = false
  token.value = ''
}
const route = useRoute()
async function login(provider: 'google' | 'azure' | 'email') {
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
      'Sign-in could not be started. Please try again.'
  } finally {
    busy.value = false
  }
}
async function verify() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/workspace/auth/callback', {
      method: 'POST',
      body: { email: email.value.trim(), token: token.value },
    })
    await navigateTo('/workspace')
  } catch (cause: any) {
    error.value =
      cause?.data?.message ||
      cause?.data?.statusMessage ||
      'The code could not be verified. Check your email and try again.'
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  try {
    const session = await $fetch<{ configured: boolean; authenticated: boolean }>(
      '/api/workspace/auth/session',
    )
    configured.value = session.configured
    if (session.authenticated) await navigateTo('/workspace')
    if (route.query.error)
      error.value =
        'Sign-in did not complete. Your account must be approved for the officer workspace.'
  } catch {
    error.value = 'Unable to check sign-in availability. Please refresh and try again.'
  } finally {
    checking.value = false
  }
})
</script>

<template>
  <WorkspaceShell
    title="Thoughtful connections. Shared possibilities."
    subtitle="A private workspace for approved adult officers to turn well-researched leads into meaningful partnerships."
  >
    <template #header
      ><NuxtLink to="/" class="ws-button"
        >Back to the society<SiteIcon name="arrow" :size="14" /></NuxtLink
    ></template>
    <div class="login-layout">
      <section class="login-context">
        <div class="connection-orbit" aria-hidden="true">
          <span /><span /><span /><SiteIcon name="atom" :size="52" />
        </div>
        <h2>Less cold outreach.<br /><em>More common ground.</em></h2>
        <p class="ws-muted">
          Find the right labs and researchers, understand what matters to them, and offer something
          useful. Evidence and human judgment stay at the center.
        </p>
        <ul>
          <li>
            <SiteIcon name="compass" :size="16" /><span>Research-backed candidate dossiers</span>
          </li>
          <li>
            <SiteIcon name="spark" :size="16" /><span>Proposals tailored to real capabilities</span>
          </li>
          <li>
            <SiteIcon name="mail" :size="16" /><span>Individual approval for every email</span>
          </li>
        </ul>
      </section>
      <section class="ws-panel login-panel">
        <p class="ws-kicker">Officer access</p>
        <h2>Welcome to the studio.</h2>
        <p class="ws-muted">
          Use the email associated with your approved officer account. Public registration is not
          available.
        </p>
        <div v-if="error" role="alert" class="ws-alert ws-error">{{ error }}</div>
        <div v-if="checking" class="ws-muted checking" role="status">Checking secure access…</div>
        <div v-else-if="!configured" class="ws-alert">
          Workspace authentication has not been configured yet. Contact the society administrator.
        </div>
        <template v-else
          ><div class="provider-buttons">
            <button class="ws-button" :disabled="busy" @click="login('google')">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.4 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.3a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 2.9-4.3 2.9-7.5ZM12 22c2.7 0 4.9-.9 6.5-2.3L15.3 17c-.9.6-2 .9-3.3.9-2.6 0-4.8-1.7-5.6-4H3.1v2.6A10 10 0 0 0 12 22ZM6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14ZM12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10c.8-2.3 3-3.9 5.6-3.9Z"
                /></svg
              >Continue with Google</button
            ><button class="ws-button" :disabled="busy" @click="login('azure')">
              <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0 0h9v9H0zm11 0h9v9h-9zM0 11h9v9H0zm11 0h9v9h-9z" /></svg
              >Continue with Microsoft
            </button>
          </div>
          <div class="login-divider"><span>or use your email</span></div>
          <Transition name="ws-content" mode="out-in"
            ><form v-if="!sent" key="email" @submit.prevent="login('email')">
              <label class="ws-field"
                >Officer email<input
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="you@example.org"
                  :disabled="busy" /></label
              ><button class="ws-button ws-button--primary login-submit" :disabled="busy">
                {{ busy ? 'Preparing your sign-in…' : 'Email me a secure sign-in link'
                }}<SiteIcon name="right" :size="15" />
              </button>
            </form>
            <div v-else key="sent">
              <div class="ws-alert ws-success" role="status">
                Check {{ email }} for your sign-in email. Use the secure link, or enter its code if
                provided.
              </div>
              <form @submit.prevent="verify">
                <label class="ws-field"
                  >Email verification code<input
                    v-model="token"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxlength="6"
                    required
                    class="otp"
                    placeholder="000000" /></label
                ><button
                  class="ws-button ws-button--primary login-submit"
                  :disabled="busy || token.length !== 6"
                >
                  Verify code
                </button>
              </form>
              <button class="ws-button change-email" :disabled="busy" @click="resetEmail">
                Use another email
              </button>
            </div></Transition
          >
          <p class="login-note">
            <SiteIcon name="lock" :size="13" />Sign-in does not grant email sending access. Connect
            your mailbox separately inside the studio.
          </p></template
        >
      </section>
    </div>
  </WorkspaceShell>
</template>

<style scoped>
.login-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
  gap: clamp(40px, 8vw, 120px);
  align-items: center;
  max-width: 1050px;
  margin: 30px auto;
}
.login-context {
  max-width: 440px;
}
.login-context h2 {
  font-size: 32px;
  line-height: 1.4;
}
.login-context em {
  font-weight: 400;
  color: #cab5e7;
}
.login-context ul {
  display: grid;
  gap: 18px;
  font-size: 12px;
  color: #b8afc8;
  margin-top: 30px;
}
.login-context li {
  display: flex;
  gap: 12px;
  align-items: center;
}
.login-context li svg {
  color: #d4ba80;
}
.connection-orbit {
  width: 140px;
  height: 140px;
  position: relative;
  display: grid;
  place-items: center;
  color: #b7a3d7;
  margin-bottom: 32px;
}
.connection-orbit span {
  position: absolute;
  inset: 10px;
  border: 1px solid #c9b6e728;
  border-radius: 50%;
  transform: rotate(-35deg) scaleY(0.45);
}
.connection-orbit span:nth-child(2) {
  transform: rotate(30deg) scaleY(0.45);
}
.connection-orbit span:nth-child(3) {
  transform: rotate(95deg) scaleY(0.45);
  border-color: #d2b87635;
}
.connection-orbit::after {
  content: '';
  width: 7px;
  height: 7px;
  background: #d2b876;
  border-radius: 50%;
  box-shadow: 0 0 24px #d2b87677;
  position: absolute;
  left: 15px;
  top: 64px;
  animation: orbit-breathe 5s ease-in-out infinite;
}
.login-panel {
  padding: 36px !important;
}
.provider-buttons {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}
.provider-buttons button {
  justify-content: flex-start;
}
.login-divider {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #898190;
  font-size: 10px;
  margin: 26px 0;
}
.login-divider::before,
.login-divider::after {
  content: '';
  height: 1px;
  background: #d0c4e115;
  flex: 1;
}
.login-submit {
  width: 100%;
}
.login-note {
  display: flex;
  gap: 9px;
  font-size: 10px;
  color: #958a9f;
  line-height: 1.8;
  margin-top: 25px;
}
.login-note svg {
  flex-shrink: 0;
  margin-top: 3px;
}
.otp {
  letter-spacing: 0.6em;
  text-align: center;
  font-size: 24px !important;
}
.change-email {
  margin-top: 15px;
}
.checking {
  margin-top: 24px;
}
.login-panel > .ws-alert {
  margin-top: 20px;
}
@keyframes orbit-breathe {
  50% {
    box-shadow: 0 0 30px #d2b876aa;
    opacity: 0.6;
  }
}
@media (max-width: 760px) {
  .login-layout {
    grid-template-columns: 1fr;
    margin-top: 12px;
    gap: 30px;
  }
  .login-context {
    display: none;
  }
  .login-panel {
    padding: 26px !important;
    max-width: 480px;
    width: 100%;
    margin: auto;
  }
}
</style>
