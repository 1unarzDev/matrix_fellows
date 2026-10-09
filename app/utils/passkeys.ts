// WebAuthn wire conversion only. Supabase verifies signatures, origins, challenges,
// user verification and credential ownership; the browser never receives a JWT.
export const passkeySupported = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  !!window.PublicKeyCredential &&
  !!navigator.credentials
export function fromBase64URL(value: string): ArrayBuffer {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
    c.charCodeAt(0),
  ).buffer
}
export function toBase64URL(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}
export function serializeCredential(credential: PublicKeyCredential) {
  const response = credential.response
  const common = {
    id: credential.id,
    rawId: toBase64URL(credential.rawId),
    type: 'public-key',
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
  }
  if ('attestationObject' in response) {
    const attestation = response as AuthenticatorAttestationResponse
    return {
      ...common,
      response: {
        clientDataJSON: toBase64URL(response.clientDataJSON),
        attestationObject: toBase64URL(attestation.attestationObject),
        transports: attestation.getTransports?.() || [],
      },
    }
  }
  const assertion = response as AuthenticatorAssertionResponse
  return {
    ...common,
    response: {
      clientDataJSON: toBase64URL(response.clientDataJSON),
      authenticatorData: toBase64URL(assertion.authenticatorData),
      signature: toBase64URL(assertion.signature),
      userHandle: assertion.userHandle ? toBase64URL(assertion.userHandle) : null,
    },
  }
}
export async function usePasskey(registration = false, signal?: AbortSignal) {
  if (!passkeySupported())
    throw new Error('This browser cannot use passkeys. Use email or password instead.')
  const { options } = await $fetch<{ options: any }>('/api/workspace/auth/passkey', {
    method: 'POST',
    signal,
    body: { action: registration ? 'register-options' : 'signin-options' },
  })
  const publicKey = { ...options, challenge: fromBase64URL(options.challenge) }
  if (registration) {
    publicKey.user = { ...options.user, id: fromBase64URL(options.user.id) }
    publicKey.excludeCredentials = options.excludeCredentials?.map((item: any) => ({
      ...item,
      id: fromBase64URL(item.id),
    }))
    // Require a discoverable, verified credential for username-free sign-in.
    publicKey.authenticatorSelection = {
      ...options.authenticatorSelection,
      residentKey: 'required',
      userVerification: 'required',
    }
  } else {
    publicKey.allowCredentials = options.allowCredentials?.map((item: any) => ({
      ...item,
      id: fromBase64URL(item.id),
    }))
    publicKey.userVerification = 'required'
  }
  const credential = (await (registration
    ? navigator.credentials.create({ publicKey, signal })
    : navigator.credentials.get({ publicKey, signal }))) as PublicKeyCredential | null
  if (!credential) throw new Error('No passkey selected. Try again or use another sign-in method.')
  await $fetch('/api/workspace/auth/passkey', {
    method: 'POST',
    signal,
    body: {
      action: registration ? 'register-verify' : 'signin-verify',
      credential: serializeCredential(credential),
    },
  })
}
export function accountError(cause: any) {
  if (cause?.name === 'NotAllowedError' || cause?.name === 'AbortError')
    return 'Passkey request canceled or timed out. You can try again or use another sign-in method.'
  if (cause?.name === 'InvalidStateError')
    return 'This device already has a passkey for this account.'
  return (
    cause?.data?.statusMessage ||
    cause?.data?.message ||
    cause?.message ||
    'Account services are unavailable. Please try again.'
  )
}
