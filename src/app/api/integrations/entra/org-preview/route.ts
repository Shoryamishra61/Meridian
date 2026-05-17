import { NextResponse } from 'next/server';
import { getApiActor } from '@/server/auth/api-session';
import { assertPermission } from '@/server/auth/authorization';
import { getDeploymentReadiness } from '@/server/config/env';
import { listUsersPage } from '@/server/integrations/microsoft-graph';

export async function GET() {
  const actor = await getApiActor();
  if (!actor) return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });

  const permission = assertPermission(actor.role, 'admin:manage-integrations');
  if (!permission.ok) return NextResponse.json(permission, { status: permission.status });

  const readiness = getDeploymentReadiness();
  if (!readiness.graphReady) {
    return NextResponse.json(
      {
        ok: false,
        code: 'GRAPH_NOT_CONFIGURED',
        message: 'Set MICROSOFT_TENANT_ID, MICROSOFT_GRAPH_CLIENT_ID, and MICROSOFT_GRAPH_CLIENT_SECRET first.',
        readiness,
      },
      { status: 503 }
    );
  }

  const users = await listUsersPage(25);
  return NextResponse.json({
    ok: true,
    importedPreviewCount: users.value.length,
    users: users.value,
    hasNextPage: Boolean(users['@odata.nextLink']),
  });
}
