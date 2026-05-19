'use client';

/**
 * Planned vs Actual — quarterly grouped bar chart. "Planned" is the goal weight
 * (committed allocation) that *should* have been progressed by that quarter;
 * "Actual" is the weighted achievement %. Scoping is the caller's job.
 */

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

type Row = { quarter: Quarter; planned: number; actual: number };

export default function PlannedVsActualBar({ goals, updates, title, subtitle }: Props) {
  const data = useMemo<Row[]>(() => {
    // Cumulative planned progress: linear ramp 25/50/75/100 of total goal weight.
    // This represents the *expected* cumulative achievement by each quarter.
    const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
    const planRamp = totalWeight > 0 ? [25, 50, 75, 100] : [0, 0, 0, 0];

    return QUARTERS.map((q, idx) => {
      let weightedSum = 0;
      let weightWithData = 0;

      goals.forEach((g) => {
        const update = updates.find((u) => u.goalId === g.id && u.quarter === q);
        if (update) {
          const score = calculateProgressScore({
            uomType: g.uomType,
            target: g.target,
            actual: update.actualAchievement ?? 0,
            targetDate: g.targetDate,
            completionDate: update.completionDate,
          });
          weightedSum += score * 100 * g.weightage;
          weightWithData += g.weightage;
        }
      });

      const actual = weightWithData > 0 ? Math.round(weightedSum / weightWithData) : 0;
      return { quarter: q, planned: planRamp[idx], actual };
    });
  }, [goals, updates]);

  const hasAny = data.some((d) => d.actual > 0 || d.planned > 0);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="app-section-header">
        <div className="title">
          <h2>{title || 'Planned vs Actual'}</h2>
          <p>{subtitle || 'Expected cumulative progress vs weighted achievement per quarter'}</p>
        </div>
      </div>
      <div style={{ padding: '12px 16px 16px 16px' }}>
        {!hasAny ? (
          <div style={{ minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No goal data in this scope yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="quarter"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                cursor={{ fill: 'var(--bg-surface-hover)' }}
                contentStyle={{
                  background: 'var(--bg-surface-solid)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                formatter={(value, key) => [`${value}%`, key === 'planned' ? 'Planned' : 'Actual']}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                iconType="circle"
                formatter={(value) => value === 'planned' ? 'Planned' : 'Actual'}
              />
              <Bar dataKey="planned" fill="var(--text-tertiary)" radius={[4, 4, 0, 0]} maxBarSize={42} />
              <Bar dataKey="actual" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
