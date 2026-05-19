'use client';

/**
 * Check-in Completion Ring — per-quarter manager check-in completion (donut).
 * Scoping passed in by caller (team members + their check-ins).
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { type Quarter } from '@/lib/constants';
import type { ManagerCheckin } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

interface Props {
  /** Number of distinct employees in scope (denominator). */
  teamSize: number;
  /** Manager check-ins scoped to the same team. */
  checkins: ManagerCheckin[];
  /** Active cycle id — only check-ins matching this cycle count. */
  cycleId?: string;
  title?: string;
  subtitle?: string;
}

type Row = { quarter: Quarter; completed: number; pending: number; rate: number };

export default function CheckinCompletionRing({ teamSize, checkins, cycleId, title, subtitle }: Props) {
  const rows = useMemo<Row[]>(() => {
    const scoped = cycleId ? checkins.filter((c) => c.cycleId === cycleId) : checkins;
    return QUARTERS.map((q) => {
      // Unique employees with a check-in this quarter (avoid double counting).
      const uniqEmployees = new Set(
        scoped.filter((c) => c.quarter === q).map((c) => c.employeeId)
      );
      const completed = Math.min(uniqEmployees.size, teamSize);
      const pending = Math.max(0, teamSize - completed);
      const rate = teamSize > 0 ? Math.round((completed / teamSize) * 100) : 0;
      return { quarter: q, completed, pending, rate };
    });
  }, [teamSize, checkins, cycleId]);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="app-section-header">
        <div className="title">
          <h2>{title || 'Check-in Completion'}</h2>
          <p>{subtitle || 'Manager check-ins completed per quarter'}</p>
        </div>
      </div>
      <div style={{ padding: '12px 16px 16px 16px' }}>
        {teamSize === 0 ? (
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No team members in scope.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: '12px' }}>
            {rows.map((row) => (
              <QuarterRing key={row.quarter} row={row} teamSize={teamSize} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuarterRing({ row, teamSize }: { row: Row; teamSize: number }) {
  const color =
    row.rate >= 90 ? 'var(--success)' :
    row.rate >= 60 ? '#10b981' :
    row.rate >= 30 ? 'var(--warning)' :
    'var(--danger)';

  const data = [
    { name: 'Completed', value: row.completed, color },
    { name: 'Pending', value: row.pending, color: 'var(--bg-muted)' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 8px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      background: 'var(--bg-surface)',
    }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
        {row.quarter}
      </p>
      <div style={{ position: 'relative', width: '110px', height: '110px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={36}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface-solid)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
              formatter={(value, name) => [`${value}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: '17px', fontWeight: 650, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {row.rate}%
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {row.completed}/{teamSize}
          </span>
        </div>
      </div>
    </div>
  );
}
