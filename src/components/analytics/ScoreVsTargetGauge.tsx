'use client';

/**
 * Score vs Target Gauge — Semi-circular gauge showing average weighted
 * achievement for the scoped set of goals/updates against the 100% target.
 * Scoping is the caller's responsibility (employee / manager / admin).
 */

import { useMemo } from 'react';
import { useDataStore } from '@/stores/data-store';
import { calculateProgressScore } from '@/lib/calculations';
import { type Quarter } from '@/lib/constants';
import type { Goal, QuarterlyUpdate } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

interface Props {
  goals: Goal[];
  updates: QuarterlyUpdate[];
  /** Override target threshold (default 100). */
  target?: number;
  title?: string;
  subtitle?: string;
}

export default function ScoreVsTargetGauge({ goals, updates, target = 100, title, subtitle }: Props) {
  // Need data store reference so we re-render when it mutates upstream (harmless if unused).
  useDataStore((s) => s.thrustAreas.length);

  const { achievement, latestQ, goalsWithData } = useMemo(() => {
    const latest: Quarter =
      [...QUARTERS].reverse().find((q) => updates.some((u) => u.quarter === q)) || 'Q1';

    let weightedScoreSum = 0;
    let weightWithData = 0;
    let counted = 0;

    goals.forEach((g) => {
      const update = updates.find((u) => u.goalId === g.id && u.quarter === latest);
      if (update) {
        const score = calculateProgressScore({
          uomType: g.uomType,
          target: g.target,
          actual: update.actualAchievement ?? 0,
          targetDate: g.targetDate,
          completionDate: update.completionDate,
        });
        weightedScoreSum += score * 100 * g.weightage;
        weightWithData += g.weightage;
        counted += 1;
      }
    });

    const value = weightWithData > 0 ? Math.round(weightedScoreSum / weightWithData) : 0;
    return { achievement: value, latestQ: latest, goalsWithData: counted };
  }, [goals, updates]);

  // Gauge geometry
  const size = 220;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = Math.PI; // 180°
  const endAngle = 2 * Math.PI; // 360°

  const polar = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const arcPath = (from: number, to: number) => {
    const start = polar(from);
    const end = polar(to);
    const largeArc = to - from > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const clampedPct = Math.max(0, Math.min(1.2, achievement / target));
  // Cap visible needle at 100% even if overshoot (>1).
  const visiblePct = Math.min(1, clampedPct);
  const valueAngle = startAngle + (endAngle - startAngle) * visiblePct;

  const color =
    achievement >= 90 ? 'var(--success)' :
    achievement >= 70 ? '#10b981' :
    achievement >= 50 ? 'var(--warning)' :
    'var(--danger)';

  const status =
    achievement >= 90 ? 'On track' :
    achievement >= 70 ? 'Healthy' :
    achievement >= 50 ? 'Needs attention' :
    'At risk';

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="app-section-header">
        <div className="title">
          <h2>{title || 'Score vs Target'}</h2>
          <p>{subtitle || `Weighted achievement for ${latestQ} against ${target}% target`}</p>
        </div>
      </div>
      <div style={{ padding: '12px 16px 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {goalsWithData === 0 ? (
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No quarterly updates yet in this scope.</p>
          </div>
        ) : (
          <>
            <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
              {/* Track */}
              <path
                d={arcPath(startAngle, endAngle)}
                stroke="var(--bg-muted)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
              />
              {/* Value arc */}
              <path
                d={arcPath(startAngle, valueAngle)}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                style={{ transition: 'all 600ms ease-out' }}
              />
              {/* Center label */}
              <text
                x={cx}
                y={cy - 6}
                textAnchor="middle"
                fontSize={36}
                fontWeight={800}
                fill="var(--text-primary)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {achievement}%
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--text-tertiary)"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                of {target}% target
              </text>
            </svg>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
              fontSize: '12px',
              fontWeight: 700,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              {status}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
              Based on {goalsWithData} goal{goalsWithData === 1 ? '' : 's'} with {latestQ} updates
            </p>
          </>
        )}
      </div>
    </div>
  );
}
