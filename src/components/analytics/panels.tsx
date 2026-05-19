/**
 * Analytics Panels 5-8: At-Risk Radar, Manager Effectiveness, UoM Achievement, Employee Pulse
 */
'use client';
import { useMemo } from 'react';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { DEMO_ACCOUNTS, UOM_LABELS, type Quarter, type UoMType } from '@/lib/constants';
import { Panel, InsightCard, scoreColor } from './shared';

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const C = { brand: 'var(--brand)', success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' };

/* ── Panel 5: At-Risk Goal Radar ── */
export function AtRiskRadar() {
  const { goals, quarterlyUpdates } = useDataStore();
  const atRisk = useMemo(() => {
    const latestQ = [...QUARTERS].reverse().find((q) => quarterlyUpdates.some((u) => u.quarter === q)) || 'Q1';
    return goals.filter((g) => {
      const update = quarterlyUpdates.find((u) => u.goalId === g.id && u.quarter === latestQ);
      return (!update || update.status === 'NOT_STARTED') && g.weightage >= 15;
    }).slice(0, 5);
  }, [goals, quarterlyUpdates]);

  return (
    <Panel title="At-Risk Goal Radar" subtitle="High-weight goals with no progress - proactive intervention needed">
      {atRisk.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', background: 'var(--success-bg)', borderRadius: '10px', border: '1px solid var(--success)' }}>
          <span style={{ fontSize: '28px' }}>✅</span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)', margin: '8px 0 0 0' }}>All clear - no at-risk goals</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {atRisk.map((g) => {
            const owner = DEMO_ACCOUNTS.find((a) => {
              const { goalSheets } = useDataStore.getState();
              const sheet = goalSheets.find((s) => s.id === g.sheetId);
              return sheet && a.id === sheet.employeeId;
            });
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'var(--danger-bg)', border: '1px solid var(--danger)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{owner?.name || 'Unknown'} · {g.weightage}% weight · Not Started</p>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger)', flexShrink: 0, marginLeft: '12px' }}>AT RISK</span>
              </div>
            );
          })}
        </div>
      )}
      <InsightCard icon="⚠️" text={atRisk.length > 0 ? `${atRisk.length} high-weight goals have zero progress. These represent ${atRisk.reduce((s, g) => s + g.weightage, 0)}% combined weightage at risk.` : 'No goals flagged - all high-weight items are progressing.'} action={atRisk.length > 0 ? 'Nudge assigned employees and managers' : undefined} />
    </Panel>
  );
}

/* ── Panel 6: Manager Effectiveness Leaderboard ── */
export function ManagerLeaderboard() {
  const { managerCheckins } = useDataStore();
  const mgrData = useMemo(() => DEMO_ACCOUNTS.filter((a) => a.role === 'MANAGER').map((mgr) => {
    const team = DEMO_ACCOUNTS.filter((a) => a.managerId === mgr.id);
    const done = managerCheckins.filter((c) => team.some((t) => t.id === c.employeeId)).length;
    const total = team.length * QUARTERS.length;
    return { name: mgr.name, initials: mgr.avatarInitials, teamSize: team.length, done, total, rate: Math.round((done / Math.max(total, 1)) * 100) };
  }).sort((a, b) => b.rate - a.rate), [managerCheckins]);

  const worst = mgrData.length > 0 ? mgrData[mgrData.length - 1] : null;

  return (
    <Panel title="Manager Effectiveness" subtitle="Check-in completion rates across L1 managers - highlights coaching gaps">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {mgrData.map((m, i) => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: i === 0 ? 'var(--success-bg)' : 'var(--bg-surface-hover)', border: `1px solid ${i === 0 ? 'var(--success)' : 'var(--border)'}` }}>
            <span style={{ width: '24px', fontSize: '14px', fontWeight: 700, color: i === 0 ? C.success : 'var(--text-muted)', textAlign: 'center' }}>#{i + 1}</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--brand-light)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.brand, flexShrink: 0 }}>{m.initials}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{m.name}</p>
              <div style={{ height: '6px', background: 'var(--bg-muted)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.rate}%`, background: scoreColor(m.rate), borderRadius: '999px', transition: 'width 500ms' }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: scoreColor(m.rate), margin: '0 0 1px 0' }}>{m.rate}%</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{m.done}/{m.total}</p>
            </div>
          </div>
        ))}
      </div>
      {worst && worst.rate < 75 && <InsightCard icon="📋" text={`${worst.name}: ${worst.rate}% check-in rate → team may lack coaching visibility.`} action="Schedule coaching discussion" />}
    </Panel>
  );
}

