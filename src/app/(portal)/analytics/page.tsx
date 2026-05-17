/**
 * Meridian — Analytics Dashboard (8 Panels per BRD §5.4)
 * Each panel has: title, purpose subtitle, visualization, insight card.
 * Panels 1-4 inline, Panels 5-8 from components/analytics/panels.
 */
'use client';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS, type Quarter } from '@/lib/constants';
import { Panel, InsightCard, ChartTip } from '@/components/analytics/shared';
import { AtRiskRadar, ManagerLeaderboard, UomAchievement, EmployeePulse } from '@/components/analytics/panels';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const C = { brand: '#2563eb', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', muted: '#94a3b8' };
const PIE_COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

export default function AnalyticsPage() {
  const { goals, goalSheets, quarterlyUpdates, thrustAreas, managerCheckins } = useDataStore();

  /* ── Data computations ── */
  const qoqData = useMemo(() => QUARTERS.map((q) => {
    const updates = quarterlyUpdates.filter((u) => u.quarter === q);
    const scores = updates.map((u) => u.computedScore).filter((s): s is number => s != null);
    return { quarter: q, achievement: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0, checkins: managerCheckins.filter((c) => c.quarter === q).length };
  }), [quarterlyUpdates, managerCheckins]);

  const distData = useMemo(() => {
    const m: Record<string, number> = {};
    goals.forEach((g) => { const t = thrustAreas.find((a) => a.id === g.thrustAreaId); m[t?.name || 'Other'] = (m[t?.name || 'Other'] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [goals, thrustAreas]);

  const deptData = useMemo(() => {
    const depts = [...new Set(DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE').map((a) => a.department))];
    return depts.map((d) => {
      const emps = DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE' && a.department === d);
      const sheets = goalSheets.filter((s) => emps.some((e) => e.id === s.employeeId));
      const approved = sheets.filter((s) => s.status === 'LOCKED' || s.status === 'APPROVED').length;
      const submitted = sheets.filter((s) => s.status !== 'DRAFT').length;
      return { department: d, employees: emps.length, submitted: Math.round((submitted / Math.max(emps.length, 1)) * 100), approved: Math.round((approved / Math.max(emps.length, 1)) * 100) };
    });
  }, [goalSheets]);

  const funnelData = useMemo(() => {
    const draft = goalSheets.filter((s) => s.status === 'DRAFT').length;
    const pending = goalSheets.filter((s) => s.status === 'PENDING_APPROVAL').length;
    const returned = goalSheets.filter((s) => s.status === 'RETURNED').length;
    const locked = goalSheets.filter((s) => s.status === 'LOCKED' || s.status === 'APPROVED').length;
    return [{ stage: 'Draft', count: draft, color: '#94a3b8' }, { stage: 'Pending', count: pending, color: C.warning }, { stage: 'Returned', count: returned, color: C.danger }, { stage: 'Approved', count: locked, color: C.success }];
  }, [goalSheets]);

  const totalEmp = DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE').length;
  const submittedSheets = goalSheets.filter((s) => s.status !== 'DRAFT').length;
  const latestAch = [...qoqData].reverse().find((r) => r.achievement > 0)?.achievement ?? 0;
  const avgGoals = totalEmp > 0 ? (goals.length / totalEmp).toFixed(1) : '0';

  const stats = [
    { label: 'Total Employees', value: String(totalEmp), icon: '👥', desc: 'Active in current cycle' },
    { label: 'Goals Created', value: String(goals.length), icon: '🎯', desc: `Avg ${avgGoals} per employee` },
    { label: 'Sheets Submitted', value: `${submittedSheets}/${totalEmp}`, icon: '📋', desc: `${Math.round((submittedSheets / Math.max(totalEmp, 1)) * 100)}% submission rate` },
    { label: 'Latest Achievement', value: `${latestAch}%`, icon: '📈', desc: latestAch >= 80 ? 'Above target' : 'Needs attention', highlight: latestAch >= 80 },
  ];

  // QoQ insight
  const qoqInsight = (() => {
    const q1 = qoqData[0]?.achievement || 0; const q2 = qoqData[1]?.achievement || 0;
    if (q2 > q1 && q1 > 0) return `Achievement improved +${q2 - q1}pp from Q1 to Q2.`;
    if (q2 < q1 && q1 > 0) return `Achievement declined -${q1 - q2}pp from Q1 to Q2 - investigate root cause.`;
    return 'Tracking achievement trends across quarters.';
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Analytics</h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Organization-wide performance intelligence · FY 2025-26</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px', marginBottom: '28px' }}>
      {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              <span style={{ fontSize: '20px' }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 800, color: s.highlight ? C.success : '#0f172a', margin: '0 0 4px 0', fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Row 1: QoQ + Goal Lifecycle Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '20px', marginBottom: '24px' }}>
        <div className="lg:col-span-2">
          <Panel title="Quarter-on-Quarter Achievement" subtitle="Avg achievement % and manager check-in count across all employees">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={qoqData}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="achievement" stroke={C.brand} strokeWidth={2.5} dot={{ r: 5, fill: C.brand, strokeWidth: 2, stroke: '#fff' }} name="Achievement %" />
                <Line type="monotone" dataKey="checkins" stroke={C.success} strokeWidth={2} dot={{ r: 4 }} name="Check-ins" strokeDasharray="5 3" />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              </LineChart>
            </ResponsiveContainer>
            <InsightCard icon="📈" text={qoqInsight} />
          </Panel>
        </div>

        {/* Panel 3: Goal Lifecycle Funnel */}
        <div>
          <Panel title="Goal Lifecycle Funnel" subtitle="Sheet status pipeline - spot approval bottlenecks">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {funnelData.map((f) => {
                const total = goalSheets.length || 1;
                const pct = Math.round((f.count / total) * 100);
                const maxCount = Math.max(...funnelData.map((x) => x.count), 1);
                return (
                  <div key={f.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{f.stage}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: f.color }}>{f.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((f.count / maxCount) * 100)}%`, background: f.color, borderRadius: '8px', transition: 'width 500ms' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {funnelData[1].count > 0 && <InsightCard icon="⏳" text={`${funnelData[1].count} sheets awaiting manager approval.`} action="Remind managers to review" />}
          </Panel>
        </div>
      </div>

      {/* Row 2: Completion Heatmap + Goal Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px', marginBottom: '24px' }}>
        <Panel title="Completion Heatmap" subtitle="Department-wise goal sheet submission & approval rates">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {deptData.map((r) => (
              <div key={r.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{r.department}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{r.employees} emp</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', width: '60px' }}>Submitted</span>
                  <div style={{ flex: 1, height: '10px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.submitted}%`, background: C.warning, borderRadius: '999px' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, width: '36px', textAlign: 'right' }}>{r.submitted}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', width: '60px' }}>Approved</span>
                  <div style={{ flex: 1, height: '10px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.approved}%`, background: C.success, borderRadius: '999px' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, width: '36px', textAlign: 'right' }}>{r.approved}%</span>
                </div>
              </div>
            ))}
          </div>
          {deptData.some((d) => d.approved < 50) && <InsightCard icon="🔴" text={`${deptData.filter((d) => d.approved < 50).map((d) => d.department).join(', ')} below 50% approval - escalate.`} action="Send targeted reminders" />}
        </Panel>

        <Panel title="Goal Distribution by Thrust Area" subtitle="Identifies focus imbalance across strategic priorities">
          {distData.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No goals yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {distData.map((d, i) => {
                const max = Math.max(...distData.map((x) => x.value));
                return (
                  <div key={d.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{d.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{d.value}</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((d.value / max) * 100)}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: '999px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {distData.length > 1 && <InsightCard icon="🎯" text={`${distData[0].name} leads with ${distData[0].value} goals. ${distData[distData.length - 1].name} has only ${distData[distData.length - 1].value}.`} action="Consider rebalancing strategic focus" />}
        </Panel>
      </div>

      {/* Row 3: At-Risk Radar + Manager Effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px', marginBottom: '24px' }}>
        <AtRiskRadar />
        <ManagerLeaderboard />
      </div>

      {/* Row 4: UoM Achievement + Employee Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px' }}>
        <UomAchievement />
        <EmployeePulse />
      </div>
    </div>
  );
}
