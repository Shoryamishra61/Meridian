/**
 * Meridian — Gamification Badges
 * Professional achievement badges tied to real performance metrics.
 */

'use client';

import { useMemo } from 'react';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { calculateProgressScore } from '@/lib/calculations';
import { cn } from '@/lib/utils';

interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
  color: string;
  bgColor: string;
}

export default function GamificationBadges({ userId }: { userId?: string }) {
  const user = useAuthStore((s) => s.user);
  const { goals, goalSheets, quarterlyUpdates } = useDataStore();
  const targetId = userId || user?.id;

  const badges = useMemo<Badge[]>(() => {
    if (!targetId) return [];

    const mySheets = goalSheets.filter((s) => s.employeeId === targetId);
    const myGoals = goals.filter((g) => mySheets.some((s) => s.id === g.sheetId));
    const myUpdates = quarterlyUpdates.filter((u) => myGoals.some((g) => g.id === u.goalId));

    const completedQuarters = new Set(myUpdates.filter((u) => u.actualAchievement !== null).map((u) => u.quarter)).size;

    const scores = myGoals.map((g) => {
      const upd = myUpdates.find((u) => u.goalId === g.id);
      if (!upd || upd.actualAchievement === null) return 0;
      return calculateProgressScore({ uomType: g.uomType, actual: upd.actualAchievement, target: g.target, targetDate: g.targetDate, completionDate: upd.completionDate });
    });
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const hasSharedGoal = myGoals.some((g) => g.isShared);
    const hasZeroBased = myGoals.some((g) => g.uomType === 'ZERO_BASED');
    const zeroBasedPerfect = myGoals.filter((g) => g.uomType === 'ZERO_BASED').every((g) => {
      const upd = myUpdates.find((u) => u.goalId === g.id);
      return upd && upd.actualAchievement === 0;
    });
    const allSubmitted = mySheets.some((s) => s.status !== 'DRAFT');

    return [
      {
        id: 'goal-crusher',
        icon: '🏆',
        title: 'Goal Crusher',
        description: 'Avg achievement ≥ 100%',
        earned: avgScore >= 100,
        color: 'var(--warning)',
        bgColor: 'var(--warning-bg)',
      },
      {
        id: 'streak-master',
        icon: '🔥',
        title: 'Streak Master',
        description: `${completedQuarters} quarter check-ins completed`,
        earned: completedQuarters >= 2,
        color: 'var(--danger)',
        bgColor: 'var(--danger-bg)',
      },
      {
        id: 'alignment-champion',
        icon: '🔗',
        title: 'Alignment Champion',
        description: 'Contributing to shared KPIs',
        earned: hasSharedGoal,
        color: 'var(--brand)',
        bgColor: 'var(--brand-light)',
      },
      {
        id: 'safety-hero',
        icon: '🛡️',
        title: 'Safety Hero',
        description: 'Zero-based goals at 100%',
        earned: hasZeroBased && zeroBasedPerfect,
        color: 'var(--success)',
        bgColor: 'var(--success-bg)',
      },
      {
        id: 'first-mover',
        icon: '🚀',
        title: 'First Mover',
        description: 'Goal sheet submitted on time',
        earned: allSubmitted,
        color: 'var(--brand)',
        bgColor: 'var(--brand-light)',
      },
      {
        id: 'overachiever',
        icon: '⭐',
        title: 'Overachiever',
        description: 'Achievement above 90%',
        earned: avgScore >= 90,
        color: 'var(--success)',
        bgColor: 'var(--success-bg)',
      },
    ];
  }, [targetId, goals, goalSheets, quarterlyUpdates]);

  const earnedCount = badges.filter((b) => b.earned).length;
  const progressPct = badges.length ? Math.round((earnedCount / badges.length) * 100) : 0;

  return (
    <div className="card flex flex-col justify-between h-full" style={{ padding: '24px' }}>
      <div className="flex items-start justify-between gap-3" style={{ marginBottom: '14px' }}>
        <div className="min-w-0">
          <h2 style={{ fontSize: '16px', margin: 0, lineHeight: 1.25 }}>Achievement Badges</h2>
          <p className="text-[12px] text-[var(--text-secondary)]" style={{ marginTop: '4px' }}>
            {earnedCount} of {badges.length} earned
          </p>
        </div>
        <div className="w-20 shrink-0 pt-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 shrink-0">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.description}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-[6px] border px-2 py-3.5 text-center transition-colors',
              b.earned ? 'shadow-sm' : 'border-[var(--border)] bg-[var(--bg-muted)]'
            )}
            style={b.earned ? { background: b.bgColor, borderColor: `color-mix(in srgb, ${b.color} 32%, var(--border) 68%)` } : undefined}
          >
            <span className={cn('text-[20px] leading-none', !b.earned && 'opacity-50 grayscale')}>{b.icon}</span>
            <span
              className={cn(
                'text-[11px] font-semibold leading-tight line-clamp-2',
                b.earned ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}
            >
              {b.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