/* ── Panel 7: Achievement by UoM Type ── */
export function UomAchievement() {
  const { goals, quarterlyUpdates } = useDataStore();
  const uomData = useMemo(() => {
    const types: UoMType[] = ['NUMERIC_MIN', 'NUMERIC_MAX', 'PERCENTAGE_MIN', 'PERCENTAGE_MAX', 'TIMELINE', 'ZERO_BASED'];
    return types.map((type) => {
      const typeGoals = goals.filter((g) => g.uomType === type);
      const scores = typeGoals.flatMap((g) => quarterlyUpdates.filter((u) => u.goalId === g.id && u.computedScore != null).map((u) => u.computedScore!));
      const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0;
      return { type, label: UOM_LABELS[type], count: typeGoals.length, avg };
    }).filter((d) => d.count > 0);
  }, [goals, quarterlyUpdates]);

  const best = uomData.length > 0 ? uomData.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const worst = uomData.length > 0 ? uomData.reduce((a, b) => a.avg < b.avg ? a : b) : null;

  return (
    <Panel title="Achievement by UoM Type" subtitle="Compare formula effectiveness - are targets calibrated correctly?">
      {uomData.length === 0 ? (
        <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>No achievement data yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: uomData.length > 3 ? '1fr 1fr' : '1fr', gap: '12px' }}>
          {uomData.map((d) => (
            <div key={d.type} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-canvas)', border: '1px solid var(--border)', textAlign: 'center' }}>
              {/* Circular gauge */}
              <div style={{ width: '80px', height: '80px', margin: '0 auto 10px', position: 'relative' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor(d.avg)} strokeWidth="3" strokeDasharray={`${d.avg} ${100 - d.avg}`} strokeLinecap="round" />
                </svg>
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: scoreColor(d.avg) }}>{d.avg}%</span>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{d.label}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{d.count} goals</p>
            </div>
          ))}
        </div>
      )}
      {best && worst && best.type !== worst.type && (
        <InsightCard icon="📊" text={`${best.label} goals avg ${best.avg}% vs ${worst.label} at ${worst.avg}% - ${worst.label} targets may need recalibration.`} action="Review target-setting guidelines" />
      )}
    </Panel>
  );
}

