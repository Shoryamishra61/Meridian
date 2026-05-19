/**
 * Meridian - Analytics
 * Role-scoped analytics only:
 * Employee -> self, Manager -> direct reports, Admin -> org-wide.
 */
'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import ThrustAreaTreemap from '@/components/analytics/ThrustAreaTreemap';
import ThrustAreaRadar from '@/components/analytics/ThrustAreaRadar';
import ScoreVsTargetGauge from '@/components/analytics/ScoreVsTargetGauge';
import PlannedVsActualBar from '@/components/analytics/PlannedVsActualBar';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { DEMO_ACCOUNTS, UOM_LABELS, type Quarter } from '@/lib/constants';
import { Panel, InsightCard, ChartTip, scoreColor } from '@/components/analytics/shared';
import { predictGoalCompletion, detectAnomalies } from '@/lib/ai-engine';
import type { Goal, GoalSheet, QuarterlyUpdate } from '@/types';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const C = {
  brand: 'var(--brand)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  muted: 'var(--text-tertiary)',
};
const BAR_COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

type VisibleEmployee = (typeof DEMO_ACCOUNTS)[number];

function pct(part: number, total: number) {
  return Math.round((part / Math.max(total, 1)) * 100);
}

function statusLabel(status: string) {
  if (status === 'PENDING_APPROVAL') return 'Pending';
  if (status === 'LOCKED' || status === 'APPROVED') return 'Approved';
  if (status === 'RETURNED') return 'Returned';
  if (status === 'DRAFT') return 'Draft';
  return 'Not Started';
}

function statusTone(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: 800,
    lineHeight: 1,
  };
  if (status === 'PENDING_APPROVAL') return { ...base, background: 'var(--warning-bg)', color: 'var(--warning)' };
  if (status === 'LOCKED' || status === 'APPROVED') return { ...base, background: 'var(--success-bg)', color: 'var(--success)' };
  if (status === 'RETURNED') return { ...base, background: 'var(--danger-bg)', color: 'var(--danger)' };
  return { ...base, background: 'var(--bg-muted)', color: 'var(--text-secondary)' };
}

function heatColor(value: number | null) {
  if (value == null) return 'var(--bg-muted)';
  if (value >= 90) return 'color-mix(in srgb, var(--success) 82%, white 18%)';
  if (value >= 70) return 'color-mix(in srgb, var(--success) 52%, white 48%)';
  if (value >= 40) return 'color-mix(in srgb, var(--warning) 62%, white 38%)';
  return 'color-mix(in srgb, var(--danger) 72%, white 28%)';
}

