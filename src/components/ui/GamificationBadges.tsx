/**
 * Meridian — Gamification Badges
 * Professional achievement badges tied to real performance metrics.
 */

'use client';

import { useMemo } from 'react';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { calculateProgressScore } from '@/lib/calculations';

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

    // Check-in streak
    const completedQuarters = new Set(myUpdates.filter((u) => u.actualAchievement !== null).map((u) => u.quarter)).size;

    // Achievement scores
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
        color: '#d97706',
        bgColor: '#fffbeb',
      },
      {
        id: 'streak-master',
        icon: '🔥',
        title: 'Streak Master',
        description: `${completedQuarters} quarter check-ins completed`,
        earned: completedQuarters >= 2,
        color: '#dc2626',
        bgColor: '#fef2f2',
      },
      {
        id: 'alignment-champion',
        icon: '🔗',
        title: 'Alignment Champion',
        description: 'Contributing to shared KPIs',
        earned: hasSharedGoal,
        color: '#2563eb',
        bgColor: '#eff6ff',
      },
      {
        id: 'safety-hero',
        icon: '🛡️',
        title: 'Safety Hero',
        description: 'Zero-based goals at 100%',
        earned: hasZeroBased && zeroBasedPerfect,
        color: '#059669',
        bgColor: '#ecfdf5',
      },
      {
        id: 'first-mover',
        icon: '🚀',
        title: 'First Mover',
        description: 'Goal sheet submitted on time',
        earned: allSubmitted,
        color: '#7c3aed',
        bgColor: '#f5f3ff',
      },
      {
        id: 'overachiever',
        icon: '⭐',
        title: 'Overachiever',
        description: 'Achievement above 90%',
        earned: avgScore >= 90,
        color: '#0891b2',
        bgColor: '#ecfeff',
      },
    ];
  }, [targetId, goals, goalSheets, quarterlyUpdates]);

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>Achievement Badges</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{earnedCount}/{badges.length} earned</p>
        </div>
        {/* Progress bar */}
        <div style={{ width: '80px', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(earnedCount / badges.length) * 100}%`, background: '#2563eb', borderRadius: '3px', transition: 'width 500ms' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {badges.map((b) => (
          <div
            key={b.id}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              padding: '12px 8px', borderRadius: '10px', textAlign: 'center',
              background: b.earned ? b.bgColor : '#f8fafc',
              border: `1px solid ${b.earned ? b.color + '30' : '#e2e8f0'}`,
              opacity: b.earned ? 1 : 0.5,
              transition: 'all 200ms',
            }}
          >
            <span style={{ fontSize: '22px', filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: b.earned ? b.color : '#94a3b8', lineHeight: 1.2 }}>{b.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