/* ── Panel 8: Employee Personal Pulse (or Team Pulse for Managers) ── */
export function EmployeePulse() {
  const user = useAuthStore((s) => s.user);
  const { goals, goalSheets, quarterlyUpdates } = useDataStore();

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  // For employees: show personal pulse
  const pulse = useMemo(() => {
    if (!user || isManager) return null;
    const sheet = goalSheets.find((s) => s.employeeId === user.id);
    if (!sheet) return null;
    const myGoals = goals.filter((g) => g.sheetId === sheet.id);
    const latestQ = [...QUARTERS].reverse().find((q) => quarterlyUpdates.some((u) => u.quarter === q)) || 'Q1';
    const goalDetails = myGoals.map((g) => {
      const updates = QUARTERS.map((q) => {
        const u = quarterlyUpdates.find((up) => up.goalId === g.id && up.quarter === q);
        return { quarter: q, score: u?.computedScore != null ? Math.round(u.computedScore * 100) : null, status: u?.status || null };
      });
      const latest = updates.find((u) => u.quarter === latestQ);
      return { id: g.id, title: g.title, weightage: g.weightage, uom: UOM_LABELS[g.uomType], latestScore: latest?.score ?? null, status: latest?.status, quarters: updates };
    });
    const scores = goalDetails.filter((g) => g.latestScore != null).map((g) => g.latestScore!);
    const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const completed = goalDetails.filter((g) => g.status === 'COMPLETED').length;
    const atRisk = goalDetails.filter((g) => !g.status || g.status === 'NOT_STARTED').length;
    return { overall, completed, atRisk, total: myGoals.length, goals: goalDetails };
  }, [user, isManager, goals, goalSheets, quarterlyUpdates]);

  // For managers: show team-level pulse
  const teamPulse = useMemo(() => {
    if (!user || !isManager) return null;
    const team = DEMO_ACCOUNTS.filter((a) => a.role === 'EMPLOYEE');
    const latestQ = [...QUARTERS].reverse().find((q) => quarterlyUpdates.some((u) => u.quarter === q)) || 'Q1';
    const members = team.map((emp) => {
      const sheet = goalSheets.find((s) => s.employeeId === emp.id);
      const empGoals = sheet ? goals.filter((g) => g.sheetId === sheet.id) : [];
      const scores = empGoals.map((g) => {
        const u = quarterlyUpdates.find((up) => up.goalId === g.id && up.quarter === latestQ);
        return u?.computedScore != null ? Math.round(u.computedScore * 100) : null;
      }).filter((s): s is number => s != null);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      return { name: emp.name, initials: emp.avatarInitials, dept: emp.department, goalCount: empGoals.length, avg, hasData: scores.length > 0 };
    }).filter((m) => m.goalCount > 0).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
    const allScores = members.filter((m) => m.avg != null).map((m) => m.avg!);
    const orgAvg = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
    const tracked = members.filter((m) => m.hasData).length;
    const below50 = members.filter((m) => m.avg != null && m.avg < 50).length;
    return { orgAvg, tracked, total: members.length, below50, members, quarter: latestQ };
  }, [user, isManager, goals, goalSheets, quarterlyUpdates]);

  // Manager/Admin: show team pulse
  if (isManager && teamPulse) {
    return (
      <Panel title="Team Performance Pulse" subtitle={`Organization-wide progress as of ${teamPulse.quarter}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          {[
            { label: 'Org Average', value: `${teamPulse.orgAvg}%`, color: scoreColor(teamPulse.orgAvg) },
            { label: 'Tracked', value: `${teamPulse.tracked}/${teamPulse.total}`, color: C.brand },
            { label: 'Below 50%', value: String(teamPulse.below50), color: teamPulse.below50 > 0 ? C.danger : C.success },
          ].map((s) => (
            <div key={s.label} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-canvas)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{s.label}</p>
              <p style={{ fontSize: '22px', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {teamPulse.members.slice(0, 8).map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--brand-light)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.brand, flexShrink: 0 }}>{m.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                <div style={{ height: '4px', background: 'var(--bg-muted)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.avg ?? 0}%`, background: m.avg != null ? scoreColor(m.avg) : 'var(--bg-muted)', borderRadius: '999px', transition: 'width 500ms' }} />
                </div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: m.avg != null ? scoreColor(m.avg) : 'var(--text-muted)', flexShrink: 0 }}>
                {m.avg != null ? `${m.avg}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  // Employee: empty state
  if (!pulse || pulse.total === 0) {
    return (
      <Panel title="Your Performance Pulse" subtitle="Personal goal tracking with quarter-over-quarter comparison">
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <p style={{ fontSize: '28px', margin: '0 0 8px 0' }}>📊</p>
          <p style={{ fontSize: '14px', margin: 0 }}>No goals to track yet. Create goals to see your pulse.</p>
        </div>
      </Panel>
    );
  }

  // Employee: show personal pulse
  return (
    <Panel title="Your Performance Pulse" subtitle="Personal goal tracking with quarter-over-quarter comparison">
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        {[
          { label: 'Overall', value: `${pulse.overall}%`, color: scoreColor(pulse.overall) },
          { label: 'Completed', value: `${pulse.completed}/${pulse.total}`, color: C.success },
          { label: 'At Risk', value: String(pulse.atRisk), color: pulse.atRisk > 0 ? C.danger : C.success },
        ].map((s) => (
          <div key={s.label} style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-canvas)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{s.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>
      {/* Goal breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pulse.goals.map((g) => (
          <div key={g.id} style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: g.latestScore != null ? scoreColor(g.latestScore) : 'var(--text-muted)', marginLeft: '8px' }}>
                {g.latestScore != null ? `${g.latestScore}%` : '-'}
              </span>
            </div>
            {/* Mini sparkline as dots */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {g.quarters.map((q) => (
                <div key={q.quarter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '24px', height: '6px', borderRadius: '999px', background: q.score != null ? scoreColor(q.score) : 'var(--bg-muted)' }} />
                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{q.quarter}</span>
                </div>
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{g.weightage}% · {g.uom}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
