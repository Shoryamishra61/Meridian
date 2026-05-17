import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateGoalSheetForSubmission } from '@/server/domain/goal-policy';
import { checkInMemoryRateLimit } from '@/server/http/rate-limit';

const requestSchema = z.object({
  goals: z.array(
    z.object({
      title: z.string().min(1),
      weightage: z.number(),
    })
  ),
});

export async function POST(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'local';
  const rateLimit = checkInMemoryRateLimit(`goal-validate:${forwardedFor}`, 60, 60_000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Too many validation requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetsAt - Date.now()) / 1000)) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? 'Invalid request body.' },
      { status: 400 }
    );
  }

  const result = validateGoalSheetForSubmission(parsed.data.goals);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
