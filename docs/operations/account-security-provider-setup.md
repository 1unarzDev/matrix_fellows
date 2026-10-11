# Account security provider setup

The Settings page now keeps account security in one server-authorized flow. The browser can
request an email sign-in link, start Google or Microsoft sign-in, use an existing passkey, or add
a passkey after a recent verification. The server still decides whether a session is recent enough
to change a password or credential. No provider token is exposed to the browser or transferred to
another officer.

## Configure Supabase Auth

1. In Supabase Auth, set the site URL to `https://matrixfellows.com` and allow the application
   callback `https://matrixfellows.com/api/workspace/auth/callback`.
2. Enable email OTP or magic-link sign-in and use an SMTP provider suitable for production. Keep
   email confirmation enabled; the dashboard requires a confirmed email and an enrolled member.
3. Enable Google and Microsoft (Azure) as external providers. The provider redirect registered in
   each provider console is Supabase's callback, usually
   `https://<project-ref>.supabase.co/auth/v1/callback`; the final redirect allowlist remains the
   Matrix Fellows callback above. Request identity scopes only: OpenID, email, and profile.
4. Enable passkeys/WebAuthn in the Supabase Auth settings used by this project. The application
   calls the `/auth/v1/passkeys/*` endpoints and requires a secure origin, user verification, and
   a discoverable credential. Use `https://matrixfellows.com` as the relying-party origin; test
   `localhost` separately during local development.

The email action in Settings is a fresh sign-in link, not a password reset. It returns through the
same PKCE callback and creates a new recent dashboard session. Password changes then invalidate the
dashboard session and require a new sign-in.

## Google identity application

Create a Web application OAuth client in Google Cloud Console. Add Supabase's Auth callback as the
authorized redirect URI, configure the consent screen for the Matrix Fellows organization, and
enable the identity scopes `openid`, `email`, and `profile`. Put the client ID and secret into the
existing server-only variables; never put them in `NUXT_PUBLIC_*` variables:

```text
NUXT_GOOGLE_OAUTH_CLIENT_ID
NUXT_GOOGLE_OAUTH_CLIENT_SECRET
```

Google sign-in does not grant Gmail mailbox access. Gmail sending is a separate officer action and
uses the mailbox callback below with the narrow Gmail send scope.

## Microsoft identity application

Register a Web application in Microsoft Entra ID. Choose the account types that Matrix Fellows
intends to support, add Supabase's Auth callback as the web redirect URI, and grant only delegated
identity permissions (`openid`, `profile`, `email`). Configure the existing server-only variables:

```text
NUXT_MICROSOFT_OAUTH_CLIENT_ID
NUXT_MICROSOFT_OAUTH_CLIENT_SECRET
NUXT_MICROSOFT_OAUTH_TENANT=common
```

Microsoft sign-in does not grant Outlook sending access. If Outlook sending is enabled, register
the same or a separate application for the mailbox callback
`https://matrixfellows.com/api/workspace/mailboxes/callback` and grant delegated `Mail.Send` only.
Do not grant `Mail.Read` or general inbox access for this workflow.

## Server and Worker configuration

Keep the existing server configuration in the deployment secret/configuration store:

```text
NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_ANON_KEY
NUXT_PUBLIC_SITE_URL=https://matrixfellows.com
NUXT_SUPABASE_SERVICE_ROLE_KEY
NUXT_WORKSPACE_SESSION_SECRET
NUXT_WORKSPACE_MAILBOX_ENCRYPTION_KEY
```

Mailbox OAuth additionally requires the Google or Microsoft client variables above. The mailbox
encryption key and session secret must each be at least 32 characters. Do not print or commit their
values. Preserve dashboard variables when deploying with `wrangler deploy --keep-vars`.

## Verification order

Use a harmless test account first. Verify the following independently:

1. Email link, Google, Microsoft, and passkey verification each return to the dashboard and make
   the Settings status read **Verified**.
2. Password fields use a recent verified session and a password change returns to sign-in.
3. A new passkey can be added only after verification, and removing one does not remove email
   recovery.
4. Gmail and Outlook mailbox connections are tested separately. Confirm that only send permission
   is requested, that disconnect removes the stored authorization, and that exact-message approval
   is still required before any send.

The application callback and mailbox callback are different capabilities. A successful identity
login does not prove mailbox consent, provider acceptance, or delivery.
