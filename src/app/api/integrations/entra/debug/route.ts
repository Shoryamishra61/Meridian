import { NextResponse } from 'next/server';
import { env, getDeploymentReadiness } from '@/server/config/env';

export function GET() {
  const issuer = env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.replace(/\/$/, '') ?? null;
  const authBaseUrl = env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? null;

  return NextResponse.json({
    ok: true,
    readiness: getDeploymentReadiness(),
    issuer,
    clientIdPrefix: env.AUTH_MICROSOFT_ENTRA_ID_ID?.slice(0, 8) ?? null,
    hasClientSecret: Boolean(env.AUTH_MICROSOFT_ENTRA_ID_SECRET),
    hasAuthSecret: Boolean(env.AUTH_SECRET),
    callbackUrl: authBaseUrl ? `${authBaseUrl}/api/auth/callback/microsoft-entra-id` : null,
    signInUrl: authBaseUrl ? `${authBaseUrl}/api/auth/signin/microsoft-entra-id` : null,
    microsoftDiscoveryUrl: issuer ? `${issuer}/.well-known/openid-configuration` : null,
  });
}
