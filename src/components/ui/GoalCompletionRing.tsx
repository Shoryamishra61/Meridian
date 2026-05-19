'use client';

/**
 * Goal Completion Ring — Donut chart showing weighted achievement % of an employee's goals
 * for the latest completed/active quarter. Drives "How am I doing this quarter?" answer.
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useDemoDateStore } from '@/stores/demo-date-store';
import { calculateProgressScore } from '@/lib/calculations';
import { getCheckinQuarterForDate, type Quarter } from '@/lib/constants';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function GoalCompletionRing() {
  const user = useAuthStore((s) => s.user)!;
  const { goalSheets, goals, quarterlyUpdates, cycles } = useDataStore();
  const getCurrentDate = useDemoDateStore((s) => s.getCurrentDate);

  const data = useMemo(() => {
    const currentDate = getCurrentDate();
    const activeCycle = cycles.find((cycle) => cycle.isActive);
    if (!activeCycle) return null;

    const sheet = goalSheets.find((s) => s.employeeId === user.id && s.cycleId === activeCycle.id);
    if (!sheet) return null;

    const myGoals = goals.filter((g) => g.sheetId === sheet.id);
    if (myGoals.length === 0) return null;

    // Find the latest quarter that has any updates for this user; else current quarter
    const checkinQuarter = getCheckinQuarterForDate(currentDate);
    const latestQ: Quarter = (() => {
      for (const q of [...QUARTERS].reverse()) {
        if (quarterlyUpdates.some((u) => u.quarter === q && myGoals.some((g) => g.id === u.goalId))) {
          return q;
        }
      }
      return checkinQuarter || 'Q1';
    })();

    // Compute weighted achievement
    let weightedScore = 0;
    let totalWeight = 0;
    let goalsWithData = 0;
    myGoals.forEach((g) => {
      const update = quarterlyUpdates.find((u) => u.goalId === g.id && u.quarter === latestQ);
      if (update != null) {
        const score = calculateProgressScore({
          uomType: g.uomType,
          target: g.target,
          actual: update.actualAchievement ?? 0,
          targetDate: g.targetDate,
          completionDate: update.completionDate,
        });
        weightedScore += score * g.weightage;
        goalsWithData += 1;
      }
      totalWeight += g.weightage;
    });

    const percentage = totalWeight > 0 ? Math.min(100, Math.round(weightedScore)) : 0;

    return {
      percentage,
      quarter: latestQ,
      goalsWithData,
      totalGoals: myGoals.length,
    };
  }, [user.id, goalSheets, goals, quarterlyUpdates, cycles, getCurrentDate]);

  if (!data) {
    return (
      <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No goal data yet</p>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>Submit your goal sheet to see progress.</p>
        </div>
      </div>
    );
  }

  const ringColor =
    data.percentage >= 80 ? 'var(--success)' :
    data.percentage >= 50 ? 'var(--brand)' :
    data.percentage >= 25 ? 'var(--warning)' :
    'var(--danger)';

  const tone =
    data.percentage >= 80 ? 'Excellent' :
    data.percentage >= 50 ? 'On track' :
    data.percentage >= 25 ? 'Needs focus' :
    'At risk';

  const chartData = [
    { name: 'Achieved', value: data.percentage },
    { name: 'Remaining', value: Math.max(0, 100 - data.percentage) },
  ];

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <p className="label-sm" style={{ fontSize: '11px', margin: 0 }}>Goal Completion</p>
          <h2 style={{ fontSize: '15px', margin: '4px 0 0 0' }}>{data.quarter} Achievement</h2>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: '999px',
          background: `color-mix(in srgb, ${ringColor} 18%, transparent)`,
          color: ringColor, fontSize: '11px', fontWeight: 700,
        }}>{tone}</span>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              startAngle={90}
              endAngle={-270}
              paddingAngle={0}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={ringColor} />
              <Cell fill="var(--bg-wash)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <p style={{
            fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1,
          }}>{data.percentage}%</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0', fontWeight: 600 }}>
            of weighted target
          </p>
        </div>
      </div>

      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {data.goalsWithData} of {data.totalGoals} goals updated
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
          Weighted score
        </span>
      </div>
    </div>
  );
}
