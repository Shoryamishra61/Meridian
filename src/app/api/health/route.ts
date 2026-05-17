import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'meridian-goal-portal',
    runtime: 'nextjs-serverless',
    checkedAt: new Date().toISOString(),
  });
}
