import { NextResponse } from 'next/server';
import { getDeploymentReadiness } from '@/server/config/env';

export function GET() {
  return NextResponse.json({
    ok: true,
    provider: 'Microsoft Entra ID',
    callbackUrl: '/api/auth/callback/microsoft-entra-id',
    readiness: getDeploymentReadiness(),
    requiredPermissions: [
      'User.Read for signed-in user profile',
      'User.Read.All for org user sync',
      'Directory.Read.All or GroupMember.Read.All for group and hierarchy resolution',
    ],
  });
}
