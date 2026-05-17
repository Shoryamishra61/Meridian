import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildAdaptiveCard } from '@/server/integrations/adaptive-card';
import { getApiActor } from '@/server/auth/api-session';
import { assertPermission } from '@/server/auth/authorization';
import { checkInMemoryRateLimit } from '@/server/http/rate-limit';

const requestSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  deepLink: z.string().min(1),
});

export async function POST(request: Request) {
  const actor = await getApiActor();
  if (!actor) return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });

  const permission = assertPermission(actor.role, 'admin:manage-integrations');
  if (!permission.ok) return NextResponse.json(permission, { status: permission.status });

  const rateLimit = checkInMemoryRateLimit(`teams-card:${actor.id}`, 30, 60_000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Too many Teams card requests. Try again shortly.' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid adaptive card request.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    card: buildAdaptiveCard(parsed.data),
  });
}
