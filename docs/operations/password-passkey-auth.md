# Password and passkey authentication

Implemented October 9, 2026. Existing email-link, Google and Microsoft sign-in remain intact. Account authentication does not grant mailbox access or officer privileges.

## Member flows

- `/login`: choose Password to sign in, create a confirmed account, or request a reset link. New passwords require 12–128 characters; existing shorter passwords can still sign in.
- Confirmation and reset links use PKCE. Open them in the browser that requested the email. Another browser, an expired link, or a missing flow cookie produces a recoverable error.
- A recovery callback creates only a ten-minute password-reset session, never a new dashboard session. Resetting returns to password sign-in.
- `/dashboard?section=settings`: set/change a password; register, rename, or remove a passkey. Credential changes require sign-in within five minutes. Refreshing tokens does not extend that authority. Existing pre-upgrade sessions must sign in again.
- Register a passkey while signed in, then use **Use a passkey** on `/login`. Email remains an independent recovery option. Passkeys do not create accounts.

## Security boundaries

Supabase owns passwords, passkey public keys, single-use challenges, signature verification, RP/origin checks, user verification, and credential ownership. The application never stores password hashes or implements WebAuthn cryptography. User access/refresh tokens remain in encrypted HttpOnly cookies scoped to `/api/workspace`, with Secure on HTTPS and SameSite=Lax. No user tokens are placed in localStorage or sent to browser JavaScript.

The hosted options currently advertise preferred user verification. The application requests required verification in its browser ceremonies and rejects assertions without the signed authenticator-data UV flag before provider signature verification. A direct caller cannot weaken the application's device-verification requirement.

Every mutation checks the canonical request Origin. Provider identity and enabled, confirmed membership are checked before granting a session or changing credentials. No caller-supplied role or user ID grants authority. Sealed short-lived passkey flow cookies bind the provider challenge, ceremony type and registering account. Provider challenges provide durable single-use enforcement, including copied cookie replay. Pending native prompts are canceled on route/component teardown.

Password updates clear local sessions and request global provider sign-out. Already issued access JWTs retain their provider expiry; this is not a promise of immediate universal revocation. Other dashboard sessions fail at refresh after revocation. Recovery uses a separate purpose-bound cookie, and cannot be submitted through the ordinary email-code callback.

Supabase supplies the authentication rate limits. The app avoids extra automatic password retries, does not disclose raw provider diagnostics, and disables duplicate UI submission. Edge abuse protection can be tightened independently; do not claim UI disabling prevents direct API abuse.

## Configuration

No new application secret is required. Existing server settings are reused:

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `NUXT_SUPABASE_SERVICE_ROLE_KEY`
- `NUXT_WORKSPACE_SESSION_SECRET` (at least 32 characters)
- `NUXT_PUBLIC_SITE_URL` (canonical origin)

Production callback: `https://matrixfellows.com/api/workspace/auth/callback`. Keep it in Supabase's allowed redirect URLs. Confirmed email remains required. Existing premium signup/recovery email templates use this requested redirect through Supabase's ConfirmationURL.

The native Supabase passkey API is **experimental**. The wire contract was checked against current documentation and the installed `@supabase/auth-js` source (supabase-js 2.115.0). Treat changes to that contract as an authentication release requiring contract and ceremony tests.

Project: `xlnjzzbsxzadrvbrggau`. The bounded configuration script preserves OAuth, SMTP, templates, user roles and other settings:

```sh
node scripts/configure-account-auth.mjs
node scripts/configure-account-auth.mjs --apply
```

Supply a scoped `SUPABASE_ACCESS_TOKEN` through secret settings. An existing authorized CLI keyring can instead be used with `SUPABASE_KEYRING_MODULE`. Neither credential is printed or committed. Apply makes a private `/tmp/matrix-account-auth-backup.*` backup and verifies readback plus unrelated-setting preservation.

Production RP ID is **matrixfellows.com**, origin **https://matrixfellows.com**, display name **Matrix Fellows**. Do not change the RP ID after enrollment: existing passkeys would stop working. The local Supabase config deliberately uses a separate `localhost` RP and `http://localhost:3000` origin. Do not use the hosted production project for localhost ceremonies.

## Verification and remaining live checks

```sh
npx vitest run tests/unit/workspace-auth.test.ts tests/unit/workspace-credentials.test.ts
npx playwright test tests/e2e/login-interface.spec.ts tests/e2e/account-security.spec.ts --workers=2
npm run typecheck
npm run build
```

