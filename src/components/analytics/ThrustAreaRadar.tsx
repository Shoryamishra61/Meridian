'use client';

/**
 * Thrust Area Radar — shows weighted achievement % per strategic pillar
 * for the *scoped* set of goals & updates. Same shape for employee / manager /
 * admin; scoping is done by the caller via props so no data leaks across roles.
 */

import { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useDataStore } from '@/stores/data-store';
import { calculateProgressScore } from '@/lib/calculations';
import { type Quarter } from '@/lib/constants';
import type { Goal, QuarterlyUpdate } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

interface Props {
  goals: Goal[];
  updates: QuarterlyUpdate[];
  title?: string;
  subtitle?: string;
}

type Row = { area: string; achievement: number; weight: number };

export default function ThrustAreaRadar({ goals, updates, title, subtitle }: Props) {
  const { thrustAreas } = useDataStore();

  const data = useMemo<Row[]>(() => {
    const latestQ: Quarter =
      [...QUARTERS].reverse().find((q) => updates.some((u) => u.quarter === q)) || 'Q1';

    return thrustAreas
      .map((area) => {
        const areaGoals = goals.filter((g) => g.thrustAreaId === area.id);
        const totalWeight = areaGoals.reduce((sum, g) => sum + g.weightage, 0);
        if (totalWeight === 0) return null;

        let weightedScoreSum = 0;
        let weightWithData = 0;
        areaGoals.forEach((g) => {
          const update = updates.find((u) => u.goalId === g.id && u.quarter === latestQ);
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
          }
        });

        const achievement = weightWithData > 0 ? Math.round(weightedScoreSum / weightWithData) : 0;
        return { area: area.name, achievement, weight: totalWeight };
      })
      .filter((x): x is Row => x !== null);
  }, [goals, updates, thrustAreas]);

  if (data.length < 3) {
    return (
      <div className="card" style={{ padding: '20px', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Need at least 3 thrust areas with data for radar view.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="app-section-header">
        <div className="title">
          <h2>{title || 'Thrust Area Coverage'}</h2>
          <p>{subtitle || 'Weighted achievement % per strategic pillar'}</p>
        </div>
      </div>
      <div style={{ padding: '12px 8px 16px 8px' }}>
        {/* Generous horizontal margins prevent thrust-area labels from clipping
            against the card edge, especially long names like
            "Compliance & Risk" / "Operational Excellence". */}
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart
            data={data}
            outerRadius="72%"
            margin={{ top: 16, right: 56, bottom: 16, left: 56 }}
          >
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="area"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
              tickFormatter={(value: string) => (value.length > 22 ? `${value.slice(0, 21)}\u2026` : value)}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
              stroke="var(--border)"
            />
            <Radar
              name="Achievement"
              dataKey="achievement"
              stroke="var(--brand)"
              fill="var(--brand)"
              fillOpacity={0.35}
              strokeWidth={2}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0].payload as Row;
                return (
                  <div style={{
                    background: 'var(--bg-surface-solid)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{row.area}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Achievement: <strong style={{ color: 'var(--text-primary)' }}>{row.achievement}%</strong>
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      Weight allocated: {row.weight}%
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