function latestQuarter(updates: QuarterlyUpdate[]) {
  return [...QUARTERS].reverse().find((q) => updates.some((u) => u.quarter === q)) ?? 'Q1';
}

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user)!;
  const { goals, goalSheets, quarterlyUpdates, thrustAreas, managerCheckins } = useDataStore();

  const scope = useMemo(() => {
    const employees: VisibleEmployee[] =
      user.role === 'ADMIN'
        ? DEMO_ACCOUNTS.filter((account) => account.role === 'EMPLOYEE')
        : user.role === 'MANAGER'
          ? DEMO_ACCOUNTS.filter((account) => account.managerId === user.id)
          : DEMO_ACCOUNTS.filter((account) => account.id === user.id);

    const employeeIds = new Set<string>(employees.map((employee) => employee.id));
    const sheets = goalSheets.filter((sheet) => employeeIds.has(sheet.employeeId));
    const sheetIds = new Set<string>(sheets.map((sheet) => sheet.id));
    const scopedGoals = goals.filter((goal) => sheetIds.has(goal.sheetId));
    const goalIds = new Set<string>(scopedGoals.map((goal) => goal.id));
    const updates = quarterlyUpdates.filter((update) => goalIds.has(update.goalId));
    const checkins = managerCheckins.filter((checkin) => employeeIds.has(checkin.employeeId));

    return {
      employees,
      employeeIds,
      sheets,
      sheetIds,
      goals: scopedGoals,
      goalIds,
      updates,
      checkins,
      label: user.role === 'ADMIN' ? 'Organization-wide' : user.role === 'MANAGER' ? 'Direct reports only' : 'Your goals only',
    };
  }, [user, goals, goalSheets, quarterlyUpdates, managerCheckins]);

  const latestQ = latestQuarter(scope.updates);

  const qoqData = useMemo(() => QUARTERS.map((quarter) => {
    const updates = scope.updates.filter((update) => update.quarter === quarter);
    const scores = updates.map((update) => update.computedScore).filter((score): score is number => score != null);
    return {
      quarter,
      achievement: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0,
      checkins: scope.checkins.filter((checkin) => checkin.quarter === quarter).length,
    };
  }), [scope.updates, scope.checkins]);

  const predictionData = useMemo(() => {
    const quarterScores = QUARTERS.map((quarter) => {
      const updates = scope.updates.filter((update) => update.quarter === quarter);
      const scores = updates.map((update) => update.computedScore).filter((score): score is number => score != null);
      return { quarter, score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 };
    }).filter((row) => row.score > 0);
    return predictGoalCompletion(quarterScores);
  }, [scope.updates]);

  const enhancedQoqData = qoqData.map((row) => {
    if (predictionData.confidence <= 0.3) return { ...row, predicted: undefined as number | undefined };
    if (row.quarter === 'Q3' && row.achievement === 0) return { ...row, predicted: Math.round(predictionData.projectedQ3 * 100) };
    if (row.quarter === 'Q4' && row.achievement === 0) return { ...row, predicted: Math.round(predictionData.projectedQ4 * 100) };
    return { ...row, predicted: undefined as number | undefined };
  });

  const distData = useMemo(() => {
    const counts: Record<string, number> = {};
    scope.goals.forEach((goal) => {
      const area = thrustAreas.find((candidate) => candidate.id === goal.thrustAreaId);
      counts[area?.name || 'Other'] = (counts[area?.name || 'Other'] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [scope.goals, thrustAreas]);

  const uomData = useMemo(() => {
    const counts: Record<string, number> = {};
    scope.goals.forEach((goal) => { counts[UOM_LABELS[goal.uomType]] = (counts[UOM_LABELS[goal.uomType]] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [scope.goals]);

  const funnelData = useMemo(() => {
    const draft = scope.sheets.filter((sheet) => sheet.status === 'DRAFT').length;
    const pending = scope.sheets.filter((sheet) => sheet.status === 'PENDING_APPROVAL').length;
    const returned = scope.sheets.filter((sheet) => sheet.status === 'RETURNED').length;
    const approved = scope.sheets.filter((sheet) => sheet.status === 'LOCKED' || sheet.status === 'APPROVED').length;
    return [
      { stage: 'Draft', count: draft, color: C.muted },
      { stage: 'Pending', count: pending, color: C.warning },
      { stage: 'Returned', count: returned, color: C.danger },
      { stage: 'Approved', count: approved, color: C.success },
    ];
  }, [scope.sheets]);

  const employeeGoalRows = useMemo(() => scope.employees.map((employee) => {
    const sheet = scope.sheets.find((candidate) => candidate.employeeId === employee.id);
    const employeeGoals = sheet ? scope.goals.filter((goal) => goal.sheetId === sheet.id) : [];
    const scores = employeeGoals.map((goal) => {
      const update = scope.updates.find((candidate) => candidate.goalId === goal.id && candidate.quarter === latestQ);
      return update?.computedScore != null ? Math.round(update.computedScore * 100) : null;
    });
    const knownScores = scores.filter((score): score is number => score != null);
    return {
      employee,
      sheet,
      goals: employeeGoals,
      scores,
      average: knownScores.length ? Math.round(knownScores.reduce((a, b) => a + b, 0) / knownScores.length) : null,
    };
  }), [scope.employees, scope.sheets, scope.goals, scope.updates, latestQ]);

  const departmentHeatmap = useMemo(() => {
    const departments = [...new Set(scope.employees.map((employee) => employee.department))];
    return departments.map((department) => {
      const employees = scope.employees.filter((employee) => employee.department === department);
      return {
        department,
        employees: employees.length,
        quarters: QUARTERS.map((quarter) => {
          const completed = employees.filter((employee) =>
            scope.checkins.some((checkin) => checkin.employeeId === employee.id && checkin.quarter === quarter)
          ).length;
          return { quarter, value: pct(completed, employees.length), completed };
        }),
      };
    });
  }, [scope.employees, scope.checkins]);

  const atRiskGoals = useMemo(() => scope.goals.filter((goal) => {
    const update = scope.updates.find((candidate) => candidate.goalId === goal.id && candidate.quarter === latestQ);
    return goal.weightage >= 15 && (!update || update.status === 'NOT_STARTED' || (update.computedScore ?? 0) < 0.4);
  }).slice(0, 6), [scope.goals, scope.updates, latestQ]);

  const scopedAnomalies = useMemo(() => detectAnomalies(scope.goals, scope.updates), [scope.goals, scope.updates]);

  const managerLeaderboard = useMemo(() => {
    if (user.role !== 'ADMIN') return [];
    return DEMO_ACCOUNTS.filter((account) => account.role === 'MANAGER').map((manager) => {
      const team = DEMO_ACCOUNTS.filter((account) => account.managerId === manager.id);
      const done = managerCheckins.filter((checkin) => team.some((employee) => employee.id === checkin.employeeId)).length;
      const total = team.length * QUARTERS.length;
      return { manager, done, total, rate: pct(done, total) };
    }).sort((a, b) => b.rate - a.rate);
  }, [user.role, managerCheckins]);

  const submittedSheets = scope.sheets.filter((sheet) => sheet.status !== 'DRAFT').length;
  const latestAchievement = [...qoqData].reverse().find((row) => row.achievement > 0)?.achievement ?? 0;
  const avgGoals = scope.employees.length ? (scope.goals.length / scope.employees.length).toFixed(1) : '0';

  const stats = [
    { label: user.role === 'EMPLOYEE' ? 'Your Goals' : 'Employees', value: user.role === 'EMPLOYEE' ? String(scope.goals.length) : String(scope.employees.length), desc: scope.label },
    { label: 'Goals Created', value: String(scope.goals.length), desc: `Avg ${avgGoals} per employee` },
    { label: 'Sheets Submitted', value: `${submittedSheets}/${scope.employees.length}`, desc: `${pct(submittedSheets, scope.employees.length)}% submission rate` },
    { label: 'Latest Achievement', value: `${latestAchievement}%`, desc: latestAchievement >= 80 ? 'Above target' : 'Needs attention', highlight: latestAchievement >= 80 },
  ];

  const qoqInsight = (() => {
    const q1 = qoqData[0]?.achievement || 0;
    const q2 = qoqData[1]?.achievement || 0;
    if (q1 && q2 > q1) return `Achievement improved +${q2 - q1}pp from Q1 to Q2 within this scope.`;
    if (q1 && q2 < q1) return `Achievement declined -${q1 - q2}pp from Q1 to Q2 within this scope.`;
    return 'Tracking achievement trend across available check-ins.';
  })();

  return (
    <div className="animate-in app-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="app-page-header">
        <div>
          <p className="app-page-eyebrow">{user.role === 'ADMIN' ? 'Admin analytics' : user.role === 'MANAGER' ? 'Manager analytics' : 'Employee analytics'}</p>
          <h1 style={{ margin: '0 0 6px 0' }}>Analytics</h1>
          <p className="app-page-meta">
            <span>{scope.label}</span>
            <span className="sep">·</span>
            <span>FY 2025-26</span>
            <span className="sep">·</span>
            <span>{latestQ} active view</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '16px' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card-hover" style={{ padding: '18px', minHeight: '112px' }}>
            <p className="label-sm text-[12px]">{stat.label}</p>
            <p className="text-[28px] font-extrabold tabular-nums" style={{ marginTop: '18px', color: stat.highlight ? 'var(--success)' : 'var(--text-primary)' }}>{stat.value}</p>
            <p className="text-[12px] text-[var(--text-secondary)]" style={{ marginTop: '6px' }}>{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '20px' }}>
        <div className="lg:col-span-2">
          <Panel title="Quarter-on-Quarter Achievement" subtitle="Achievement percentage and completed manager check-ins for the visible scope">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={enhancedQoqData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="quarter" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="achievement" stroke={C.brand} strokeWidth={2.5} dot={{ r: 5, fill: C.brand, strokeWidth: 2, stroke: 'var(--bg-surface)' }} name="Achievement %" />
                <Line type="monotone" dataKey="checkins" stroke={C.success} strokeWidth={2} dot={{ r: 4 }} name="Check-ins" strokeDasharray="5 3" />
                {enhancedQoqData.some((row) => row.predicted) && (
                  <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: '#8b5cf6', stroke: 'var(--bg-surface)', strokeWidth: 2 }} name="AI Predicted" connectNulls />
                )}
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              </LineChart>
            </ResponsiveContainer>
            <InsightCard icon="i" text={qoqInsight} />
            {predictionData.confidence > 0.3 && (
              <InsightCard icon="AI" text={`Projected Q3 ${Math.round(predictionData.projectedQ3 * 100)}%, Q4 ${Math.round(predictionData.projectedQ4 * 100)}% at ${Math.round(predictionData.confidence * 100)}% confidence.`} />
            )}
          </Panel>
        </div>

        <Panel title={user.role === 'EMPLOYEE' ? 'Goal Status' : 'Goal Lifecycle Funnel'} subtitle="Current goal sheet state distribution">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {funnelData.map((row) => {
              const total = Math.max(scope.sheets.length, 1);
              const max = Math.max(...funnelData.map((item) => item.count), 1);
              return (
                <div key={row.stage}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '5px' }}>
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">{row.stage}</span>
                    <span className="text-[13px] font-bold" style={{ color: row.color }}>{row.count} ({pct(row.count, total)}%)</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-muted)]">
                    <div className="h-full rounded-[var(--radius-full)]" style={{ width: `${pct(row.count, max)}%`, background: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {funnelData.some((row) => row.stage === 'Pending' && row.count > 0) && <InsightCard icon="!" text="Pending sheets need manager action before employees can proceed to locked goals." action={user.role === 'MANAGER' ? 'Open Team Goals' : undefined} />}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px' }}>
        {user.role === 'ADMIN' ? (
          <DepartmentCompletionHeatmap data={departmentHeatmap} />
        ) : (
          <TeamAchievementHeatmap rows={employeeGoalRows} latestQ={latestQ} singleEmployee={user.role === 'EMPLOYEE'} />
        )}

        <DistributionPanel title="Goal Distribution by Thrust Area" subtitle="Shows whether strategic focus is balanced within the visible scope" data={distData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px' }}>
        <AtRiskPanel goals={atRiskGoals} sheets={scope.sheets} employees={scope.employees} latestQ={latestQ} />
        {user.role === 'ADMIN'
          ? <ManagerEffectivenessPanel rows={managerLeaderboard} />
          : <AttentionPanel rows={employeeGoalRows} latestQ={latestQ} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px' }}>
        <DistributionPanel title="Goal Distribution by UoM Type" subtitle="Highlights whether targets skew numeric, percentage, timeline, or zero-based" data={uomData} />
        <PulsePanel rows={employeeGoalRows} userRole={user.role} latestQ={latestQ} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '20px' }}>
        <ScoreVsTargetGauge
          goals={scope.goals}
          updates={scope.updates}
          subtitle={`Weighted achievement for ${latestQ} · ${scope.label}`}
        />
        <ThrustAreaRadar
          goals={scope.goals}
          updates={scope.updates}
          subtitle={`Achievement per strategic pillar · ${scope.label}`}
        />
      </div>

      {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
        <PlannedVsActualBar
          goals={scope.goals}
          updates={scope.updates}
          subtitle={`Expected progress ramp vs weighted achievement · ${scope.label}`}
        />
      )}

      {user.role === 'ADMIN' && (
        <ThrustAreaTreemap goals={scope.goals} updates={scope.updates} />
      )}

      {scopedAnomalies.length > 0 && (
        <Panel title="AI Anomaly Detection" subtitle="Unusual goal patterns from the same role-scoped data">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scopedAnomalies.slice(0, 6).map((anomaly, index) => (
              <div key={`${anomaly.goalTitle}-${index}`} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface-hover)]" style={{ padding: '12px 14px' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{anomaly.goalTitle}</p>
                  <span style={statusTone(anomaly.severity === 'high' ? 'RETURNED' : anomaly.severity === 'medium' ? 'PENDING_APPROVAL' : 'LOCKED')}>{anomaly.severity}</span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{anomaly.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function TeamAchievementHeatmap({ rows, latestQ, singleEmployee }: {
  rows: Array<{ employee: VisibleEmployee; goals: Goal[]; scores: Array<number | null>; average: number | null; sheet?: GoalSheet }>;
  latestQ: Quarter;
  singleEmployee?: boolean;
}) {
  const maxGoals = Math.max(...rows.map((row) => row.goals.length), 1);
  return (
    <Panel title={singleEmployee ? 'Goal Achievement Heatmap' : 'Team Achievement Heatmap'} subtitle={`${singleEmployee ? 'Goal' : 'Employee'} x goal score intensity for ${latestQ}`}>
      <div style={{ display: 'grid', gridTemplateColumns: `minmax(140px,1.15fr) repeat(${maxGoals}, minmax(42px,1fr)) 64px`, gap: '8px', alignItems: 'center' }}>
        <span className="label-sm text-[11px]">{singleEmployee ? 'Goal Owner' : 'Employee'}</span>
        {Array.from({ length: maxGoals }).map((_, index) => <span key={index} className="label-sm text-center text-[11px]">G{index + 1}</span>)}
        <span className="label-sm text-right text-[11px]">Avg</span>
        {rows.map((row) => (
          <div key={row.employee.id} style={{ display: 'contents' }}>
            <div className="min-w-0 rounded-[var(--radius-sm)] bg-[var(--bg-surface-hover)]" style={{ padding: '10px' }}>
              <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{row.employee.name}</p>
              <p className="truncate text-[11px] text-[var(--text-secondary)]">{row.goals.length} goals · {statusLabel(row.sheet?.status || 'NOT_STARTED')}</p>
            </div>
            {Array.from({ length: maxGoals }).map((_, index) => {
              const score = row.scores[index];
              const goal = row.goals[index];
              return (
                <div
                  key={`${row.employee.id}-${index}`}
                  title={goal ? `${goal.title}: ${score ?? 'No data'}%` : 'No goal'}
                  className="flex h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-[12px] font-extrabold tabular-nums"
                  style={{ background: heatColor(score), color: score == null ? 'var(--text-muted)' : score >= 40 ? '#0f172a' : '#fff' }}
                >
                  {goal ? (score == null ? '-' : score) : ''}
                </div>
              );
            })}
            <span className="text-right text-[13px] font-extrabold tabular-nums" style={{ color: row.average == null ? 'var(--text-muted)' : scoreColor(row.average) }}>
              {row.average == null ? '-' : `${row.average}%`}
            </span>
          </div>
        ))}
      </div>
      <InsightCard icon="i" text="This is a true heatmap: each cell is one goal score and darker/warmer cells show weaker performance." />
    </Panel>
  );
}

function DepartmentCompletionHeatmap({ data }: { data: Array<{ department: string; employees: number; quarters: Array<{ quarter: Quarter; value: number; completed: number }> }> }) {
  return (
    <Panel title="Department Completion Heatmap" subtitle="Department x quarter check-in completion intensity">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1.2fr) repeat(4, minmax(56px,1fr))', gap: '8px', alignItems: 'center' }}>
        <span className="label-sm text-[11px]">Department</span>
        {QUARTERS.map((quarter) => <span key={quarter} className="label-sm text-center text-[11px]">{quarter}</span>)}
        {data.map((row) => (
          <div key={row.department} style={{ display: 'contents' }}>
            <div className="rounded-[var(--radius-sm)] bg-[var(--bg-surface-hover)]" style={{ padding: '10px' }}>
              <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{row.department}</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{row.employees} employees</p>
            </div>
            {row.quarters.map((quarter) => (
              <div key={`${row.department}-${quarter.quarter}`} className="flex h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-[12px] font-extrabold tabular-nums" style={{ background: heatColor(quarter.value), color: quarter.value >= 40 ? '#0f172a' : '#fff' }}>
                {quarter.value}%
              </div>
            ))}
          </div>
        ))}
      </div>
      <InsightCard icon="i" text="Rows are departments and columns are quarters. Cell color intensity shows completion rate." />
    </Panel>
  );
}

function DistributionPanel({ title, subtitle, data }: { title: string; subtitle: string; data: Array<{ name: string; value: number }> }) {
  const max = Math.max(...data.map((row) => row.value), 1);
  return (
    <Panel title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-[var(--text-secondary)]">No data in this scope yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.map((row, index) => (
            <div key={row.name}>
              <div className="flex items-center justify-between" style={{ marginBottom: '5px' }}>
                <span className="truncate text-[13px] font-bold text-[var(--text-primary)]">{row.name}</span>
                <span className="text-[13px] font-extrabold tabular-nums text-[var(--text-secondary)]">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-muted)]">
                <div className="h-full rounded-[var(--radius-full)]" style={{ width: `${pct(row.value, max)}%`, background: BAR_COLORS[index % BAR_COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {data.length > 1 && <InsightCard icon="i" text={`${data[0].name} leads with ${data[0].value}. ${data[data.length - 1].name} has ${data[data.length - 1].value}.`} />}
    </Panel>
  );
}

function AtRiskPanel({ goals, sheets, employees, latestQ }: { goals: Goal[]; sheets: GoalSheet[]; employees: VisibleEmployee[]; latestQ: Quarter }) {
  return (
    <Panel title="At-Risk Goal Radar" subtitle={`High-weight or stalled goals in ${latestQ}`}>
      {goals.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--success)] bg-[var(--success-bg)] p-6 text-center">
          <p className="text-[14px] font-bold text-[var(--success)]">All clear. No at-risk goals in this scope.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {goals.map((goal) => {
            const sheet = sheets.find((candidate) => candidate.id === goal.sheetId);
            const owner = employees.find((employee) => employee.id === sheet?.employeeId);
            return (
              <div key={goal.id} className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-bg)]" style={{ padding: '12px 14px' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{goal.title}</p>
                  <span className="text-[11px] font-extrabold text-[var(--danger)]">AT RISK</span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{owner?.name || 'Unknown'} · {goal.weightage}% weight</p>
              </div>
            );
          })}
        </div>
      )}
      <InsightCard icon="i" text={goals.length ? `${goals.length} goal(s) need attention before the next review.` : 'No intervention needed right now.'} />
    </Panel>
  );
}

function AttentionPanel({ rows, latestQ }: { rows: Array<{ employee: VisibleEmployee; goals: Goal[]; average: number | null }>; latestQ: Quarter }) {
  const ranked = rows
    .filter((row) => row.goals.length > 0)
    .sort((a, b) => (a.average ?? -1) - (b.average ?? -1))
    .slice(0, 6);
  return (
    <Panel title="Employees Needing Attention" subtitle={`Lowest visible scores for ${latestQ}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ranked.map((row, index) => (
          <div key={row.employee.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface-hover)]" style={{ padding: '12px 14px' }}>
            <span className="text-[12px] font-extrabold text-[var(--text-muted)]">#{index + 1}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-light)] text-[12px] font-bold text-[var(--brand)]">{row.employee.avatarInitials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{row.employee.name}</p>
              <p className="text-[12px] text-[var(--text-secondary)]">{row.goals.length} goals</p>
            </div>
            <span className="text-[14px] font-extrabold tabular-nums" style={{ color: row.average == null ? 'var(--text-muted)' : scoreColor(row.average) }}>
              {row.average == null ? '-' : `${row.average}%`}
            </span>
          </div>
        ))}
      </div>
      <InsightCard icon="i" text="Ranked only from employees visible to the current user." />
    </Panel>
  );
}

function ManagerEffectivenessPanel({ rows }: { rows: Array<{ manager: VisibleEmployee; done: number; total: number; rate: number }> }) {
  return (
    <Panel title="Manager Effectiveness Leaderboard" subtitle="Admin-only comparison of L1 check-in completion">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.map((row, index) => (
          <div key={row.manager.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface-hover)]" style={{ padding: '12px 14px' }}>
            <span className="text-[12px] font-extrabold text-[var(--text-muted)]">#{index + 1}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-light)] text-[12px] font-bold text-[var(--brand)]">{row.manager.avatarInitials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{row.manager.name}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-[var(--radius-full)] bg-[var(--bg-muted)]">
                <div className="h-full rounded-[var(--radius-full)]" style={{ width: `${row.rate}%`, background: scoreColor(row.rate) }} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-extrabold tabular-nums" style={{ color: scoreColor(row.rate) }}>{row.rate}%</p>
              <p className="text-[11px] text-[var(--text-secondary)]">{row.done}/{row.total}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PulsePanel({ rows, userRole, latestQ }: { rows: Array<{ employee: VisibleEmployee; goals: Goal[]; average: number | null }>; userRole: string; latestQ: Quarter }) {
  const tracked = rows.filter((row) => row.average != null);
  const avg = tracked.length ? Math.round(tracked.reduce((sum, row) => sum + (row.average ?? 0), 0) / tracked.length) : 0;
  const below50 = tracked.filter((row) => (row.average ?? 0) < 50).length;
  return (
    <Panel title={userRole === 'EMPLOYEE' ? 'Your Performance Pulse' : 'Team Performance Pulse'} subtitle={`Compact performance summary for ${latestQ}`}>
      <div className="grid grid-cols-3" style={{ gap: '12px' }}>
        {[
          { label: 'Average', value: `${avg}%`, color: scoreColor(avg) },
          { label: 'Tracked', value: `${tracked.length}/${rows.length}`, color: C.brand },
          { label: 'Below 50%', value: String(below50), color: below50 ? C.danger : C.success },
        ].map((item) => (
          <div key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface-hover)] p-3 text-center">
            <p className="label-sm text-[10px]">{item.label}</p>
            <p className="mt-2 text-[20px] font-extrabold tabular-nums" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
      <InsightCard icon="i" text={userRole === 'EMPLOYEE' ? 'This panel uses only your goals.' : 'This panel excludes employees outside your permitted scope.'} />
    </Panel>
  );
}