Browser tests use synthetic data and fixture transport. Chromium virtual authenticators perform actual native credential creation/assertion, but those fixtures are **not** live Supabase cryptographic verification. Tests cover confirmation, isolated recovery, stale sign-in authority, expiry, cross-account/type challenge substitution, origin rejection, weak passwords, duplicate submission, editing, registration/rename/removal, provider disconnection, narrow screens and reduced motion.

After the application is released, use an explicitly authorized test account to exercise a real confirmation email, password sign-in, reset email, passkey enrollment and sign-in on the production origin, rename/delete, sign-out, and recovery. No unsolicited emails or accounts are created by the implementation tests. Physical Safari, Android password-manager interoperability and provider end-to-end account ceremonies remain distinct checks, not inferred passes from Chromium emulation.

References: [password auth](https://supabase.com/docs/guides/auth/passwords), [native passkeys](https://supabase.com/docs/guides/auth/passkeys), [project passkey settings](https://supabase.com/dashboard/project/xlnjzzbsxzadrvbrggau/auth/passkeys).

## October 9 verification checkpoint

- Tested repository: base `828f748` plus the existing dirty working tree and this bounded auth addition. Unrelated catalog/dashboard changes were preserved. No website deployment was performed.
- `npm test`: **334 tests / 52 files passed**. Auth-focused tests include the recovery callback, confirmed membership, stale refresh authority, sealed flow expiry, origin checks, cross-user/type substitution and required signed device verification.
- `npm run typecheck` and `npm run build`: passed.
- **24 browser checks passed** against the compiled Cloudflare Worker, with fixture provider transport and real Chromium virtual-authenticator ceremonies. Desktop 1440×960 and iPhone-sized 390×664 Chromium emulation; reduced motion and a 360px narrow layout included. These are not physical Safari/Android passes.
- Production-preview commands (no deployment): `npx wrangler dev --port 3101 --host localhost --local-upstream localhost`, then `TEST_BASE_URL=http://localhost:3101 npx playwright test tests/e2e/login-interface.spec.ts tests/e2e/account-security.spec.ts --workers=2`. Explicit localhost forwarding is necessary: default custom-domain forwarding triggered a local canonical-redirect loop, not an auth-flow failure. An earlier dev-server run overlapped hot edits; affected checks were repeated without hot edits and on the compiled build.
- Inspected captures: `/tmp/matrix-password-login-desktop.png`, `/tmp/matrix-password-login-mobile.png`, `/tmp/matrix-password-reset-mobile.png`, `/tmp/matrix-account-auth-desktop.png`, `/tmp/matrix-account-auth-mobile.png`. Account-management recordings are under `test-results/e2e/account-security-*/video.webm`. Inspection caught a transient grid-stretch/footer-overlap defect; the method bodies now retain their intrinsic height and the animated state region clips transient overflow.
- Hosted configuration applied and read back at **2026-10-09T23:31:51Z**: native passkeys enabled, stable `matrixfellows.com` RP and canonical HTTPS origin, minimum new-password length 12. All unrelated settings unchanged. Configuration-only backup: `/tmp/matrix-account-auth-backup.5P3gER/settings-before.json`.
- Live read-only/anonymous provider checks: `/auth/v1/settings` returned 200 and `passkeys_enabled: true`; `/auth/v1/passkeys/authentication/options` returned 200 with the correct RP, challenge and challenge ID. No user accounts or emails were created for these checks. Supabase MCP was unavailable; authenticated Management API was used for the bounded configuration update.
- Built password route SHA-256: `612b5b158927882f66953d9e3cd963856c0c702d41fba5c1d4d75ac18cc5ba53`; passkey route: `bda590ad94f75e940949bf193bb74bc95fe7a73c826014cd44edcb25833da0ec`.
- Commit isolation: account-security fixtures are self-contained, and the auth commit includes only the security panel integration and settings deep link in the existing dashboard. An isolated export of staged files passed type checking, its complete 236-test / 38-file suite (including 16 auth tests), all 24 desktop/mobile browser checks, and the production build without the separate dashboard/legal/catalog work. The temporary verification copy used its own Nuxt build directory to avoid shared-dependency symlink cache resolution; no build-directory override was added to the committed configuration.
- Next required release step: deploy the reviewed auth commit, then use an owner-authorized test account for real email confirmation/recovery and provider-verified passkey registration/sign-in. The separate dashboard/legal/catalog changes remain outside this commit and need their own review. No new OAuth credentials are needed for these methods.
